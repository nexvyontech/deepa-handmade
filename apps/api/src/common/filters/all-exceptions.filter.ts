import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import type { AppConfig, LogFormat } from '../../config/configuration.js';
import { defaultErrorCodeForStatus, ERROR_CODES } from '../errors/error-codes.js';
import { ApiException, ApiErrorPayload } from '../exceptions/api.exception.js';
import { StructuredLogger } from '../logging/structured-logger.js';

interface ErrorBodyOptions {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: StructuredLogger;

  constructor(format: LogFormat, private readonly env: AppConfig['env']) {
    this.logger = new StructuredLogger('ExceptionsFilter', format);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string; url: string; method: string }>();
    const requestId = request?.requestId;

    const { statusCode, code, message, details, stack } = this.resolveException(exception);

    if (stack && this.env !== 'production') {
      this.logger.debug('Unhandled exception stack', { requestId, code, stack });
    }

    const body: ErrorBodyOptions = {
      statusCode,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(requestId ? { requestId } : {}),
      path: request?.originalUrl ?? request?.url ?? '',
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  } {
    if (exception instanceof ApiException) {
      const payload = exception.getResponse() as ApiErrorPayload;
      return {
        statusCode: payload.statusCode,
        code: payload.code,
        message: payload.message,
        details: payload.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return {
          statusCode,
          code: defaultErrorCodeForStatus(statusCode),
          message: payload,
        };
      }
      const raw = payload as { message?: string | string[]; code?: string; details?: unknown };
      const message = Array.isArray(raw.message)
        ? raw.message.join('; ')
        : raw.message ?? 'Request failed';
      return {
        statusCode,
        code: raw.code ?? defaultErrorCodeForStatus(statusCode),
        message,
        details: raw.details,
      };
    }

    const error = exception instanceof Error ? exception : new Error(String(exception));
    this.logger.error(
      error.message || 'Unhandled exception',
      {},
      this.env === 'production' ? undefined : error.stack,
    );

    if (this.env === 'production') {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: error.message || 'Internal server error',
      stack: error.stack,
    };
  }
}