import type {
  CursorPaginationParams,
  CursorPaginationResult,
} from '@/shared/pagination/cursor-pagination.types';
import type { Product } from '../product.entity';

export abstract class IProductRepository {
  abstract findAll(): Promise<Product[]>;
  abstract findManyPaginatedByCursor(
    params: CursorPaginationParams,
  ): Promise<CursorPaginationResult<Product>>;
  abstract findById(id: string): Promise<Product | null>;
  abstract findManyById(ids: string[]): Promise<Product[]>;
}
