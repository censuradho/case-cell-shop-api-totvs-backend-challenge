import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { FastifyAdapter as BullBoardFastifyAdapter } from '@bull-board/fastify';
import { getQueueToken } from '@nestjs/bullmq';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Queue } from 'bullmq';
import { CHECKOUT_QUEUE } from '@/modules/orders/orders.constants';

const BULL_BOARD_PATH = '/admin/queues';

export async function setupBullBoard(
  app: NestFastifyApplication,
): Promise<void> {
  const adapter = new BullBoardFastifyAdapter();

  createBullBoard({
    queues: [new BullMQAdapter(app.get<Queue>(getQueueToken(CHECKOUT_QUEUE)))],
    serverAdapter: adapter,
  });

  adapter.setBasePath(BULL_BOARD_PATH);

  await app
    .getHttpAdapter()
    .getInstance()
    .register(adapter.registerPlugin(), { prefix: BULL_BOARD_PATH });
}
