import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OrdersController } from './presentation/orders.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order.use-case';
import { GetOrderStatusQuery } from './application/queries/get-order-status.query';
import { ORDER_REPOSITORY } from './domain/ports/order.repository';
import { ORDER_UNIT_OF_WORK } from './domain/ports/order.unit-of-work';
import { PrismaOrderRepository } from './infrastructure/prisma/prisma-order.repository';
import { PrismaOrderUnitOfWork } from './infrastructure/prisma/prisma-order.unit-of-work';
import { CheckoutProcessor } from './infrastructure/queue/checkout.processor';
import { ProductsModule } from '@/modules/products/products.module';
import { CHECKOUT_QUEUE } from './orders.constants';

@Module({
  imports: [ProductsModule, BullModule.registerQueue({ name: CHECKOUT_QUEUE })],
  controllers: [OrdersController],
  providers: [
    CreateOrderUseCase,
    GetOrderStatusQuery,
    CheckoutProcessor,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: ORDER_UNIT_OF_WORK, useClass: PrismaOrderUnitOfWork },
  ],
})
export class OrdersModule {}
