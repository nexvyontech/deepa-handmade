export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = String(config.NODE_ENV ?? 'development');
  if (!['development', 'test', 'staging', 'production'].includes(env)) {
    throw new Error(
      `Invalid NODE_ENV "${env}". Allowed: development, test, staging, production.`,
    );
  }

  for (const key of ['PORT', 'THROTTLE_TTL', 'THROTTLE_LIMIT', 'HEALTH_MEMORY_HEAP_MB']) {
    const value = config[key];
    if (value !== undefined && value !== '' && Number.isNaN(Number(value))) {
      throw new Error(`Invalid numeric value for ${key}: "${value}".`);
    }
  }

  return config;
}