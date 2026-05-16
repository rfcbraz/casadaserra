// src/routes/availability.js
const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// Devolve quartos disponíveis para um período
router.get('/', async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return res.status(400).json({ error: 'checkIn e checkOut são obrigatórios.' });
    }

    const ciDate = new Date(checkIn);
    const coDate = new Date(checkOut);

    if (isNaN(ciDate) || isNaN(coDate) || ciDate >= coDate) {
      return res.status(400).json({ error: 'Datas inválidas.' });
    }

    // Quartos com reservas que se sobrepõem ao período pedido
    const bookedRoomIds = await prisma.reservation.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
        AND: [
          { checkIn: { lt: coDate } },
          { checkOut: { gt: ciDate } },
        ],
      },
      select: { roomId: true },
    });

    const bookedIds = bookedRoomIds.map(r => r.roomId);

    // Quartos com datas bloqueadas no período
    const blockedRoomIds = await prisma.blockedDate.findMany({
      where: {
        date: { gte: ciDate, lt: coDate },
      },
      select: { roomId: true },
    });

    const blockedIds = blockedRoomIds.map(r => r.roomId);
    const unavailableIds = [...new Set([...bookedIds, ...blockedIds])];

    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        id: { notIn: unavailableIds },
      },
      orderBy: { pricePerNight: 'asc' },
    });

    const nights = Math.round((coDate - ciDate) / (1000 * 60 * 60 * 24));

    res.json({
      checkIn,
      checkOut,
      nights,
      availableRooms: rooms.map(r => ({
        ...r,
        totalPrice: r.pricePerNight * nights,
      })),
    });
  } catch (err) { next(err); }
});

// GET /api/availability/room/:roomId?year=2026&month=5
// Devolve datas bloqueadas/ocupadas de um quarto num mês
router.get('/room/:roomId', async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const year = parseInt(req.query.year || new Date().getFullYear());
    const month = parseInt(req.query.month || new Date().getMonth() + 1);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const reservations = await prisma.reservation.findMany({
      where: {
        roomId,
        status: { in: ['PENDING', 'CONFIRMED', 'PAID'] },
        AND: [
          { checkIn: { lt: endOfMonth } },
          { checkOut: { gt: startOfMonth } },
        ],
      },
      select: { checkIn: true, checkOut: true },
    });

    const blocked = await prisma.blockedDate.findMany({
      where: { roomId, date: { gte: startOfMonth, lte: endOfMonth } },
      select: { date: true, reason: true },
    });

    // Expandir reservas em datas individuais
    const occupiedDates = [];
    reservations.forEach(r => {
      const cur = new Date(r.checkIn);
      while (cur < r.checkOut) {
        occupiedDates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    });

    res.json({
      roomId,
      year,
      month,
      occupiedDates,
      blockedDates: blocked.map(b => ({
        date: b.date.toISOString().split('T')[0],
        reason: b.reason,
      })),
    });
  } catch (err) { next(err); }
});

// POST /api/availability/block — bloquear datas (admin)
router.post('/block', requireAuth, async (req, res, next) => {
  try {
    const { roomId, dates, reason } = req.body;
    if (!roomId || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'roomId e dates[] são obrigatórios.' });
    }

    const created = await Promise.all(
      dates.map(d =>
        prisma.blockedDate.upsert({
          where: { roomId_date: { roomId, date: new Date(d) } },
          update: { reason },
          create: { roomId, date: new Date(d), reason },
        })
      )
    );

    res.status(201).json({ message: `${created.length} data(s) bloqueada(s).`, dates: created });
  } catch (err) { next(err); }
});

// DELETE /api/availability/block — desbloquear datas (admin)
router.delete('/block', requireAuth, async (req, res, next) => {
  try {
    const { roomId, dates } = req.body;
    await prisma.blockedDate.deleteMany({
      where: {
        roomId,
        date: { in: dates.map(d => new Date(d)) },
      },
    });
    res.json({ message: 'Datas desbloqueadas.' });
  } catch (err) { next(err); }
});

module.exports = router;
