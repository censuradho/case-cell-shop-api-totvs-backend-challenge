import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/database/prisma.service';
import type { IOrderRepository } from '../../domain/ports/order.repository';
import type { Order } from '../../domain/order.entity';
import type { OrderStatus } from '../../domain/order-status.enum';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { idempotencyKey: key },
      include: { items: true },
    });
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
