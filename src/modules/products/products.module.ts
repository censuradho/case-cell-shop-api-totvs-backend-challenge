import { Module } from '@nestjs/common';
import { ProductsController } from './presentation/products.controller';
import { GetProductsQuery } from './application/queries/get-products.query';
import { GetProductsPaginatedQuery } from './application/queries/get-products-paginated.query';
import { GetProductByIdQuery } from './application/queries/get-product-by-id.query';
import { PRODUCT_REPOSITORY } from './domain/ports/product.repository';
import { PrismaProductRepository } from './infrastructure/prisma/prisma-product.repository';

@Module({
  controllers: [ProductsController],
  providers: [
    GetProductsQuery,
    GetProductsPaginatedQuery,
    GetProductByIdQuery,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: PrismaProductRepository,
    },
  ],
})
export class ProductsModule {}
