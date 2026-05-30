import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AppLogger } from '@/shared/observability/app-logger.service';
import {
  ORDER_REPOSITORY,
  type IOrderRepository,
} from '../../domain/ports/order.repository';
import { OrderStatus } from '../../domain/order-status.enum';
import { CHECKOUT_QUEUE } from '../../orders.constants';

interface CheckoutJobData {
  orderId: string;
  requestId: string;
}

@Processor(CHECKOUT_QUEUE)
export class CheckoutProcessor extends WorkerHost {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: IOrderRepository,
    private readonly logger: AppLogger,
  ) {
    super();
  }

  async process(job: Job<CheckoutJobData>): Promise<void> {
    const { orderId, requestId } = job.data;
    const startTime = Date.now();

    this.logger.log({
      requestId,
      orderId,
      attemptsMade: job.attemptsMade,
      message: 'Job received — starting checkout processing',
      context: 'CheckoutProcessor',
    });

    await this.orderRepository.updateStatus(orderId, OrderStatus.PROCESSING);

    this.logger.log({
      requestId,
      orderId,
      message: 'Simulating ERP dispatch',
      context: 'CheckoutProcessor',
    });

    await this.simulateErpCall();

    await this.orderRepository.updateStatus(orderId, OrderStatus.COMPLETED);

    this.logger.metric({
      metric: 'queue.job.success',
      requestId,
      orderId,
      durationMs: Date.now() - startTime,
      context: 'CheckoutProcessor',
    });
  }

  async onFailed(
    job: Job<CheckoutJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job) return;

    const { orderId, requestId } = job.data;

    await this.orderRepository.updateStatus(orderId, OrderStatus.FAILED);

    this.logger.metric({
      metric: 'queue.job.failure',
      requestId,
      orderId,
      error: error.message,
      attemptsMade: job.attemptsMade,
      context: 'CheckoutProcessor',
    });
  }

  private simulateErpCall(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 800));
  }
}
