import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { IProductRepository } from '../../domain/ports/product.repository';
import { AppLogger } from '@/shared/observability/app-logger.service';
import type { Product } from '../../domain/product.entity';

const CACHE_KEY = 'products:all';
const CACHE_TTL_MS = 60 * 1000;

@Injectable()
export class GetProductsQuery {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly productRepository: IProductRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(requestId: string): Promise<Product[]> {
    const cached = await this.cacheManager.get<Product[]>(CACHE_KEY);

    if (cached) {
      this.logger.metric({
        metric: 'cache.hit',
        key: CACHE_KEY,
        requestId,
        context: 'GetProductsQuery',
      });
      return cached;
    }

    this.logger.metric({
      metric: 'cache.miss',
      key: CACHE_KEY,
      requestId,
      context: 'GetProductsQuery',
    });

    const products = await this.productRepository.findAll();
    await this.cacheManager.set(CACHE_KEY, products, CACHE_TTL_MS);

    return products;
  }
}
