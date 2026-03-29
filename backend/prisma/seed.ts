import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

type SeedUser = {
  id: string;
  email: string;
  username: string;
};

type SeedContext = {
  admin: SeedUser;
  seller: SeedUser;
  buyer: SeedUser;
  buyerAlt: SeedUser;
  categories: Record<string, string>;
};

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function seedCategories() {
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'do-co' },
      update: { name: 'Đồ cổ' },
      create: { name: 'Đồ cổ', slug: 'do-co' },
    }),
    prisma.category.upsert({
      where: { slug: 'phu-kien-limited' },
      update: { name: 'Phụ kiện limited' },
      create: { name: 'Phụ kiện limited', slug: 'phu-kien-limited' },
    }),
    prisma.category.upsert({
      where: { slug: 'tranh-nghe-thuat' },
      update: { name: 'Tranh nghệ thuật' },
      create: { name: 'Tranh nghệ thuật', slug: 'tranh-nghe-thuat' },
    }),
    prisma.category.upsert({
      where: { slug: 'do-suu-tam' },
      update: { name: 'Đồ sưu tầm' },
      create: { name: 'Đồ sưu tầm', slug: 'do-suu-tam' },
    }),
  ]);

  return Object.fromEntries(categories.map((category) => [category.slug, category.id]));
}

async function upsertUser(params: {
  email: string;
  username: string;
  passwordHash: string;
  role: 'ADMIN' | 'USER';
  balance: number;
}): Promise<SeedUser> {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      username: params.username,
      password: params.passwordHash,
      role: params.role,
      balance: params.balance,
      isActive: true,
      lockedAt: null,
      lockReason: null,
    },
    create: {
      email: params.email,
      username: params.username,
      password: params.passwordHash,
      role: params.role,
      balance: params.balance,
      isActive: true,
    },
    select: { id: true, email: true, username: true },
  });

  return user;
}

async function seedUsers() {
  const [adminPasswordHash, userPasswordHash] = await Promise.all([
    bcrypt.hash('admin123456', SALT_ROUNDS),
    bcrypt.hash('user123456', SALT_ROUNDS),
  ]);

  const [admin, seller, buyer, buyerAlt] = await Promise.all([
    upsertUser({
      email: 'admin@auction.com',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      balance: 0,
    }),
    upsertUser({
      email: 'seller@auction.com',
      username: 'seller_demo',
      passwordHash: userPasswordHash,
      role: 'USER',
      balance: 50000000,
    }),
    upsertUser({
      email: 'buyer@auction.com',
      username: 'buyer_demo',
      passwordHash: userPasswordHash,
      role: 'USER',
      balance: 120000000,
    }),
    upsertUser({
      email: 'buyer2@auction.com',
      username: 'buyer_alt',
      passwordHash: userPasswordHash,
      role: 'USER',
      balance: 120000000,
    }),
  ]);

  return { admin, seller, buyer, buyerAlt };
}

async function resetAuctionData() {
  await prisma.bid.deleteMany();
  await prisma.auction.deleteMany();
}

