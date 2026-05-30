import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AppLogger } from './app-logger.service';
import type { RequestWithId } from './request-id.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    const requestId = (request.raw as RequestWithId).requestId ?? 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log({
          requestId,
          message: `${request.method} ${request.url}`,
          context: 'HTTP',
          statusCode: reply.statusCode,
          durationMs: Date.now() - startTime,
        });
      }),
    );
  }
}
