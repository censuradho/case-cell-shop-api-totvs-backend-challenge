import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RequestWithId } from './request-id.middleware';

export const RequestId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    return (request.raw as RequestWithId).requestId ?? 'unknown';
  },
);
