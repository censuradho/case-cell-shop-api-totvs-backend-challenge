import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mock } from 'vitest-mock-extended';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Decimal } from '@prisma/client/runtime/client';
import { nanoid } from 'nanoid';
import { createCache } from 'cache-manager';
import { createKeyv } from '@keyv/redis';
import type { Cache } from 'cache-manager';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaProductRepository } from '@/modules/products/infrastructure/prisma/prisma-product.repository';
import { GetProductsQuery } from '@/modules/products/application/queries/get-products.query';
import type { AppLogger } from '@/shared/observability/app-logger.service';
import type { PrismaService } from '@/shared/database/prisma.service';

describe('GetProductsQuery — cache-aside (integration)', () => {
  let pool: Pool;
  let prisma: PrismaClient;
  let cacheManager: Cache;
  let keyvStore: ReturnType<typeof createKeyv>;
  let query: GetProductsQuery;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await prisma.$connect();

    keyvStore = createKeyv(process.env.REDIS_URL);
    cacheManager = createCache({ stores: [keyvStore] });

    const prismaAsService = prisma as unknown as PrismaService;
    const productRepository = new PrismaProductRepository(prismaAsService);
    const logger = mock<AppLogger>();

    query = new GetProductsQuery(cacheManager, productRepository, logger);
  });

  afterAll(async () => {
    await keyvStore.disconnect();
    await prisma.$disconnect();
    await pool.end();
  });

  beforeEach(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await keyvStore.clear();
  });

  it('should populate cache on miss and serve from cache on subsequent call', async () => {
    const product = await prisma.product.create({
      data: {
        id: nanoid(),
        name: 'Capinha iPhone 15',
        description: 'Silicone Premium',
        price: new Decimal('29.90'),
        stock: 10,
      },
    });

    // primeira chamada — cache miss, consulta o banco
    const result1 = await query.execute('req-1');
    expect(result1).toHaveLength(1);
    expect(result1[0].id).toBe(product.id);

    // verifica que a chave foi populada no Redis
    const cached = await cacheManager.get('products:all');
    expect(cached).not.toBeNull();

    // remove do banco para provar que a segunda chamada vem do cache
    await prisma.product.delete({ where: { id: product.id } });

    // segunda chamada — deve retornar o dado cacheado mesmo com banco vazio
    const result2 = await query.execute('req-2');
    expect(result2).toHaveLength(1);
    expect(result2[0].id).toBe(product.id);
  });

  it('should cache empty result and not reflect new products added while TTL is active', async () => {
    // primeira chamada — banco vazio, cacheia []
    const result1 = await query.execute('req-1');
    expect(result1).toHaveLength(0);

    // insere produto DEPOIS do cache ser populado
    await prisma.product.create({
      data: {
        id: nanoid(),
        name: 'Produto Novo',
        description: 'Adicionado após o cache',
        price: new Decimal('19.90'),
        stock: 5,
      },
    });

    // segunda chamada — deve retornar [] do cache, não o produto novo
    const result2 = await query.execute('req-2');
    expect(result2).toHaveLength(0);
  });
});
