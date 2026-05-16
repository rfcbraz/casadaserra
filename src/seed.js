// src/seed.js
// Popula a base de dados com dados iniciais
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 A popular a base de dados...');

  // Admin
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin1234', 12);
  const admin = await prisma.admin.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@casadaserra.pt' },
    update: {},
    create: {
      email: process.env.ADMIN_EMAIL || 'admin@casadaserra.pt',
      password: hashedPassword,
      name: process.env.ADMIN_NAME || 'Administrador',
    },
  });
  console.log(`✓ Admin criado: ${admin.email}`);

  // Quartos
  const rooms = [
    {
      name: 'Suite Panorâmica',
      type: 'Suite',
      description: 'Vista deslumbrante sobre a serra, cama king-size e banheira de hidromassagem privativa.',
      pricePerNight: 185,
      capacity: 2,
      amenities: ['King-size', 'Vista serra', 'Jacuzzi', 'AC', 'Varanda', 'Wi-Fi', 'TV'],
      images: [],
    },
    {
      name: 'Quarto Deluxe',
      type: 'Deluxe',
      description: 'Espaçoso e acolhedor, com decoração em madeira natural e casa de banho em pedra.',
      pricePerNight: 120,
      capacity: 2,
      amenities: ['Queen-size', 'Casa banho privada', 'AC', 'Wi-Fi', 'TV'],
      images: [],
    },
    {
      name: 'Quarto Superior',
      type: 'Superior',
      description: 'Vistas para o jardim e floresta, com cama de casal e ambiente sereno.',
      pricePerNight: 95,
      capacity: 2,
      amenities: ['Casal', 'Vista jardim', 'AC', 'Wi-Fi'],
      images: [],
    },
    {
      name: 'Quarto Twin',
      type: 'Twin',
      description: 'Duas camas individuais, ideal para amigos ou famílias.',
      pricePerNight: 85,
      capacity: 2,
      amenities: ['2 camas', 'AC', 'Wi-Fi', 'TV'],
      images: [],
    },
    {
      name: 'Quarto Lareira',
      type: 'Especial',
      description: 'Lareira a lenha para noites frias de inverno, cama king e ambiente íntimo.',
      pricePerNight: 145,
      capacity: 2,
      amenities: ['King-size', 'Lareira', 'AC', 'Vista'],
      images: [],
    },
    {
      name: 'Suite Familiar',
      type: 'Suite',
      description: 'Dois quartos comunicantes, perfeita para famílias. Sala de estar privativa.',
      pricePerNight: 220,
      capacity: 4,
      amenities: ['2 quartos', 'Sala estar', 'Cozinha', 'AC', 'Wi-Fi'],
      images: [],
    },
  ];

  for (const room of rooms) {
    const created = await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
    console.log(`✓ Quarto criado: ${created.name} (€${created.pricePerNight}/noite)`);
  }

  console.log('\n✅ Base de dados populada com sucesso!');
  console.log(`\n🔑 Login admin:`);
  console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@casadaserra.pt'}`);
  console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin1234'}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
