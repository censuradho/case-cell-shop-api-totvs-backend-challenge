import { Injectable, NestMiddleware } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { IncomingMessage, ServerResponse } from 'http';

export type RequestWithId = IncomingMessage & { requestId: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: ServerResponse, next: () => void): void {
    req.requestId = nanoid();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  }
}
