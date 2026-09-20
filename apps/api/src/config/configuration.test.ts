import configuration from './configuration.js';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('configuration', () => {
  it('applies local development defaults', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PORT;

    const config = configuration();

    expect(config.env).toBe('development');
    expect(config.name).toBe('deepa-handmade-api');
    expect(config.port).toBe(3001);
    expect(config.api.prefix).toBe('api');
    expect(config.corsOrigins).toEqual(['http://localhost:3000']);
    expect(config.logging.format).toBe('pretty');
    expect(config.request.requestIdHeader).toBe('x-request-id');
    expect(config.jwt.accessExpiresIn).toBe('15m');
    expect(config.shutdown.timeoutMs).toBe(10000);
  });

  it('defaults to structured logging in production', () => {
    process.env.NODE_ENV = 'production';

    expect(configuration().logging.format).toBe('json');
  });

  it('parses comma-separated CORS origins', () => {
    process.env.CORS_ORIGINS = ' https://shop.example.com , http://localhost:3000 ';

    expect(configuration().corsOrigins).toEqual([
      'https://shop.example.com',
      'http://localhost:3000',
    ]);
  });

  it('parses PORT and trust proxy flag', () => {
    process.env.PORT = '4000';
    process.env.TRUST_PROXY = 'true';

    const config = configuration();
    expect(config.port).toBe(4000);
    expect(config.trustProxy).toBe(true);
  });

  it('falls back to default on invalid numbers', () => {
    process.env.PORT = 'not-a-number';

    expect(configuration().port).toBe(3001);
  });
});