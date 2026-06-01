import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { IProductRepository } from '../../domain/ports/product.repository';
import { AppLogger } from '@/shared/observability/app-logger.service';
import type { Product } from '../../domain/product.entity';
import { PRODUCT_ERRORS } from '../../domain/errors/product.errors';

const CACHE_TTL_MS = 60 * 1000;

@Injectable()
export class GetProductByIdQuery {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly productRepository: IProductRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(id: string, requestId: string): Promise<Product> {
    const cacheKey = `products:${id}`;
    const cached = await this.cacheManager.get<Product>(cacheKey);

    if (cached) {
      this.logger.metric({
        metric: 'cache.hit',
        key: cacheKey,
        requestId,
        context: 'GetProductByIdQuery',
      });
      return cached;
    }

    this.logger.metric({
      metric: 'cache.miss',
      key: cacheKey,
      requestId,
      context: 'GetProductByIdQuery',
    });

    const product = await this.productRepository.findById(id);

    if (!product) {
      this.logger.log({
        requestId,
        message: `Produto não encontrado: ${id}`,
        context: 'GetProductByIdQuery',
      });
      throw new NotFoundException(PRODUCT_ERRORS.PRODUCT_NOT_FOUND);
    }

    await this.cacheManager.set(cacheKey, product, CACHE_TTL_MS);

    return product;
  }
}
