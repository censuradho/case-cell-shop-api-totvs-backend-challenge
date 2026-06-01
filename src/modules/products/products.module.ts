import { Module } from '@nestjs/common';
import { ProductsController } from './presentation/products.controller';
import { GetProductsQuery } from './application/queries/get-products.query';
import { GetProductsPaginatedQuery } from './application/queries/get-products-paginated.query';
import { GetProductByIdQuery } from './application/queries/get-product-by-id.query';
import { IProductRepository } from './domain/ports/product.repository';
import { PrismaProductRepository } from './infrastructure/prisma/prisma-product.repository';

@Module({
  controllers: [ProductsController],
  providers: [
    GetProductsQuery,
    GetProductsPaginatedQuery,
    GetProductByIdQuery,
    {
      provide: IProductRepository,
      useClass: PrismaProductRepository,
    },
  ],
  exports: [IProductRepository],
})
export class ProductsModule {}
