import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function seedCategories() {
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: { name: 'Electronics', slug: 'electronics' },
    }),
    prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {},
      create: { name: 'Fashion', slug: 'fashion' },
    }),
    prisma.category.upsert({
      where: { slug: 'vehicles' },
      update: {},
      create: { name: 'Vehicles', slug: 'vehicles' },
    }),
    prisma.category.upsert({
      where: { slug: 'art' },
      update: {},
      create: { name: 'Art', slug: 'art' },
    }),
    prisma.category.upsert({
      where: { slug: 'real-estate' },
      update: {},
      create: { name: 'Real Estate', slug: 'real-estate' },
    }),
  ]);

  return categories;
}

async function seedAuthUsers() {
  const adminPassword = await bcrypt.hash('admin123456', SALT_ROUNDS);
  const userPassword = await bcrypt.hash('user123456', SALT_ROUNDS);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@auction.com' },
    update: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      isActive: true,
      lockedAt: null,
      lockReason: null,
    },
    create: {
      email: 'admin@auction.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      balance: 0,
      isActive: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@auction.com' },
    update: {
      username: 'demo_user',
      password: userPassword,
      role: 'USER',
      isActive: true,
      lockedAt: null,
      lockReason: null,
    },
    create: {
      email: 'user@auction.com',
      username: 'demo_user',
      password: userPassword,
      role: 'USER',
      balance: 100000000,
      isActive: true,
    },
  });

  return { admin, user };
}

async function main() {
  console.log('Seeding database...');

  const categories = await seedCategories();
  console.log(`Created ${categories.length} categories`);

  const { admin, user } = await seedAuthUsers();
  console.log('Created demo auth accounts:');
  console.log(`- ADMIN: ${admin.email} / admin123456`);
  console.log(`- USER: ${user.email} / user123456`);

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
