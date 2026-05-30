import { describe, it, expect, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/client';
import type { Queue } from 'bullmq';
import { CreateOrderUseCase } from '@/modules/orders/application/use-cases/create-order.use-case';
import type { IOrderRepository } from '@/modules/orders/domain/ports/order.repository';
import type {
  IOrderUnitOfWork,
  IOrderTransactionContext,
} from '@/modules/orders/domain/ports/order.unit-of-work';
import type { IProductRepository } from '@/modules/products/domain/ports/product.repository';
import type { AppLogger } from '@/shared/observability/app-logger.service';
import type { Order } from '@/modules/orders/domain/order.entity';
import type { Product } from '@/modules/products/domain/product.entity';
import { ORDER_ERRORS } from '@/modules/orders/domain/errors/order.errors';
import { OrderStatus } from '@/modules/orders/domain/order-status.enum';
import type { CreateOrderDto } from '@/modules/orders/application/dtos/create-order.dto';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  name: 'Capinha iPhone 15',
  description: 'Capinha de silicone',
  price: new Decimal('29.90'),
  stock: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'order-1',
  status: OrderStatus.PENDING,
  idempotencyKey: 'idempotency-key-123',
  total: new Decimal('59.80'),
  items: [
    {
      id: 'item-1',
      orderId: 'order-1',
      productId: 'product-1',
      quantity: 2,
      unitPrice: new Decimal('29.90'),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeDto = (overrides: Partial<CreateOrderDto> = {}): CreateOrderDto => ({
  items: [{ productId: 'product-1', quantity: 2 }],
  ...overrides,
});

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let orderRepository: MockProxy<IOrderRepository>;
  let unitOfWork: MockProxy<IOrderUnitOfWork>;
  let productRepository: MockProxy<IProductRepository>;
  let checkoutQueue: MockProxy<Queue>;
  let logger: MockProxy<AppLogger>;

  const requestId = 'test-request-id';
  const idempotencyKey = 'idempotency-key-123';

  beforeEach(() => {
    orderRepository = mock<IOrderRepository>();
    unitOfWork = mock<IOrderUnitOfWork>();
    productRepository = mock<IProductRepository>();
    checkoutQueue = mock<Queue>();
    logger = mock<AppLogger>();

    useCase = new CreateOrderUseCase(
      orderRepository,
      unitOfWork,
      productRepository,
      checkoutQueue,
      logger,
    );

    orderRepository.findByIdempotencyKey.mockResolvedValue(null);
    productRepository.findManyById.mockResolvedValue([makeProduct()]);
    checkoutQueue.add.mockResolvedValue({} as never);

    unitOfWork.run.mockImplementation(async (work) => {
      const ctx = mock<IOrderTransactionContext>();
      ctx.reserveStock.mockResolvedValue(true);
      ctx.createOrder.mockResolvedValue(makeOrder());
      return work(ctx);
    });
  });

  it('should create order and return it with PENDING status', async () => {
    const order = await useCase.execute(makeDto(), idempotencyKey, requestId);

    expect(order.status).toBe(OrderStatus.PENDING);
    expect(unitOfWork.run).toHaveBeenCalledOnce();
    expect(checkoutQueue.add).toHaveBeenCalledOnce();
  });

  it('should return existing order when idempotency key already exists', async () => {
    const existingOrder = makeOrder();
    orderRepository.findByIdempotencyKey.mockResolvedValue(existingOrder);

    const order = await useCase.execute(makeDto(), idempotencyKey, requestId);

    expect(order).toBe(existingOrder);
    expect(unitOfWork.run).not.toHaveBeenCalled();
    expect(checkoutQueue.add).not.toHaveBeenCalled();
  });

  it('should throw BadRequestException when idempotency key is missing', async () => {
    await expect(useCase.execute(makeDto(), '', requestId)).rejects.toThrow(
      new BadRequestException(ORDER_ERRORS.MISSING_IDEMPOTENCY_KEY),
    );
  });

  it('should throw NotFoundException when product is not found', async () => {
    productRepository.findManyById.mockResolvedValue([]);

    await expect(
      useCase.execute(makeDto(), idempotencyKey, requestId),
    ).rejects.toThrow(new NotFoundException(ORDER_ERRORS.PRODUCT_NOT_FOUND));
  });

  it('should throw UnprocessableEntityException when stock is insufficient', async () => {
    unitOfWork.run.mockImplementation(async (work) => {
      const ctx = mock<IOrderTransactionContext>();
      ctx.reserveStock.mockResolvedValue(false);
      return work(ctx);
    });

    await expect(
      useCase.execute(makeDto(), idempotencyKey, requestId),
    ).rejects.toThrow(
      new UnprocessableEntityException(ORDER_ERRORS.INSUFFICIENT_STOCK),
    );
  });

  it('should not publish to queue when stock is insufficient', async () => {
    unitOfWork.run.mockImplementation(async (work) => {
      const ctx = mock<IOrderTransactionContext>();
      ctx.reserveStock.mockResolvedValue(false);
      return work(ctx);
    });

    await expect(
      useCase.execute(makeDto(), idempotencyKey, requestId),
    ).rejects.toThrow();

    expect(checkoutQueue.add).not.toHaveBeenCalled();
  });

  it('should stop stock reservation at first out-of-stock item in a multi-item order', async () => {
    const dtoWithTwoItems = makeDto({
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 1 },
      ],
    });

    productRepository.findManyById.mockResolvedValue([
      makeProduct({ id: 'product-1' }),
      makeProduct({ id: 'product-2' }),
    ]);

    let reserveCallCount = 0;
    unitOfWork.run.mockImplementation(async (work) => {
      const ctx = mock<IOrderTransactionContext>();
      ctx.reserveStock.mockImplementation(async () => {
        reserveCallCount++;
        return reserveCallCount === 1 ? false : true;
      });
      return work(ctx);
    });

    await expect(
      useCase.execute(dtoWithTwoItems, idempotencyKey, requestId),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(reserveCallCount).toBe(1);
  });

  it('should calculate total correctly based on product prices and quantities', async () => {
    const dtoWithTwoItems = makeDto({
      items: [
        { productId: 'product-1', quantity: 2 },
        { productId: 'product-2', quantity: 3 },
      ],
    });

    productRepository.findManyById.mockResolvedValue([
      makeProduct({ id: 'product-1', price: new Decimal('10.00') }),
      makeProduct({ id: 'product-2', price: new Decimal('20.00') }),
    ]);

    let capturedTotal: Decimal | undefined;
    unitOfWork.run.mockImplementation(async (work) => {
      const ctx = mock<IOrderTransactionContext>();
      ctx.reserveStock.mockResolvedValue(true);
      ctx.createOrder.mockImplementation(async (data) => {
        capturedTotal = data.total;
        return makeOrder({ total: data.total });
      });
      return work(ctx);
    });

    await useCase.execute(dtoWithTwoItems, idempotencyKey, requestId);

    // 2 × 10.00 + 3 × 20.00 = 80.00
    expect(capturedTotal?.toString()).toBe('80');
  });

  it('should publish job to queue with orderId and requestId after creating order', async () => {
    const order = makeOrder();
    unitOfWork.run.mockImplementation(async (work) => {
      const ctx = mock<IOrderTransactionContext>();
      ctx.reserveStock.mockResolvedValue(true);
      ctx.createOrder.mockResolvedValue(order);
      return work(ctx);
    });

    await useCase.execute(makeDto(), idempotencyKey, requestId);

    expect(checkoutQueue.add).toHaveBeenCalledWith(
      'process-checkout',
      expect.objectContaining({ orderId: order.id, requestId }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('should not publish to queue when idempotency key already exists', async () => {
    orderRepository.findByIdempotencyKey.mockResolvedValue(makeOrder());

    await useCase.execute(makeDto(), idempotencyKey, requestId);

    expect(checkoutQueue.add).not.toHaveBeenCalled();
  });
});