async function seedAuctions(context: SeedContext) {
  const { admin, seller, buyer, buyerAlt, categories } = context;

  const draftAuction = await prisma.auction.create({
    data: {
      title: 'Tượng đồng Đông Sơn - Bản nháp',
      description: 'Phiên bản nháp để nhà cung cấp cập nhật thông tin trước khi gửi duyệt.',
      imageUrl: null,
      startPrice: 25000000,
      currentPrice: 25000000,
      minBidStep: 500000,
      status: 'PENDING',
      reviewStatus: 'PENDING_REVIEW',
      startTime: minutesFromNow(720),
      endTime: minutesFromNow(960),
      sellerId: seller.id,
      categoryId: categories['do-co'],
    },
  });

  const pendingReviewAuction = await prisma.auction.create({
    data: {
      title: 'Vòng tay phỉ thúy xanh ngọc - Chờ duyệt',
      description: 'Nhà cung cấp đã gửi duyệt, đang nằm trong hàng chờ xét duyệt của Admin.',
      imageUrl: null,
      startPrice: 42000000,
      currentPrice: 42000000,
      minBidStep: 1000000,
      status: 'REVIEW',
      reviewStatus: 'PENDING_REVIEW',
      startTime: minutesFromNow(1080),
      endTime: minutesFromNow(1380),
      sellerId: seller.id,
      categoryId: categories['phu-kien-limited'],
    },
  });

  const changesRequestedAuction = await prisma.auction.create({
    data: {
      title: 'Tranh sơn mài cổ điển - Cần bổ sung thông tin',
      description: 'Admin đã yêu cầu nhà cung cấp bổ sung thông tin xuất xứ và chứng nhận.',
      imageUrl: null,
      startPrice: 18000000,
      currentPrice: 18000000,
      minBidStep: 300000,
      status: 'PENDING',
      reviewStatus: 'CHANGES_REQUESTED',
      reviewNote: 'Bổ sung hình ảnh chứng nhận gốc và mô tả tình trạng chi tiết.',
      reviewedAt: minutesFromNow(-120),
      reviewedById: admin.id,
      startTime: minutesFromNow(840),
      endTime: minutesFromNow(1140),
      sellerId: seller.id,
      categoryId: categories['tranh-nghe-thuat'],
    },
  });

  const approvedScheduledAuction = await prisma.auction.create({
    data: {
      title: 'Đồng hồ cổ Omega 1959 - Đã duyệt, sắp mở phiên',
      description: 'Phiên đã được Admin duyệt và lên lịch mở đấu giá.',
      imageUrl: null,
      startPrice: 56000000,
      currentPrice: 56000000,
      minBidStep: 1000000,
      status: 'PENDING',
      reviewStatus: 'APPROVED',
      reviewedAt: minutesFromNow(-90),
      reviewedById: admin.id,
      startTime: minutesFromNow(25),
      endTime: minutesFromNow(190),
      sellerId: seller.id,
      categoryId: categories['do-suu-tam'],
    },
  });

  const activeAuction = await prisma.auction.create({
    data: {
      title: 'Túi limited Chanel 22 - Đang đấu giá',
      description: 'Phiên ACTIVE để kiểm tra realtime bid và luồng người mua.',
      imageUrl: null,
      startPrice: 8000000,
      currentPrice: 8000000,
      minBidStep: 200000,
      status: 'ACTIVE',
      reviewStatus: 'APPROVED',
      reviewedAt: minutesFromNow(-240),
      reviewedById: admin.id,
      startTime: minutesFromNow(-40),
      endTime: minutesFromNow(120),
      sellerId: seller.id,
      categoryId: categories['phu-kien-limited'],
    },
  });

  await prisma.bid.createMany({
    data: [
      {
        auctionId: activeAuction.id,
        bidderId: buyer.id,
        amount: 8400000,
        createdAt: minutesFromNow(-20),
      },
      {
        auctionId: activeAuction.id,
        bidderId: buyerAlt.id,
        amount: 9000000,
        createdAt: minutesFromNow(-12),
      },
      {
        auctionId: activeAuction.id,
        bidderId: buyer.id,
        amount: 9600000,
        createdAt: minutesFromNow(-4),
      },
    ],
  });

  await prisma.auction.update({
    where: { id: activeAuction.id },
    data: {
      currentPrice: 9600000,
      heldBidderId: buyer.id,
      heldAmount: 9600000,
    },
  });

  const endedAuction = await prisma.auction.create({
    data: {
      title: 'Bình gốm men rạn - Đã kết thúc',
      description: 'Phiên ENDED có người thắng rõ ràng để kiểm tra kết quả.',
      imageUrl: null,
      startPrice: 12000000,
      currentPrice: 12000000,
      minBidStep: 500000,
      status: 'ENDED',
      reviewStatus: 'APPROVED',
      reviewedAt: minutesFromNow(-1440),
      reviewedById: admin.id,
      startTime: minutesFromNow(-360),
      endTime: minutesFromNow(-120),
      sellerId: seller.id,
      categoryId: categories['do-co'],
    },
  });

  await prisma.bid.createMany({
    data: [
      {
        auctionId: endedAuction.id,
        bidderId: buyer.id,
        amount: 13000000,
        createdAt: minutesFromNow(-250),
      },
      {
        auctionId: endedAuction.id,
        bidderId: buyerAlt.id,
        amount: 14500000,
        createdAt: minutesFromNow(-170),
      },
    ],
  });

  await prisma.auction.update({
    where: { id: endedAuction.id },
    data: {
      currentPrice: 14500000,
      winnerId: buyerAlt.id,
      heldBidderId: null,
      heldAmount: 0,
    },
  });

  const cancelledAuction = await prisma.auction.create({
    data: {
      title: 'Túi Hermes mini - Đã hủy',
      description: 'Phiên đã được Admin hủy trước giờ bắt đầu để kiểm tra nhãn CANCELED.',
      imageUrl: null,
      startPrice: 90000000,
      currentPrice: 90000000,
      minBidStep: 2000000,
      status: 'CANCELLED',
      reviewStatus: 'APPROVED',
      reviewedAt: minutesFromNow(-300),
      reviewedById: admin.id,
      startTime: minutesFromNow(180),
      endTime: minutesFromNow(420),
      sellerId: seller.id,
      categoryId: categories['phu-kien-limited'],
    },
  });

  const rejectedAuction = await prisma.auction.create({
    data: {
      title: 'Tranh không rõ nguồn gốc - Bị từ chối',
      description: 'Trường hợp Admin từ chối sản phẩm vì thiếu xác thực nguồn gốc.',
      imageUrl: null,
      startPrice: 30000000,
      currentPrice: 30000000,
      minBidStep: 500000,
      status: 'CANCELLED',
      reviewStatus: 'REJECTED',
      reviewNote: 'Không đủ chứng từ xác minh nguồn gốc.',
      reviewedAt: minutesFromNow(-60),
      reviewedById: admin.id,
      startTime: minutesFromNow(480),
      endTime: minutesFromNow(700),
      sellerId: seller.id,
      categoryId: categories['tranh-nghe-thuat'],
    },
  });

  await Promise.all([
    prisma.user.update({
      where: { id: seller.id },
      data: { balance: 64500000 },
    }),
    prisma.user.update({
      where: { id: buyer.id },
      data: { balance: 110400000 },
    }),
    prisma.user.update({
      where: { id: buyerAlt.id },
      data: { balance: 105500000 },
    }),
  ]);

  return {
    draftAuction,
    pendingReviewAuction,
    changesRequestedAuction,
    approvedScheduledAuction,
    activeAuction,
    endedAuction,
    cancelledAuction,
    rejectedAuction,
  };
}

