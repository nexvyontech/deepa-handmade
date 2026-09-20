import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

interface SlidingWindow {
  timestamps: number[];
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly windows = new Map<string, SlidingWindow>();

  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path.includes('/health')) {
      next();
      return;
    }

    const ttlMs = this.config.get<number>('throttle.ttl', 60) * 1000;
    const limit = this.config.get<number>('throttle.limit', 120);
    const now = Date.now();

    const forwarded = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0].trim()) ??
      req.ip ??
      'unknown';

    const window = this.windows.get(clientIp) ?? { timestamps: [] };
    window.timestamps = window.timestamps.filter((t) => now - t < ttlMs);

    if (window.timestamps.length >= limit) {
      res.status(429).json({
        statusCode: 429,
        timestamp: new Date().toISOString(),
        path: req.url,
        message: 'Too many requests',
      });
      return;
    }

    window.timestamps.push(now);
    this.windows.set(clientIp, window);
    next();
  }
}