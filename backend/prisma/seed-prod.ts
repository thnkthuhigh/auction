/**
 * seed-prod.ts — An toàn cho production / Heroku
 *
 * Chỉ upsert dữ liệu tối thiểu cần thiết để hệ thống chạy được:
 *   1. Danh mục sản phẩm (category)
 *   2. Tài khoản Admin
 *
 * KHÔNG xóa dữ liệu hiện có. Idempotent — chạy nhiều lần cũng an toàn.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Đồ cổ', slug: 'do-co' },
  { name: 'Phụ kiện limited', slug: 'phu-kien-limited' },
  { name: 'Tranh nghệ thuật', slug: 'tranh-nghe-thuat' },
  { name: 'Đồ sưu tầm', slug: 'do-suu-tam' },
  { name: 'Trang sức', slug: 'trang-suc' },
  { name: 'Đồng hồ', slug: 'dong-ho' },
  { name: 'Rượu & Đồ uống cao cấp', slug: 'ruou-do-uong' },
  { name: 'Bất động sản', slug: 'bat-dong-san' },
];

async function seedCategories() {
  const results = await Promise.all(
    CATEGORIES.map((cat) =>
      prisma.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name },
        create: { name: cat.name, slug: cat.slug },
      }),
    ),
  );

  console.log(`✓ Categories: ${results.length} upserted`);
  results.forEach((cat) => console.log(`  - ${cat.name} (${cat.slug})`));
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@auction.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123456';
  const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      username: adminUsername,
      role: 'ADMIN',
      isActive: true,
      lockedAt: null,
      lockReason: null,
    },
    create: {
      email: adminEmail,
      username: adminUsername,
      password: passwordHash,
      role: 'ADMIN',
      balance: 0,
      isActive: true,
    },
    select: { id: true, email: true, username: true, role: true },
  });

  console.log(`✓ Admin: ${admin.email} (${admin.username})`);
}

async function main() {
  console.log('--- seed-prod: bắt đầu ---');

  await seedCategories();
  await seedAdminUser();

  console.log('--- seed-prod: hoàn tất ---');
}

main()
  .catch((error) => {
    console.error('seed-prod thất bại:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
