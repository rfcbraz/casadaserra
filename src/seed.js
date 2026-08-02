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

  // Unidades
  const rooms = [
    {
      name: 'T2 Serra',
      type: 'T2',
      description: 'Apartamento T2 com sala ampla, cozinha equipada, varanda e vista para a serra.',
      pricePerNight: 160,
      capacity: 4,
      sizeSqm: 90,
      bedrooms: 2,
      beds: 3,
      amenities: ['Cozinha', 'Wi-Fi', 'TV', 'Aquecimento', 'Varanda', 'Roupa de cama'],
      images: [],
      bookingIcalUrl: null,
      airbnbIcalUrl: null,
    },
    {
      name: 'T3 Bosque',
      type: 'T3',
      description: 'Espaçosa unidade T3 com jardim privado, sala de estar com lareira e três quartos confortáveis.',
      pricePerNight: 220,
      capacity: 6,
      sizeSqm: 120,
      bedrooms: 3,
      beds: 4,
      amenities: ['Lareira', 'Cozinha', 'Wi-Fi', 'TV', 'Jardim privado', 'Roupa de cama'],
      images: [],
      bookingIcalUrl: null,
      airbnbIcalUrl: null,
    },
  ];

  for (const room of rooms) {
    const created = await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
    console.log(`✓ Unidade criada: ${created.name} (€${created.pricePerNight}/noite)`);
  }

  console.log('\n✅ Base de dados populada com sucesso!');
  console.log(`\n🔑 Login admin:`);
  console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@casadaserra.pt'}`);
  console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'admin1234'}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
