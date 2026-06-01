import { Injectable, NotFoundException } from '@nestjs/common';
import { IOrderRepository } from '../../domain/ports/order.repository';
import { AppLogger } from '@/shared/observability/app-logger.service';
import { ORDER_ERRORS } from '../../domain/errors/order.errors';
import type { Order } from '../../domain/order.entity';

@Injectable()
export class GetOrderStatusQuery {
  constructor(
    private readonly orderRepository: IOrderRepository,
    private readonly logger: AppLogger,
  ) {}

  async execute(orderId: string, requestId: string): Promise<Order> {
    const order = await this.orderRepository.findById(orderId);

    if (!order) {
      this.logger.log({
        requestId,
        orderId,
        message: 'Pedido não encontrado',
        context: 'GetOrderStatusQuery',
      });
      throw new NotFoundException(ORDER_ERRORS.ORDER_NOT_FOUND);
    }

    return order;
  }
}
