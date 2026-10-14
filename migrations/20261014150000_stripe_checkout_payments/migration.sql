ALTER TABLE "Reservation"
ADD COLUMN "stripeCheckoutSessionId" TEXT,
ADD COLUMN "stripeRefundId" TEXT,
ADD COLUMN "paymentExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Reservation_stripeCheckoutSessionId_key"
ON "Reservation"("stripeCheckoutSessionId");

CREATE UNIQUE INDEX "Reservation_stripeRefundId_key"
ON "Reservation"("stripeRefundId");