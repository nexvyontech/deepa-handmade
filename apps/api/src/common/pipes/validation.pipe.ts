import { ValidationError, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ValidationDetails, ValidationException } from '../exceptions/validation.exception.js';

function toDetails(errors: ValidationError[]): ValidationDetails {
  const details: ValidationDetails = {};

  const visit = (error: ValidationError, prefix: string): void => {
    const path = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      details[path] = {
        constraints: { ...error.constraints },
        value: error.value,
      };
    }
    for (const child of error.children ?? []) {
      visit(child, path);
    }
  };

  for (const error of errors) {
    visit(error, '');
  }
  return details;
}

export function appValidationPipeOptions(): ValidationPipeOptions {
  return {
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    dismissDefaultMessages: false,
    exceptionFactory: (errors: ValidationError[]) => new ValidationException(toDetails(errors)),
  };
}

export function createAppValidationPipe(): ValidationPipe {
  return new ValidationPipe(appValidationPipeOptions());
}