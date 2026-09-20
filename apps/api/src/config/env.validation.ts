import { AppEnv, LogFormat } from './configuration.js';

const NUMERIC_KEYS = [
  'PORT',
  'THROTTLE_TTL',
  'THROTTLE_LIMIT',
  'HEALTH_MEMORY_HEAP_MB',
  'SHUTDOWN_TIMEOUT_MS',
] as const;

const BOOLEAN_KEYS = ['TRUST_PROXY', 'SWAGGER_ENABLED'] as const;

function isValidEnv(value: unknown): value is AppEnv {
  return ['development', 'test', 'staging', 'production'].includes(String(value));
}

function isValidLogFormat(value: unknown): value is LogFormat {
  return ['pretty', 'json'].includes(String(value));
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const env = config.NODE_ENV ?? 'development';

  if (!isValidEnv(env)) {
    throw new Error(
      `Invalid NODE_ENV "${String(env)}". Allowed: development, test, staging, production.`,
    );
  }

  for (const key of NUMERIC_KEYS) {
    const value = config[key];
    if (value !== undefined && value !== '' && Number.isNaN(Number(value))) {
      throw new Error(`Invalid numeric value for ${key}: "${String(value)}".`);
    }
  }

  for (const key of BOOLEAN_KEYS) {
    const value = config[key];
    if (value !== undefined && value !== '') {
      const normalized = String(value).toLowerCase();
      if (!['1', '0', 'true', 'false', 'yes', 'no', 'on', 'off'].includes(normalized)) {
        throw new Error(`Invalid boolean value for ${key}: "${String(value)}".`);
      }
    }
  }

  if (config.LOG_FORMAT !== undefined && config.LOG_FORMAT !== '') {
    if (!isValidLogFormat(config.LOG_FORMAT)) {
      throw new Error(`Invalid LOG_FORMAT "${String(config.LOG_FORMAT)}". Allowed: pretty, json.`);
    }
  }

  if (env === 'production') {
    const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CORS_ORIGINS'];
    for (const key of required) {
      const value = String(config[key] ?? '').trim();
      if (!value) {
        throw new Error(`Missing required environment variable "${key}" in production.`);
      }
    }
    if (String(config.CORS_ORIGINS).split(',').some((o) => o.trim() === '*')) {
      throw new Error('CORS_ORIGINS must not contain wildcard "*" in production.');
    }
  }

  return config;
}