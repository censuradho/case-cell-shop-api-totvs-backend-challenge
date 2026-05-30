import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../domain/order-status.enum';
import type { Order } from '../../domain/order.entity';

class OrderItemResponseDto {
  @ApiProperty({ example: 'item-1' })
  declare id: string;

  @ApiProperty({ example: 'abc123' })
  declare productId: string;

  @ApiProperty({ example: 2 })
  declare quantity: number;

  @ApiProperty({ example: '29.90' })
  declare unitPrice: string;
}

export class OrderStatusResponseDto {
  @ApiProperty({ example: 'xyz789', description: 'ID do pedido' })
  declare id: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  declare status: OrderStatus;

  @ApiProperty({ example: '59.80', description: 'Valor total do pedido' })
  declare total: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  declare items: OrderItemResponseDto[];

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  declare createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  declare updatedAt: Date;

  static fromEntity(order: Order): OrderStatusResponseDto {
    const dto = new OrderStatusResponseDto();
    dto.id = order.id;
    dto.status = order.status as OrderStatus;
    dto.total = order.total.toString();
    dto.items = order.items.map((item) => {
      const itemDto = new OrderItemResponseDto();
      itemDto.id = item.id;
      itemDto.productId = item.productId;
      itemDto.quantity = item.quantity;
      itemDto.unitPrice = item.unitPrice.toString();
      return itemDto;
    });
    dto.createdAt = order.createdAt;
    dto.updatedAt = order.updatedAt;
    return dto;
  }
}
