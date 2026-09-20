import { jest } from '@jest/globals';
import { Connection } from 'mongoose';
import { DatabaseLifecycleService } from './database-lifecycle.service.js';

describe('DatabaseLifecycleService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is a no-op when MongoDB is not configured', async () => {
    const service = new DatabaseLifecycleService(undefined);

    expect(() => service.onModuleInit()).not.toThrow();
    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('registers connection lifecycle listeners', () => {
    const on = jest.fn();
    const connection = { on } as unknown as Connection;
    const service = new DatabaseLifecycleService(connection);

    service.onModuleInit();

    expect(on).toHaveBeenCalledWith('connected', expect.any(Function));
    expect(on).toHaveBeenCalledWith('reconnected', expect.any(Function));
    expect(on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    expect(on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('closes the connection on module destroy', async () => {
    const on = jest.fn();
    const close = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const connection = { on, close } as unknown as Connection;
    const service = new DatabaseLifecycleService(connection);

    service.onModuleInit();
    await service.onModuleDestroy();

    expect(close).toHaveBeenCalledTimes(1);
  });
});