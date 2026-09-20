import { ArgumentMetadata } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { createAppValidationPipe } from './validation.pipe.js';
import { ValidationException } from '../exceptions/validation.exception.js';
import { ERROR_CODES } from '../errors/error-codes.js';

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;
}

const BODY_METADATA: ArgumentMetadata = { type: 'body', metatype: CreateUserDto, data: '' };

describe('createAppValidationPipe', () => {
  const pipe = createAppValidationPipe();

  it('transforms and whitelists a valid payload', async () => {
    const result = await pipe.transform(
      { email: 'user@example.com', name: 'Ada' },
      BODY_METADATA,
    );

    expect(result).toEqual({ email: 'user@example.com', name: 'Ada' });
  });

  it('forbids unknown properties', async () => {
    await expect(
      pipe.transform({ email: 'user@example.com', name: 'Ada', hack: true }, BODY_METADATA),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('throws a structured ValidationException with details', async () => {
    try {
      await pipe.transform({ email: 'not-an-email', name: 'x' }, BODY_METADATA);
      throw new Error('expected a validation failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationException);
      const validation = error as ValidationException;
      expect(validation.code).toBe(ERROR_CODES.VALIDATION_FAILED);
      expect(validation.getStatus()).toBe(422);
      const details = validation.details as Record<string, { constraints: Record<string, string> }>;
      expect(details.email.constraints.isEmail).toBeDefined();
      expect(details.name.constraints.minLength).toBeDefined();
    }
  });
});