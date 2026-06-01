import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Decimal } from '@prisma/client/runtime/client';
import type { Cache } from 'cache-manager';
import { nanoid } from 'nanoid';
import { IOrderRepository } from '../../domain/ports/order.repository';
import { IOrderUnitOfWork } from '../../domain/ports/order.unit-of-work';
import { IProductRepository } from '@/modules/products/domain/ports/product.repository';
import { AppLogger } from '@/shared/observability/app-logger.service';
import { ORDER_ERRORS } from '../../domain/errors/order.errors';
import { CHECKOUT_QUEUE } from '../../orders.constants';
import type { CreateOrderDto } from '../dtos/create-order.dto';
import type { Order } from '../../domain/order.entity';

@Injectable()
export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly unitOfWork: IOrderUnitOfWork,
    private readonly productRepository: IProductRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectQueue(CHECKOUT_QUEUE) private readonly checkoutQueue: Queue,
    private readonly logger: AppLogger,
  ) {}

  async execute(
    dto: CreateOrderDto,
    idempotencyKey: string,
    requestId: string,
  ): Promise<Order> {
    if (!idempotencyKey) {
      throw new BadRequestException(ORDER_ERRORS.MISSING_IDEMPOTENCY_KEY);
    }

    const existingOrder =
      await this.orderRepository.findByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      this.logger.log({
        requestId,
        orderId: existingOrder.id,
        message: 'Idempotência — retornando pedido existente',
        context: 'CreateOrderUseCase',
      });
      return existingOrder;
    }

    const productIds = dto.items.map((item) => item.productId);

    const foundProducts = await this.productRepository.findManyById(productIds);

    const productMap = new Map(
      foundProducts.map((product) => [product.id, product]),
    );

    productIds.forEach((productId) => {
      if (!productMap.has(productId)) {
        throw new NotFoundException(ORDER_ERRORS.PRODUCT_NOT_FOUND);
      }
    });

    const total = dto.items.reduce((sum, item) => {
      const price = productMap.get(item.productId)!.price as Decimal;
      return sum.add(price.mul(item.quantity));
    }, new Decimal(0));

    const orderId = nanoid();

    const order = await this.unitOfWork.run(async (ctx) => {
      for (const item of dto.items) {
        const reserved = await ctx.reserveStock(item.productId, item.quantity);
        if (!reserved) {
          this.logger.log({
            requestId,
            productId: item.productId,
            quantity: item.quantity,
            message: 'Estoque insuficiente',
            context: 'CreateOrderUseCase',
          });
          throw new UnprocessableEntityException(
            ORDER_ERRORS.INSUFFICIENT_STOCK,
          );
        }
      }

      return ctx.createOrder({
        id: orderId,
        idempotencyKey,
        total,
        items: dto.items.map((item) => ({
          id: nanoid(),
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: productMap.get(item.productId)!.price as Decimal,
        })),
      });
    });

    await this.invalidateProductCache(productIds, requestId);

    await this.checkoutQueue.add(
      'process-checkout',
      { orderId: order.id, requestId },
      {
        jobId: order.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    this.logger.log({
      requestId,
      orderId: order.id,
      message: 'Pedido criado e publicado na fila',
      context: 'CreateOrderUseCase',
    });

    return order;
  }

  private async invalidateProductCache(
    productIds: string[],
    requestId: string,
  ): Promise<void> {
    const keys = ['products:all', ...productIds.map((id) => `products:${id}`)];

    await Promise.all(keys.map((key) => this.cacheManager.del(key)));

    this.logger.log({
      requestId,
      message: `Cache invalidado para ${keys.length} chaves após reserva de estoque`,
      context: 'CreateOrderUseCase',
    });
  }
}
