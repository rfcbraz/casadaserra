// src/routes/reservations.js
const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { sendReservationConfirmation, sendReservationStatusUpdate, sendAdminNotification } = require('../services/email');
const router = express.Router();

// POST /api/reservations — criar reserva (público)
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, roomId, checkIn, checkOut, guests, breakfast, specialRequests } = req.body;

    // Validação básica
    if (!name || !email || !roomId || !checkIn || !checkOut || !guests) {
      return res.status(400).json({ error: 'Campos obrigatórios em falta.' });
    }

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);

    if (isNaN(ciDate) || isNaN(coDate) || ciDate >= coDate) {
      return res.status(400).json({ error: 'Datas inválidas.' });
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

    // Verificar disponibilidade
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
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

    const nights = Math.round((coDate - ciDate) / (1000 * 60 * 60 * 24));
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
        guests: parseInt(guests),
        totalPrice,
        breakfast: breakfast !== false,
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
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'PAID'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Use: ${validStatuses.join(', ')}` });
    }

    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status, notes: notes || undefined },
      include: { room: true, guest: true },
    });

    // Notificar hóspede
    if (['CONFIRMED', 'CANCELLED', 'PAID'].includes(status)) {
      sendReservationStatusUpdate(reservation, status)
        .catch(err => console.error('Erro a enviar email:', err));
    }

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
