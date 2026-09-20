import { validateEnv } from './env.validation.js';

const base: Record<string, unknown> = {
  NODE_ENV: 'development',
  PORT: '3001',
  THROTTLE_TTL: '60',
  THROTTLE_LIMIT: '120',
  HEALTH_MEMORY_HEAP_MB: '512',
  SHUTDOWN_TIMEOUT_MS: '10000',
  TRUST_PROXY: 'false',
  SWAGGER_ENABLED: 'true',
};

describe('validateEnv', () => {
  it('accepts a valid development environment', () => {
    expect(() => validateEnv(base)).not.toThrow();
  });

  it('rejects a production env when required keys are missing', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(
      /Missing required environment variable/,
    );
  });

  it('rejects invalid NODE_ENV', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'prod' })).toThrow(/Invalid NODE_ENV/);
  });

  it('rejects invalid numeric values', () => {
    expect(() => validateEnv({ ...base, PORT: 'abc' })).toThrow(/Invalid numeric value for PORT/);
  });

  it('rejects invalid boolean values', () => {
    expect(() => validateEnv({ ...base, SWAGGER_ENABLED: 'maybe' })).toThrow(
      /Invalid boolean value for SWAGGER_ENABLED/,
    );
  });

  it('rejects invalid LOG_FORMAT', () => {
    expect(() => validateEnv({ ...base, LOG_FORMAT: 'xml' })).toThrow(
      /Invalid LOG_FORMAT/,
    );
  });

  it('requires secrets and origins in production', () => {
    expect(() =>
      validateEnv({ ...base, NODE_ENV: 'production', CORS_ORIGINS: 'http://x.example' }),
    ).toThrow(/MISSING_REQUIRED_|Missing required/);
  });

  it('rejects a wildcard CORS origin in production', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGINS: '*',
        MONGODB_URI: 'mongodb://localhost:27017/deepa',
        JWT_ACCESS_SECRET: 'a',
        JWT_REFRESH_SECRET: 'b',
      }),
    ).toThrow(/wildcard/);
  });

  it('accepts a complete production environment', () => {
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        CORS_ORIGINS: 'https://shop.example.com',
        MONGODB_URI: 'mongodb://localhost:27017/deepa',
        JWT_ACCESS_SECRET: 'secret-a',
        JWT_REFRESH_SECRET: 'secret-b',
      }),
    ).not.toThrow();
  });
});