import type { Decimal } from '@prisma/client/runtime/client';
import { UnitOfWork } from '@/application/unit-of-work';
import type { Order } from '../order.entity';

export const ORDER_UNIT_OF_WORK = 'ORDER_UNIT_OF_WORK' as const;

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

export interface IOrderUnitOfWork extends UnitOfWork<IOrderTransactionContext> {}
