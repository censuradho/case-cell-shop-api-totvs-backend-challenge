import type { Decimal } from '@prisma/client/runtime/client';
import type { OrderItem } from './order-item.entity';

export interface Order {
  id: string;
  status: string;
  idempotencyKey: string;
  total: Decimal;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}
