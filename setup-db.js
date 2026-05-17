// setup-db.js — cria tabelas e popula dados iniciais
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 A criar tabelas...');

  // Criar tabelas via SQL raw
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Room" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "type" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "pricePerNight" DOUBLE PRECISION NOT NULL,
      "capacity" INTEGER NOT NULL,
      "amenities" TEXT[] DEFAULT '{}',
      "images" TEXT[] DEFAULT '{}',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Guest" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "phone" TEXT,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ReservationStatus" AS ENUM ('PENDING','CONFIRMED','CANCELLED','COMPLETED','PAID');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Reservation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "checkIn" TIMESTAMP NOT NULL,
      "checkOut" TIMESTAMP NOT NULL,
      "nights" INTEGER NOT NULL,
      "guests" INTEGER NOT NULL,
      "totalPrice" DOUBLE PRECISION NOT NULL,
      "status" "ReservationStatus" NOT NULL DEFAULT 'PENDING',
      "breakfast" BOOLEAN NOT NULL DEFAULT true,
      "specialRequests" TEXT,
      "stripePaymentId" TEXT,
      "paidAt" TIMESTAMP,
      "notes" TEXT,
      "roomId" TEXT NOT NULL REFERENCES "Room"("id"),
      "guestId" TEXT NOT NULL REFERENCES "Guest"("id"),
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BlockedDate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TIMESTAMP NOT NULL,
      "reason" TEXT,
      "roomId" TEXT NOT NULL REFERENCES "Room"("id"),
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE("roomId", "date")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Admin" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✅ Tabelas criadas.');

  // Seed de dados
  console.log('🌱 A popular dados...');

  const { v4: uuidv4 } = require('uuid');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@casadaserra.pt';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "Admin" ("id", "email", "password", "name")
    VALUES ('${uuidv4()}', '${adminEmail}', '${hashedPassword}', 'Administrador')
    ON CONFLICT ("email") DO NOTHING;
  `);

  const rooms = [
    { name: 'Suite Panorâmica', type: 'Suite', description: 'Vista deslumbrante sobre a serra, cama king-size e banheira de hidromassagem privativa.', price: 185, capacity: 2, amenities: ['King-size','Vista serra','Jacuzzi','AC','Varanda','Wi-Fi','TV'] },
    { name: 'Quarto Deluxe', type: 'Deluxe', description: 'Espaçoso e acolhedor, com decoração em madeira natural e casa de banho em pedra.', price: 120, capacity: 2, amenities: ['Queen-size','Casa banho privada','AC','Wi-Fi','TV'] },
    { name: 'Quarto Superior', type: 'Superior', description: 'Vistas para o jardim e floresta, com cama de casal e ambiente sereno.', price: 95, capacity: 2, amenities: ['Casal','Vista jardim','AC','Wi-Fi'] },
    { name: 'Quarto Twin', type: 'Twin', description: 'Duas camas individuais, ideal para amigos ou famílias.', price: 85, capacity: 2, amenities: ['2 camas','AC','Wi-Fi','TV'] },
    { name: 'Quarto Lareira', type: 'Especial', description: 'Lareira a lenha para noites frias de inverno, cama king e ambiente íntimo.', price: 145, capacity: 2, amenities: ['King-size','Lareira','AC','Vista'] },
    { name: 'Suite Familiar', type: 'Suite', description: 'Dois quartos comunicantes, perfeita para famílias. Sala de estar privativa.', price: 220, capacity: 4, amenities: ['2 quartos','Sala estar','Cozinha','AC','Wi-Fi'] },
  ];

  for (const r of rooms) {
    const amenitiesLiteral = `'{${r.amenities.map(a => `"${a}"`).join(',')}}'`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Room" ("id", "name", "type", "description", "pricePerNight", "capacity", "amenities", "images")
      VALUES ('${uuidv4()}', '${r.name.replace(/'/g, "''")}', '${r.type}', '${r.description.replace(/'/g, "''")}', ${r.price}, ${r.capacity}, ${amenitiesLiteral}, '{}')
      ON CONFLICT ("name") DO NOTHING;
    `);
    console.log(`✓ ${r.name}`);
  }

  console.log('✅ Base de dados pronta!');
}

main()
  .catch(e => { console.error('Erro:', e); })
  .finally(() => prisma.$disconnect());
