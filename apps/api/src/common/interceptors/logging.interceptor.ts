import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { type LogFormat } from '../../config/configuration.js';
import { defaultErrorCodeForStatus } from '../errors/error-codes.js';
import { StructuredLogger, type StructuredFields } from '../logging/structured-logger.js';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: StructuredLogger;

  constructor(format: LogFormat) {
    this.logger = new StructuredLogger('HTTP', format);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<{ method: string; url: string; requestId?: string }>();
    const startedAt = Date.now();
    const base: StructuredFields = {
      method: request.method,
      path: request.url,
      requestId: request.requestId,
    };

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse<{ statusCode: number }>();
        this.logger.log('request completed', {
          ...base,
          status: response.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((exception: unknown) => {
        const status = exception instanceof HttpException ? exception.getStatus() : 500;
        this.logger.error('request failed', {
          ...base,
          status,
          code: defaultErrorCodeForStatus(status),
          durationMs: Date.now() - startedAt,
        });
        return throwError(() => exception);
      }),
    );
  }
}