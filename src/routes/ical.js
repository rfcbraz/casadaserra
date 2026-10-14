const express = require('express');
const prisma = require('../lib/prisma');
const { buildRoomCalendar } = require('../services/ical');
const router = express.Router();

// GET /ical/:roomId.ics — export calendar iCal para o Booking.com/Airbnb
router.get('/:roomId.ics', async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.roomId } });
    if (!room) return res.status(404).json({ error: 'Unidade não encontrada.' });

    const reservations = await prisma.reservation.findMany({
      where: {
        roomId: room.id,
        OR: [
          { status: { in: ['CONFIRMED', 'PAID'] } },
          { status: { in: ['AWAITING_PAYMENT', 'PENDING'] }, paymentExpiresAt: { gt: new Date() } },
        ],
      },
      include: { guest: true },
      orderBy: { checkIn: 'asc' },
    });

    const blockedDates = await prisma.blockedDate.findMany({
      where: { roomId: room.id },
      orderBy: { date: 'asc' },
    });

    const ics = buildRoomCalendar(room, reservations, blockedDates);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.send(ics);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
