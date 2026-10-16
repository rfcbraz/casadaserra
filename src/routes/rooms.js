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

// GET /api/rooms/admin — lista todos os quartos para gestão (admin)
router.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
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
    // Only allow a whitelist of updatable fields to avoid accidental/invalid writes
    const allowed = ['name','type','description','pricePerNight','capacity','amenities','images','isActive','sizeSqm','bedrooms','beds','bookingIcalUrl','airbnbIcalUrl'];
    const data = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        data[key] = req.body[key];
      }
    }

    // Coerce numeric fields when present
    if (data.pricePerNight !== undefined) {
      if (data.pricePerNight === '') data.pricePerNight = null;
      else {
        data.pricePerNight = parseFloat(data.pricePerNight);
        if (Number.isNaN(data.pricePerNight)) {
          return res.status(400).json({ error: 'pricePerNight precisa ser um número válido.' });
        }
      }
    }
    if (data.capacity !== undefined) {
      if (data.capacity === '') data.capacity = null;
      else {
        data.capacity = parseInt(data.capacity, 10);
        if (Number.isNaN(data.capacity)) {
          return res.status(400).json({ error: 'capacity precisa ser um número válido.' });
        }
      }
    }
    if (data.sizeSqm !== undefined) {
      data.sizeSqm = parseFloat(data.sizeSqm);
      if (Number.isNaN(data.sizeSqm)) {
        return res.status(400).json({ error: 'sizeSqm precisa ser um número válido.' });
      }
    }
    if (data.bedrooms !== undefined) {
      data.bedrooms = parseInt(data.bedrooms, 10);
      if (Number.isNaN(data.bedrooms)) {
        return res.status(400).json({ error: 'bedrooms precisa ser um número válido.' });
      }
    }
    if (data.beds !== undefined) {
      data.beds = parseInt(data.beds, 10);
      if (Number.isNaN(data.beds)) {
        return res.status(400).json({ error: 'beds precisa ser um número válido.' });
      }
    }

    // Normalize arrays (allow comma-separated strings from form submissions)
    if (data.amenities !== undefined && !Array.isArray(data.amenities)) {
      data.amenities = String(data.amenities).split(',').map(s => s.trim()).filter(Boolean);
    }
    if (data.images !== undefined && !Array.isArray(data.images)) {
      data.images = String(data.images).split(',').map(s => s.trim()).filter(Boolean);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo válido enviado para atualizar.' });
    }

    // If updating the name, ensure it does not collide with another room
    if (data.name) {
      const existing = await prisma.room.findUnique({ where: { name: data.name } });
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ error: 'Já existe um quarto com esse nome.' });
      }
    }

    const room = await prisma.room.update({
      where: { id: req.params.id },
      data,
    });
    res.json(room);
  } catch (err) {
    console.error('Error updating room:', err);
    // Prisma known errors (unique constraint etc.) have codes — map common ones to useful HTTP responses
    if (err && err.code === 'P2002') {
      return res.status(409).json({ error: 'Violação de constraint única no banco de dados.', details: err.meta });
    }
    return next(err);
  }
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
