import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { RequestContextService } from '../context/request-context.service.js';
import { RequestIdMiddleware } from './request-id.middleware.js';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let config: { get: jest.Mock<(key: string) => string | undefined> };

  beforeEach(() => {
    config = {
      get: jest.fn<(key: string) => string | undefined>().mockImplementation(
        (key: string) => (key === 'request.requestIdHeader' ? 'x-request-id' : undefined),
      ),
    };
    middleware = new RequestIdMiddleware(
      new RequestContextService(),
      config as unknown as ConfigService,
    );
  });

  it('generates a request id and writes the response header', () => {
    const req = { headers: {} } as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
    expect((req as Request & { requestId: string }).requestId).toBeTruthy();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('re-uses an incoming request id for correlation', () => {
    const req = { headers: { 'x-request-id': 'client-abc' } } as unknown as Request;
    const res = { setHeader: jest.fn() } as unknown as Response;
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'client-abc');
  });
});