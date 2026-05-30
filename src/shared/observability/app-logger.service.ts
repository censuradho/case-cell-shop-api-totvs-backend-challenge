import { Injectable, Logger } from '@nestjs/common';

export interface LogPayload {
  requestId: string;
  orderId?: string;
  message: string;
  context: string;
  [key: string]: unknown;
}

export interface ErrorPayload extends LogPayload {
  error: string;
}

export interface MetricPayload {
  metric: string;
  requestId?: string;
  orderId?: string;
  context: string;
  [key: string]: unknown;
}

@Injectable()
export class AppLogger {
  private readonly logger = new Logger('App');

  log(payload: LogPayload): void {
    this.logger.log(payload);
  }

  error(payload: ErrorPayload): void {
    this.logger.error(payload);
  }

  metric(payload: MetricPayload): void {
    this.logger.log({ ...payload, type: 'metric' });
  }
}
