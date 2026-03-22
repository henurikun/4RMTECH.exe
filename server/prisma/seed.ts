import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/prisma';

async function main() {
  const adminEmail = 'tupacxxx889@gmail.com';
  const adminPass = '4rmtech-admin';

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: '4RMTECH Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(adminPass, 10),
      cart: { create: {} },
    },
  });

  const sampleProducts = [
    {
      sku: 'LAP-001',
      name: 'Ultrabook Pro 14',
      description: 'Lightweight laptop with long battery life.',
      category: 'laptops',
      imageUrl: '/images/laptop_desk.jpg',
      priceCents: 3999900,
      originalPriceCents: 4299900,
      badge: 'Popular',
      specs: { Processor: 'Intel Core Ultra 7', RAM: '16GB DDR5', Storage: '512GB NVMe' },
      stockQuantity: 25,
      inStock: true,
    },
    {
      sku: 'AUD-001',
      name: 'NoiseCancel Headphones X',
      description: 'Noise-cancelling headphones for deep focus.',
      category: 'audio',
      imageUrl: '/images/headphones_product.jpg',
      priceCents: 599900,
      specs: { Type: 'Over-ear', ANC: 'Hybrid', Battery: '30h' },
      stockQuantity: 40,
      inStock: true,
    },
    {
      sku: 'DEV-001',
      name: 'Smart Device Hub',
      description: 'Control your smart devices in one place.',
      category: 'devices',
      imageUrl: '/images/device_modern.jpg',
      priceCents: 249900,
      specs: { Connectivity: 'Wi-Fi 6', Voice: 'Assistant-ready' },
      stockQuantity: 15,
      inStock: true,
    },
  ];

  for (const p of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        category: p.category,
        imageUrl: p.imageUrl,
        priceCents: p.priceCents,
        originalPriceCents: p.originalPriceCents ?? null,
        badge: p.badge ?? null,
        specs: p.specs ?? undefined,
        stockQuantity: p.stockQuantity ?? 0,
        inStock: p.inStock,
      },
      create: p,
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
  // eslint-disable-next-line no-console
  console.log(`Admin login: ${admin.email} / ${adminPass}`);
  // eslint-disable-next-line no-console
  console.log(`Admin user id: ${admin.id}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

