import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider } from '../../config/configuration.js';
import { LocalStorageService } from './local-storage.service.js';
import { R2StorageService } from './r2-storage.service.js';
import { StorageService } from './storage.service.js';

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

/**
 * Provides the storage backend selected by `STORAGE_PROVIDER`. Local by
 * default so development and tests run without Cloudflare credentials; R2 is
 * chosen via env for production. Both implementations are interchangeable
 * through the {@link StorageService} boundary.
 */
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageService => {
        const provider = config.get<StorageProvider>('storage.provider') ?? 'local';
        if (provider === 'r2') {
          const r2 = config.get('storage.r2');
          return new R2StorageService(r2);
        }
        return new LocalStorageService(config.get<string>('storage.localDir') ?? 'uploads');
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}