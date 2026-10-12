import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SITE_SETTING_MODEL, siteSettingSchema } from '../../database/schemas/index.js';
import { SettingsService } from './settings.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Singleton `settings` document read access (Phase 7). Settings
 * administration arrives with a later phase; checkout-side logic consumes
 * the configured shipping data through this module.
 */
@Module({
  imports: hasMongoUri()
    ? [MongooseModule.forFeature([{ name: SITE_SETTING_MODEL, schema: siteSettingSchema }])]
    : [],
  controllers: [],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}