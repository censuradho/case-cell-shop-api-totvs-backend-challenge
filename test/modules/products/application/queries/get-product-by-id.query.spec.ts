import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import type { Cache } from 'cache-manager';
import { GetProductByIdQuery } from '@/modules/products/application/queries/get-product-by-id.query';
import type { IProductRepository } from '@/modules/products/domain/ports/product.repository';
import type { AppLogger } from '@/shared/observability/app-logger.service';
import type { Product } from '@/modules/products/domain/product.entity';
import { PRODUCT_ERRORS } from '@/modules/products/domain/errors/product.errors';

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

describe('GetProductByIdQuery', () => {
  let query: GetProductByIdQuery;
  let cacheManager: MockProxy<Cache>;
  let productRepository: MockProxy<IProductRepository>;
  let logger: MockProxy<AppLogger>;

  const requestId = 'test-request-id';
  const productId = 'product-1';
  const cacheKey = `products:${productId}`;

  beforeEach(() => {
    cacheManager = mock<Cache>();
    productRepository = mock<IProductRepository>();
    logger = mock<AppLogger>();
    query = new GetProductByIdQuery(cacheManager, productRepository, logger);
  });

  it('should return product from cache on cache hit', async () => {
    const cachedProduct = makeProduct();
    cacheManager.get.mockResolvedValue(cachedProduct);

    const result = await query.execute(productId, requestId);

    expect(result).toBe(cachedProduct);
    expect(productRepository.findById).not.toHaveBeenCalled();
  });

  it('should emit cache.hit metric on cache hit', async () => {
    cacheManager.get.mockResolvedValue(makeProduct());

    await query.execute(productId, requestId);

    expect(logger.metric).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'cache.hit',
        key: cacheKey,
        requestId,
      }),
    );
  });

  it('should fetch product from repository on cache miss', async () => {
    const product = makeProduct();
    cacheManager.get.mockResolvedValue(null);
    productRepository.findById.mockResolvedValue(product);

    const result = await query.execute(productId, requestId);

    expect(result).toBe(product);
    expect(productRepository.findById).toHaveBeenCalledWith(productId);
  });

  it('should populate cache after fetching from repository', async () => {
    const product = makeProduct();
    cacheManager.get.mockResolvedValue(null);
    productRepository.findById.mockResolvedValue(product);

    await query.execute(productId, requestId);

    expect(cacheManager.set).toHaveBeenCalledWith(cacheKey, product, 60_000);
  });

  it('should emit cache.miss metric on cache miss', async () => {
    const product = makeProduct();
    cacheManager.get.mockResolvedValue(null);
    productRepository.findById.mockResolvedValue(product);

    await query.execute(productId, requestId);

    expect(logger.metric).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'cache.miss',
        key: cacheKey,
        requestId,
      }),
    );
  });

  it('should throw NotFoundException when product is not found', async () => {
    cacheManager.get.mockResolvedValue(null);
    productRepository.findById.mockResolvedValue(null);

    await expect(query.execute(productId, requestId)).rejects.toThrow(
      new NotFoundException(PRODUCT_ERRORS.PRODUCT_NOT_FOUND),
    );
  });
});
