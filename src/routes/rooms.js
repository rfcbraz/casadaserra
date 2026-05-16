// src/routes/rooms.js
const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/rooms — lista todos os quartos ativos
router.get('/', async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      orderBy: { pricePerNight: 'asc' },
    });
    res.json(rooms);
  } catch (err) { next(err); }
});

// GET /api/rooms/:id
router.get('/:id', async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json(room);
  } catch (err) { next(err); }
});

// POST /api/rooms — criar quarto (admin)
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { name, type, description, pricePerNight, capacity, amenities, images } = req.body;
    if (!name || !type || !pricePerNight || !capacity) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, type, pricePerNight, capacity.' });
    }
    const room = await prisma.room.create({
      data: { name, type, description: description || '', pricePerNight, capacity, amenities: amenities || [], images: images || [] }
    });
    res.status(201).json(room);
  } catch (err) { next(err); }
});

// PATCH /api/rooms/:id — atualizar quarto (admin)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const room = await prisma.room.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(room);
  } catch (err) { next(err); }
});

// DELETE /api/rooms/:id — desativar quarto (admin)
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await prisma.room.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Quarto desativado com sucesso.' });
  } catch (err) { next(err); }
});

module.exports = router;
