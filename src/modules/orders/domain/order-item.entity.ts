import type { Decimal } from '@prisma/client/runtime/client';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: Decimal;
}
