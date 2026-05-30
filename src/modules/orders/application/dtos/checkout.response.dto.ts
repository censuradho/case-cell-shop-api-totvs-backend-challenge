import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../domain/order-status.enum';
import type { Order } from '../../domain/order.entity';

export class CheckoutResponseDto {
  @ApiProperty({ example: 'xyz789', description: 'ID do pedido criado' })
  declare orderId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  declare status: OrderStatus;

  static fromEntity(order: Order): CheckoutResponseDto {
    const dto = new CheckoutResponseDto();
    dto.orderId = order.id;
    dto.status = order.status as OrderStatus;
    return dto;
  }
}
