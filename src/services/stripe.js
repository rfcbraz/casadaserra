const Stripe = require('stripe');

function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY não está configurada.');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

function refundPaymentIntent(paymentIntentId, reservationId) {
  if (!paymentIntentId) {
    throw new Error('A reserva não tem um pagamento Stripe associado.');
  }

  return getStripeClient().refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: { reservationId },
  }, {
    idempotencyKey: `reservation-refund-${reservationId}`,
  });
}

module.exports = { getStripeClient, refundPaymentIntent };