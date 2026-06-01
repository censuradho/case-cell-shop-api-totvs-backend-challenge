import type { Decimal } from '@prisma/client/runtime/client';
import { UnitOfWork } from '@/application/unit-of-work';
import type { Order } from '../order.entity';

export interface CreateOrderData {
  id: string;
  idempotencyKey: string;
  total: Decimal;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: Decimal;
  }>;
}

export interface IOrderTransactionContext {
  reserveStock(productId: string, quantity: number): Promise<boolean>;
  createOrder(data: CreateOrderData): Promise<Order>;
}

export abstract class IOrderUnitOfWork extends UnitOfWork<IOrderTransactionContext> {}
