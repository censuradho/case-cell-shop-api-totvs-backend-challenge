import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import type { IProductRepository } from '../../domain/ports/product.repository';
import type { Product } from '../../domain/product.entity';
import type {
  CursorPaginationParams,
  CursorPaginationResult,
} from '@/shared/pagination/cursor-pagination.types';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findManyPaginatedByCursor(
    params: CursorPaginationParams,
  ): Promise<CursorPaginationResult<Product>> {
    const { cursor, limit } = params;

    const products = await this.prisma.product.findMany({
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
      }),
      skip: cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
    });

    const hasNextPage = products.length > limit;
    const data = hasNextPage ? products.slice(0, limit) : products;
    const nextCursor = hasNextPage ? (data[data.length - 1]?.id ?? null) : null;

    return { data, nextCursor, hasNextPage };
  }

  async findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findManyById(ids: string[]): Promise<Product[]> {
    return this.prisma.product.findMany({ where: { id: { in: ids } } });
  }
}
