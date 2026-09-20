import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '../errors/error-codes.js';
import { ApiException } from './api.exception.js';

export interface ValidationErrorDetail {
  constraints: Record<string, string>;
  value?: unknown;
}

export type ValidationDetails = Record<string, ValidationErrorDetail>;

export class ValidationException extends ApiException {
  constructor(details: ValidationDetails) {
    super(
      HttpStatus.UNPROCESSABLE_ENTITY,
      ERROR_CODES.VALIDATION_FAILED,
      'Validation failed',
      details,
    );
  }
}