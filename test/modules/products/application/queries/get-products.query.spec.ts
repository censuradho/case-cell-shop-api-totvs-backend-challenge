import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { Decimal } from '@prisma/client/runtime/client';
import type { Cache } from 'cache-manager';
import { GetProductsQuery } from '@/modules/products/application/queries/get-products.query';
import type { IProductRepository } from '@/modules/products/domain/ports/product.repository';
import type { AppLogger } from '@/shared/observability/app-logger.service';
import type { Product } from '@/modules/products/domain/product.entity';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  name: 'Capinha iPhone 15',
  description: 'Capinha de silicone',
  price: new Decimal('29.90'),
  stock: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('GetProductsQuery', () => {
  let query: GetProductsQuery;
  let cacheManager: MockProxy<Cache>;
  let productRepository: MockProxy<IProductRepository>;
  let logger: MockProxy<AppLogger>;

  const requestId = 'test-request-id';
  const CACHE_KEY = 'products:all';

  beforeEach(() => {
    cacheManager = mock<Cache>();
    productRepository = mock<IProductRepository>();
    logger = mock<AppLogger>();
    query = new GetProductsQuery(cacheManager, productRepository, logger);
  });

  it('should return products from cache on cache hit', async () => {
    const cachedProducts = [makeProduct()];
    cacheManager.get.mockResolvedValue(cachedProducts);

    const result = await query.execute(requestId);

    expect(result).toBe(cachedProducts);
    expect(productRepository.findAll).not.toHaveBeenCalled();
  });

  it('should emit cache.hit metric on cache hit', async () => {
    cacheManager.get.mockResolvedValue([makeProduct()]);

    await query.execute(requestId);

    expect(logger.metric).toHaveBeenCalledWith(
      expect.objectContaining({ metric: 'cache.hit', key: CACHE_KEY, requestId }),
    );
  });

  it('should fetch products from repository on cache miss', async () => {
    const products = [makeProduct(), makeProduct({ id: 'product-2' })];
    cacheManager.get.mockResolvedValue(null);
    productRepository.findAll.mockResolvedValue(products);

    const result = await query.execute(requestId);

    expect(result).toBe(products);
    expect(productRepository.findAll).toHaveBeenCalledOnce();
  });

  it('should populate cache after fetching from repository', async () => {
    const products = [makeProduct()];
    cacheManager.get.mockResolvedValue(null);
    productRepository.findAll.mockResolvedValue(products);

    await query.execute(requestId);

    expect(cacheManager.set).toHaveBeenCalledWith(CACHE_KEY, products, 60_000);
  });

  it('should emit cache.miss metric on cache miss', async () => {
    cacheManager.get.mockResolvedValue(null);
    productRepository.findAll.mockResolvedValue([]);

    await query.execute(requestId);

    expect(logger.metric).toHaveBeenCalledWith(
      expect.objectContaining({ metric: 'cache.miss', key: CACHE_KEY, requestId }),
    );
  });
});
