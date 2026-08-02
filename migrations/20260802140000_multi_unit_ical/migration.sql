-- Add multi-unit support and iCal synchronization fields

-- Add a declined reservation state for pending requests that are refused.
ALTER TYPE "ReservationStatus" ADD VALUE 'DECLINED';

-- Add new unit-specific metadata and external feed URLs.
ALTER TABLE "Room"
  ADD COLUMN "sizeSqm" DOUBLE PRECISION,
  ADD COLUMN "bedrooms" INTEGER,
  ADD COLUMN "beds" INTEGER,
  ADD COLUMN "bookingIcalUrl" TEXT,
  ADD COLUMN "airbnbIcalUrl" TEXT;

-- Add source tracking for imported blocked dates.
CREATE TYPE "BlockedDateSource" AS ENUM ('MANUAL', 'BOOKING_COM', 'AIRBNB');

ALTER TABLE "BlockedDate"
  ADD COLUMN "source" "BlockedDateSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "externalUid" TEXT;
