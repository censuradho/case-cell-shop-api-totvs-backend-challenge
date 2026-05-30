import type { Decimal } from '@prisma/client/runtime/client';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: Decimal;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
}
