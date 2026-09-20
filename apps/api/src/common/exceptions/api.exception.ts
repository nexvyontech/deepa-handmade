import { HttpException, HttpStatus } from '@nestjs/common';
import { AppErrorCode, ERROR_CODES } from '../errors/error-codes.js';

export interface ApiErrorPayload {
  statusCode: number;
  code: AppErrorCode;
  message: string;
  details?: unknown;
}

export class ApiException extends HttpException {
  constructor(
    statusCode: number,
    code: AppErrorCode,
    message: string,
    details?: unknown,
  ) {
    const payload: ApiErrorPayload = {
      statusCode,
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    };
    super(payload, statusCode);
  }

  get code(): AppErrorCode {
    return (this.getResponse() as ApiErrorPayload).code;
  }

  get details(): unknown {
    return (this.getResponse() as ApiErrorPayload).details;
  }

  static badRequest(message = 'Bad request', details?: unknown): ApiException {
    return new ApiException(HttpStatus.BAD_REQUEST, ERROR_CODES.BAD_REQUEST, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found', details?: unknown): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, ERROR_CODES.ENTITY_NOT_FOUND, message, details);
  }

  static conflict(message = 'Conflict', details?: unknown): ApiException {
    return new ApiException(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, message, details);
  }
}