async function main() {
  console.log('Seeding database...');

  const categories = await seedCategories();
  const users = await seedUsers();
  await resetAuctionData();
  const auctions = await seedAuctions({
    ...users,
    categories,
  });

  console.log(`Categories: ${Object.keys(categories).length}`);
  console.log('Demo accounts (ready to login):');
  console.log(`- ADMIN: ${users.admin.email} / admin123456`);
  console.log(`- SELLER: ${users.seller.email} / user123456`);
  console.log(`- BUYER: ${users.buyer.email} / user123456`);
  console.log(`- BUYER ALT: ${users.buyerAlt.email} / user123456`);
  console.log('Auctions seeded by flow:');
  console.log(`- DRAFT: ${auctions.draftAuction.title}`);
  console.log(`- REVIEW QUEUE: ${auctions.pendingReviewAuction.title}`);
  console.log(`- CHANGES REQUESTED: ${auctions.changesRequestedAuction.title}`);
  console.log(`- APPROVED SCHEDULED: ${auctions.approvedScheduledAuction.title}`);
  console.log(`- ACTIVE: ${auctions.activeAuction.title}`);
  console.log(`- ENDED: ${auctions.endedAuction.title}`);
  console.log(`- CANCELLED: ${auctions.cancelledAuction.title}`);
  console.log(`- REJECTED: ${auctions.rejectedAuction.title}`);
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
