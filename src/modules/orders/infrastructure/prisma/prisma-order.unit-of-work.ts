import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import { UnitOfWork } from '@/application/unit-of-work';
import type {
  IOrderUnitOfWork,
  IOrderTransactionContext,
  CreateOrderData,
} from '../../domain/ports/order.unit-of-work';
import type { Order } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status.enum';

@Injectable()
export class PrismaOrderUnitOfWork
  extends UnitOfWork<IOrderTransactionContext>
  implements IOrderUnitOfWork
{
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async run<T>(
    work: (ctx: IOrderTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const ctx: IOrderTransactionContext = {
        reserveStock: async (
          productId: string,
          quantity: number,
        ): Promise<boolean> => {
          const result = await tx.product.updateMany({
            where: { id: productId, stock: { gte: quantity } },
            data: { stock: { decrement: quantity } },
          });
          return result.count > 0;
        },

        createOrder: async (data: CreateOrderData): Promise<Order> => {
          return tx.order.create({
            data: {
              id: data.id,
              idempotencyKey: data.idempotencyKey,
              total: data.total,
              status: OrderStatus.PENDING,
              items: {
                create: data.items.map((item) => ({
                  id: item.id,
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                })),
              },
            },
            include: { items: true },
          });
        },
      };

      return work(ctx);
    });
  }
}
