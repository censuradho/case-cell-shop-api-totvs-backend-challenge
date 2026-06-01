import type { Order } from '../order.entity';
import type { OrderStatus } from '../order-status.enum';

export abstract class IOrderRepository {
  abstract findById(id: string): Promise<Order | null>;
  abstract findByIdempotencyKey(key: string): Promise<Order | null>;
  abstract updateStatus(id: string, status: OrderStatus): Promise<void>;
}
