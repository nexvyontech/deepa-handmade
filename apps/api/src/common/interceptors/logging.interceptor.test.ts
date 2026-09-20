import { jest } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor.js';

describe('LoggingInterceptor', () => {
  const request = { method: 'GET', url: '/api/v1/health', requestId: 'req-1' };
  const response = { statusCode: 200 };

  const context = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs successful requests with status and duration', (done) => {
    const interceptor = new LoggingInterceptor('json');
    interceptor.intercept(context(), { handle: () => of({ data: true }) }).subscribe({
      complete: () => {
        const emitted = (console.log as jest.Mock).mock.calls.map((c) => c[0]).join('\n');
        expect(emitted).toContain('"message":"request completed"');
        expect(emitted).toContain('"status":200');
        expect(emitted).toContain('"requestId":"req-1"');
        expect(emitted).toContain('"method":"GET"');
        done();
      },
    });
  });

  it('logs failed requests with an app error code', (done) => {
    const interceptor = new LoggingInterceptor('pretty');
    interceptor.intercept(context(), { handle: () => throwError(() => new BadRequestException('nope')) })
      .subscribe({
        error: () => {
          const emitted = (console.log as jest.Mock).mock.calls.map((c) => c[0]).join('\n');
          expect(emitted).toContain('request failed');
          expect(emitted).toContain('code=BAD_REQUEST');
          expect(emitted).toContain('status=400');
          done();
        },
      });
  });
});