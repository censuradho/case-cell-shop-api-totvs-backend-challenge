export const OrderStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
