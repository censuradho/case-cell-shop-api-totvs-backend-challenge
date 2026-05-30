import type {
  CursorPaginationParams,
  CursorPaginationResult,
} from '@/shared/pagination/cursor-pagination.types';
import type { Product } from '../product.entity';

export const PRODUCT_REPOSITORY = 'PRODUCT_REPOSITORY' as const;

export interface IProductRepository {
  findAll(): Promise<Product[]>;
  findManyPaginatedByCursor(
    params: CursorPaginationParams,
  ): Promise<CursorPaginationResult<Product>>;
  findById(id: string): Promise<Product | null>;
  findManyById(ids: string[]): Promise<Product[]>;
}
