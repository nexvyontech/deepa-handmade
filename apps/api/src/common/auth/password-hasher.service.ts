import { Inject, Injectable, Optional } from '@nestjs/common';
import * as argon2 from 'argon2';

/** Injection token so tests/deployments can swap the argon2 cost parameters. */
export const PASSWORD_HASHER_OPTIONS = 'PASSWORD_HASHER_OPTIONS';

/**
 * Wraps argon2id password hashing/verification.
 *
 * Phase 4 uses argon2id with the OWASP-recommended parameter baseline
 * (memoryCost=64MiB || 65536 KiB, timeCost=3, parallelism=1). Salt generation
 * is left to argon2's default 16 random bytes. Values are injectable so tests
 * can run with a cheaper parameter budget.
 */
@Injectable()
export class PasswordHasherService {
  constructor(
    @Optional()
    @Inject(PASSWORD_HASHER_OPTIONS)
    private readonly options: PasswordHasherOptions = DEFAULT_OPTIONS,
  ) {}

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, {
      type: argon2.argon2id,
      memoryCost: this.options.memoryCost,
      timeCost: this.options.timeCost,
      parallelism: this.options.parallelism,
    });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}

export interface PasswordHasherOptions {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

export const DEFAULT_OPTIONS: PasswordHasherOptions = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
};
