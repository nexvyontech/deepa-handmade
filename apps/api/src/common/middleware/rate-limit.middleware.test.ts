import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { RateLimitMiddleware } from './rate-limit.middleware.js';

describe('RateLimitMiddleware', () => {
  let middleware: RateLimitMiddleware;

  const makeConfig = (ttl = 60, limit = 2): ConfigService =>
    ({
      get: (key: string) => {
        if (key === 'throttle.ttl') return ttl;
        if (key === 'throttle.limit') return limit;
        if (key === 'logging.format') return 'pretty';
        return undefined;
      },
    }) as unknown as ConfigService;

  const makeReq = (path: string, ip = '1.2.3.4'): Request =>
    ({
      path,
      originalUrl: path,
      ip,
      headers: {},
    }) as unknown as Request;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips health and swagger endpoints', () => {
    middleware = new RateLimitMiddleware(makeConfig());
    for (const path of ['/api/v1/health', '/api/v1/health?x=1', '/api/docs']) {
      const next: NextFunction = jest.fn();
      middleware.use(makeReq(path), {} as Response, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('allows requests under the limit', () => {
    middleware = new RateLimitMiddleware(makeConfig(60, 2));
    const next: NextFunction = jest.fn();

    middleware.use(makeReq('/api/v1/orders'), {} as Response, next);
    middleware.use(makeReq('/api/v1/orders'), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('rejects requests above the limit with a standard response', () => {
    middleware = new RateLimitMiddleware(makeConfig(60, 2));
    const next: NextFunction = jest.fn();
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    middleware.use(makeReq('/api/v1/orders'), res, next);
    middleware.use(makeReq('/api/v1/orders'), res, next);
    middleware.use(makeReq('/api/v1/orders'), res, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 429, code: 'RATE_LIMITED' }),
    );
  });

  it('keys windows per client ip', () => {
    middleware = new RateLimitMiddleware(makeConfig(60, 1));
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    middleware.use(makeReq('/api/v1/orders', '1.1.1.1'), {} as Response, jest.fn());
    const next = jest.fn();
    middleware.use(makeReq('/api/v1/orders', '2.2.2.2'), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.json).not.toHaveBeenCalled();
  });
});