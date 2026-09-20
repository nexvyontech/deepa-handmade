export type AppEnv = 'development' | 'test' | 'staging' | 'production';
export type LogFormat = 'pretty' | 'json';

export interface MongoConfig {
  uri?: string;
}

export interface JwtConfig {
  accessSecret?: string;
  accessExpiresIn: string;
  refreshSecret?: string;
  refreshExpiresIn: string;
}

export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

export interface SwaggerConfig {
  path: string;
  enabled: boolean;
  title: string;
  description: string;
  version: string;
}

export interface HealthConfig {
  memoryHeapMb: number;
  diskPath: string;
}

export interface LoggingConfig {
  format: LogFormat;
}

export interface RequestConfig {
  requestIdHeader: string;
}

export interface ShutdownConfig {
  timeoutMs: number;
}

export interface ApiConfig {
  prefix: string;
}

export interface AppConfig {
  env: AppEnv;
  name: string;
  port: number;
  trustProxy: boolean;
  bodyLimit: string;
  corsOrigins: string[];
  api: ApiConfig;
  mongo: MongoConfig;
  jwt: JwtConfig;
  throttle: ThrottleConfig;
  swagger: SwaggerConfig;
  health: HealthConfig;
  logging: LoggingConfig;
  request: RequestConfig;
  shutdown: ShutdownConfig;
}

function toInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function toStringList(value: string | undefined, fallback: string[]): string[] {
  if (value === undefined || value.trim() === '') return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function secret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export default (): AppConfig => {
  const runtimeEnv = (process.env.NODE_ENV ?? 'development') as AppEnv;

  return {
    env: runtimeEnv,
    name: 'deepa-handmade-api',
    port: toInt(process.env.PORT, 3001),
    trustProxy: toBool(process.env.TRUST_PROXY, runtimeEnv === 'production'),
    bodyLimit: process.env.REQUEST_BODY_LIMIT || '1mb',
    corsOrigins: toStringList(process.env.CORS_ORIGINS, ['http://localhost:3000']),
    api: {
      prefix: 'api',
    },
    mongo: {
      uri: secret(process.env.MONGODB_URI),
    },
    jwt: {
      accessSecret: secret(process.env.JWT_ACCESS_SECRET),
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
      refreshSecret: secret(process.env.JWT_REFRESH_SECRET),
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    throttle: {
      ttl: toInt(process.env.THROTTLE_TTL, 60),
      limit: toInt(process.env.THROTTLE_LIMIT, 120),
    },
    swagger: {
      path: process.env.SWAGGER_PATH || 'api/docs',
      enabled: toBool(process.env.SWAGGER_ENABLED, true),
      title: 'Deepa Handmade API',
      description: 'REST API for the Deepa Handmade e-commerce platform.',
      version: '1.0',
    },
    health: {
      memoryHeapMb: toInt(process.env.HEALTH_MEMORY_HEAP_MB, 512),
      diskPath: process.env.HEALTH_DISK_PATH || '.',
    },
    logging: {
      format: (process.env.LOG_FORMAT ||
        (runtimeEnv === 'production' ? 'json' : 'pretty')) as LogFormat,
    },
    request: {
      requestIdHeader: (process.env.REQUEST_ID_HEADER || 'x-request-id').toLowerCase(),
    },
    shutdown: {
      timeoutMs: toInt(process.env.SHUTDOWN_TIMEOUT_MS, 10000),
    },
  };
};