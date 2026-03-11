import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'electronics' },
      update: {},
      create: { name: 'Điện tử', slug: 'electronics' },
    }),
    prisma.category.upsert({
      where: { slug: 'fashion' },
      update: {},
      create: { name: 'Thời trang', slug: 'fashion' },
    }),
    prisma.category.upsert({
      where: { slug: 'vehicles' },
      update: {},
      create: { name: 'Xe cộ', slug: 'vehicles' },
    }),
    prisma.category.upsert({
      where: { slug: 'art' },
      update: {},
      create: { name: 'Nghệ thuật', slug: 'art' },
    }),
    prisma.category.upsert({
      where: { slug: 'real-estate' },
      update: {},
      create: { name: 'Bất động sản', slug: 'real-estate' },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Seed Admin User
  const adminPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@auction.com' },
    update: {},
    create: {
      email: 'admin@auction.com',
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
      balance: 0,
    },
  });

  // Seed Demo Users
  const userPassword = await bcrypt.hash('user123456', 12);
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'seller@auction.com' },
      update: {},
      create: {
        email: 'seller@auction.com',
        username: 'nguyen_seller',
        password: userPassword,
        balance: 50000000,
      },
    }),
    prisma.user.upsert({
      where: { email: 'buyer@auction.com' },
      update: {},
      create: {
        email: 'buyer@auction.com',
        username: 'tran_buyer',
        password: userPassword,
        balance: 100000000,
      },
    }),
  ]);

  console.log(`✅ Created admin + ${users.length} demo users`);
  console.log('📧 Admin: admin@auction.com / admin123456');
  console.log('📧 Seller: seller@auction.com / user123456');
  console.log('📧 Buyer: buyer@auction.com / user123456');

  // Seed Demo Auction
  const now = new Date();
  const startTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 phút sau
  const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 giờ sau

  await prisma.auction.create({
    data: {
      title: 'iPhone 15 Pro Max 256GB – Chính hãng VN/A',
      description:
        'Máy mới 100%, chưa kích hoạt, đầy đủ phụ kiện. Màu Titanium Đen. Bảo hành Apple 12 tháng.',
      startPrice: 25000000,
      currentPrice: 25000000,
      minBidStep: 500000,
      startTime,
      endTime,
      sellerId: users[0].id,
      categoryId: categories[0].id,
    },
  });

  console.log('✅ Created 1 demo auction');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
