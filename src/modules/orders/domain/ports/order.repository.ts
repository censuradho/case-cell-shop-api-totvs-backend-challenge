import type { Order } from '../order.entity';
import type { OrderStatus } from '../order-status.enum';

export const ORDER_REPOSITORY = 'ORDER_REPOSITORY' as const;

export interface IOrderRepository {
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  updateStatus(id: string, status: OrderStatus): Promise<void>;
}
