import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Decimal } from '@prisma/client/runtime/client';
import { nanoid } from 'nanoid';
import { PrismaClient } from '@/generated/prisma/client';

describe('Stock reservation — atomic concurrency (integration)', () => {
  let pool: Pool;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl)
      throw new Error('DATABASE_URL not set — ensure .env.test is loaded');

    pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
  });

  it('should allow exactly N reservations for a product with stock = N under concurrent load', async () => {
    const STOCK = 5;
    const TOTAL_REQUESTS = STOCK + 3;

    const product = await prisma.product.create({
      data: {
        id: nanoid(),
        name: 'Capinha de Teste',
        description: 'Produto para teste de concorrência',
        price: new Decimal('29.90'),
        stock: STOCK,
      },
    });

    // Simula o mesmo UPDATE atômico usado pelo PrismaOrderUnitOfWork.reserveStock
    const results = await Promise.all(
      Array.from({ length: TOTAL_REQUESTS }, () =>
        prisma.product.updateMany({
          where: { id: product.id, stock: { gte: 1 } },
          data: { stock: { decrement: 1 } },
        }),
      ),
    );

    const successCount = results.filter((r) => r.count > 0).length;
    const failCount = results.filter((r) => r.count === 0).length;

    expect(successCount).toBe(STOCK);
    expect(failCount).toBe(TOTAL_REQUESTS - STOCK);

    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(updatedProduct?.stock).toBe(0);
  });
});
