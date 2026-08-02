// src/routes/reservations.js
const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { sendReservationConfirmation, sendReservationStatusUpdate, sendAdminNotification } = require('../services/email');
const router = express.Router();

// POST /api/reservations — criar reserva (público)
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, roomId, checkIn, checkOut, guests, specialRequests } = req.body;

    // Validação básica
    if (!name || !email || !roomId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
    }
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1) {
      return res.status(400).json({ error: 'Número de hóspedes inválido.' });
    }

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);

    if (isNaN(ciDate) || isNaN(coDate) || ciDate >= coDate) {
      return res.status(400).json({ error: 'Datas inválidas.' });
    }
    const nights = Math.round((coDate - ciDate) / (1000 * 60 * 60 * 24));
    if (nights < 2) {
      return res.status(400).json({ error: 'A estadia mínima é de 2 noites.' });
    }

    // Permite check-in hoje — compara só a data, não a hora
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (ciDate < todayStart) {
      return res.status(400).json({ error: 'A data de check-in não pode ser no passado.' });
    }

    // Verificar quarto
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !room.isActive) {
      return res.status(404).json({ error: 'Quarto não encontrado.' });
    }
    if (guestCount > room.capacity) {
      return res.status(400).json({ error: `Esta unidade permite até ${room.capacity} hóspedes.` });
    }

    // Verificar disponibilidade
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: { in: ['CONFIRMED', 'PAID'] },
        AND: [
          { checkIn: { lt: coDate } },
          { checkOut: { gt: ciDate } },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ error: 'O quarto não está disponível para as datas selecionadas.' });
    }

    // Verificar datas bloqueadas
    const blockedConflict = await prisma.blockedDate.findFirst({
      where: {
        roomId,
        date: { gte: ciDate, lt: coDate },
      },
    });

    if (blockedConflict) {
      return res.status(409).json({ error: 'O quarto está bloqueado para parte das datas selecionadas.' });
    }

    const totalPrice = room.pricePerNight * nights;

    // Criar ou encontrar hóspede
    const guest = await prisma.guest.upsert({
      where: { email },
      update: { name, phone: phone || undefined },
      create: { name, email, phone: phone || null },
    });

    // Criar reserva
    const reservation = await prisma.reservation.create({
      data: {
        checkIn: ciDate,
        checkOut: coDate,
        nights,
        guests: guestCount,
        totalPrice,
        breakfast: false,
        specialRequests: specialRequests || null,
        roomId,
        guestId: guest.id,
      },
      include: { room: true, guest: true },
    });

    // Enviar emails (não bloqueia a resposta)
    Promise.all([
      sendReservationConfirmation(reservation),
      sendAdminNotification(reservation),
    ]).catch(err => console.error('Erro a enviar email:', err));

    res.status(201).json({
      message: 'Reserva criada com sucesso! Verifique o seu email.',
      reservation: {
        id: reservation.id,
        ref: reservation.id.slice(0, 8).toUpperCase(),
        room: reservation.room.name,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        nights: reservation.nights,
        totalPrice: reservation.totalPrice,
        status: reservation.status,
      },
    });
  } catch (err) { next(err); }
});

// GET /api/reservations/:id — consultar reserva pelo ID (público)
router.get('/:id', async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { room: true, guest: { select: { name: true, email: true } } },
    });
    if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });
    res.json(reservation);
  } catch (err) { next(err); }
});

// GET /api/reservations — listar todas (admin)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, roomId, from, to, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (from || to) {
      where.checkIn = {};
      if (from) where.checkIn.gte = new Date(from);
      if (to) where.checkIn.lte = new Date(to);
    }

    const [reservations, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        include: { room: true, guest: true },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.reservation.count({ where }),
    ]);

    res.json({ reservations, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
});

// PATCH /api/reservations/:id/status — atualizar estado (admin)
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status, notes } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'PAID'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Use: ${validStatuses.join(', ')}` });
    }
 
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status, notes: notes || undefined },
      include: { room: true, guest: true },
    });
 
    const emailPromises = [];
    if (['CONFIRMED', 'CANCELLED', 'PAID', 'DECLINED'].includes(status)) {
      emailPromises.push(sendReservationStatusUpdate(reservation, status));
    }
 
    // When a pedido é aceite, recusamos automaticamente outros pendentes sobrepostos.
    if (['CONFIRMED', 'PAID'].includes(status)) {
      const pendingConflicts = await prisma.reservation.findMany({
        where: {
          id: { not: reservation.id },
          roomId: reservation.roomId,
          status: 'PENDING',
          AND: [
            { checkIn: { lt: reservation.checkOut } },
            { checkOut: { gt: reservation.checkIn } },
          ],
        },
        include: { room: true, guest: true },
      });
 
      if (pendingConflicts.length) {
        await prisma.reservation.updateMany({
          where: { id: { in: pendingConflicts.map(r => r.id) } },
          data: { status: 'DECLINED' },
        });
 
        pendingConflicts.forEach(conflict => {
          emailPromises.push(sendReservationStatusUpdate(conflict, 'DECLINED'));
        });
      }
    }
 
    Promise.all(emailPromises)
      .catch(err => console.error('Erro a enviar email:', err));

    res.json(reservation);
  } catch (err) { next(err); }
});

// DELETE /api/reservations/:id — cancelar reserva (admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
      include: { room: true, guest: true },
    });
    sendReservationStatusUpdate(reservation, 'CANCELLED')
      .catch(err => console.error('Erro a enviar email:', err));
    res.json({ message: 'Reserva cancelada.' });
  } catch (err) { next(err); }
});

module.exports = router;
