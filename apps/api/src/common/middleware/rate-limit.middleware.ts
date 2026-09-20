import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import type { LogFormat } from '../../config/configuration.js';
import { ERROR_CODES } from '../errors/error-codes.js';
import { StructuredLogger } from '../logging/structured-logger.js';

interface SlidingWindow {
  timestamps: number[];
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windows = new Map<string, SlidingWindow>();
  private readonly logger: StructuredLogger;

  constructor(private readonly config: ConfigService) {
    this.logger = new StructuredLogger('RateLimit', this.config.get<LogFormat>('logging.format')!);
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.path ?? req.url;
    if (path.includes('/health') || path.startsWith('/api/docs')) {
      next();
      return;
    }

    const ttlMs = this.config.get('throttle.ttl') * 1000;
    const limit = this.config.get('throttle.limit');
    const now = Date.now();

    const key = this.clientKey(req);
    const window = this.windows.get(key) ?? { timestamps: [] };
    window.timestamps = window.timestamps.filter((t) => now - t < ttlMs);

    if (window.timestamps.length >= limit) {
      res.setHeader('Retry-After', String(this.config.get('throttle.ttl')));
      const requestId = (req as Request & { requestId?: string }).requestId;
      res.status(429).json({
        statusCode: 429,
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests, please retry later.',
        ...(requestId ? { requestId } : {}),
        path: req.originalUrl ?? req.url,
        timestamp: new Date().toISOString(),
      });
      this.logger.warn('rate limit exceeded', { requestId, path, key });
      return;
    }

    window.timestamps.push(now);
    this.windows.set(key, window);
    next();
  }

  private clientKey(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim()) ??
      req.ip ??
      'unknown';
    return `${ip}:${req.baseUrl ?? ''}`;
  }
}