import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service.js';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly config: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const header = this.config.get('request.requestIdHeader');
    const incoming = req.headers[header];
    const value = Array.isArray(incoming) ? incoming[0] : incoming;
    const requestId = this.requestContext.createRequestId(value);

    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader(header, requestId);

    this.requestContext.run({ requestId }, () => next());
  }
}