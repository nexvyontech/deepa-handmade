import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = _context.switchToHttp();
    const request = ctx.getRequest<{ method: string; url: string }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = ctx.getResponse<{ statusCode: number }>();
        this.logger.log(
          `${request.method} ${request.url} ${response.statusCode} ${Date.now() - startedAt}ms`,
        );
      }),
    );
  }
}