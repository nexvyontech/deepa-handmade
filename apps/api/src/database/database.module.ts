import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MONGO_TIMEOUTS } from './database-options.js';
import { DatabaseLifecycleService } from './database-lifecycle.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

@Module({
  imports: hasMongoUri()
    ? [
        MongooseModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            uri: config.getOrThrow('mongo.uri'),
            ...MONGO_TIMEOUTS,
          }),
        }),
      ]
    : [],
  providers: [DatabaseLifecycleService],
})
export class DatabaseModule {}