import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  PRODUCT_REPOSITORY,
  type IProductRepository,
} from '../../domain/ports/product.repository';
import { AppLogger } from '@/shared/observability/app-logger.service';
import type {
  CursorPaginationParams,
  CursorPaginationResult,
} from '@/shared/pagination/cursor-pagination.types';
import type { Product } from '../../domain/product.entity';

const CACHE_TTL_MS = 60 * 1000;

@Injectable()
export class GetProductsPaginatedQuery {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    params: CursorPaginationParams,
    requestId: string,
  ): Promise<CursorPaginationResult<Product>> {
    const cacheKey = `products:paginated:${params.cursor ?? 'first'}:${params.limit}`;

    const cached =
      await this.cacheManager.get<CursorPaginationResult<Product>>(cacheKey);

    if (cached) {
      this.logger.metric({
        metric: 'cache.hit',
        key: cacheKey,
        requestId,
        context: 'GetProductsPaginatedQuery',
      });
      return cached;
    }

    this.logger.metric({
      metric: 'cache.miss',
      key: cacheKey,
      requestId,
      context: 'GetProductsPaginatedQuery',
    });

    const result =
      await this.productRepository.findManyPaginatedByCursor(params);

    await this.cacheManager.set(cacheKey, result, CACHE_TTL_MS);

    return result;
  }
}
