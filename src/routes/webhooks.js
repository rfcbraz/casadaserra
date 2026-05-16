// src/routes/webhooks.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../lib/prisma');
const { sendReservationStatusUpdate } = require('../services/email');
const router = express.Router();

// O body tem de chegar em raw para validar a assinatura do Stripe
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const reservationId = paymentIntent.metadata.reservationId;

    if (reservationId) {
      try {
        const reservation = await prisma.reservation.update({
          where: { id: reservationId },
          data: {
            status: 'PAID',
            stripePaymentId: paymentIntent.id,
            paidAt: new Date(),
          },
          include: { room: true, guest: true },
        });
        await sendReservationStatusUpdate(reservation, 'PAID');
      } catch (err) {
        console.error('Erro ao atualizar reserva após pagamento:', err);
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
