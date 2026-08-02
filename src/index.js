// src/index.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const reservationRoutes = require('./routes/reservations');
const roomRoutes = require('./routes/rooms');
const adminRoutes = require('./routes/admin');
const availabilityRoutes = require('./routes/availability');
const icalRoutes = require('./routes/ical');
const webhookRoutes = require('./routes/webhooks');
const { syncExternalCalendars } = require('./services/ical');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Segurança ──────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Webhook do Stripe precisa do body em raw antes do JSON parser
app.use('/webhooks', webhookRoutes);

app.use(express.json());

// Rate limiting geral
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { error: 'Demasiados pedidos. Tente novamente mais tarde.' }
}));

// Rate limiting mais apertado para reservas
app.use('/api/reservations', rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: { error: 'Limite de reservas atingido. Tente novamente em 1 hora.' }
}));

// ── Rotas ──────────────────────────────────────────────────
app.use('/api/rooms', roomRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/ical', icalRoutes);

// Sincronização iCal de unidades importadas
(async () => {
  try {
    await syncExternalCalendars();
  } catch (err) {
    console.error('Erro na sincronização inicial iCal:', err);
  }
  setInterval(async () => {
    try {
      await syncExternalCalendars();
    } catch (err) {
      console.error('Erro na sincronização periódica iCal:', err);
    }
  }, 60 * 60 * 1000);
})();

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor.'
      : err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🏡 Casa da Serra API a correr em http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});
