import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import { GetOrderStatusQuery } from '@/modules/orders/application/queries/get-order-status.query';
import type { IOrderRepository } from '@/modules/orders/domain/ports/order.repository';
import type { AppLogger } from '@/shared/observability/app-logger.service';
import type { Order } from '@/modules/orders/domain/order.entity';
import { ORDER_ERRORS } from '@/modules/orders/domain/errors/order.errors';
import { OrderStatus } from '@/modules/orders/domain/order-status.enum';

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  status: OrderStatus.PENDING,
  idempotencyKey: 'idempotency-key-123',
  total: new Decimal('59.80'),
  items: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('GetOrderStatusQuery', () => {
  let query: GetOrderStatusQuery;
  let orderRepository: MockProxy<IOrderRepository>;
  let logger: MockProxy<AppLogger>;

  const requestId = 'test-request-id';
  const orderId = 'order-1';

  beforeEach(() => {
    orderRepository = mock<IOrderRepository>();
    logger = mock<AppLogger>();
    query = new GetOrderStatusQuery(orderRepository, logger);
  });

  it('should return order when found', async () => {
    const order = makeOrder();
    orderRepository.findById.mockResolvedValue(order);

    const result = await query.execute(orderId, requestId);

    expect(result).toBe(order);
    expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
  });

  it('should throw NotFoundException when order is not found', async () => {
    orderRepository.findById.mockResolvedValue(null);

    await expect(query.execute(orderId, requestId)).rejects.toThrow(
      new NotFoundException(ORDER_ERRORS.ORDER_NOT_FOUND),
    );
  });
});
