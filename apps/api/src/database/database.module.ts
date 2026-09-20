import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

const hasMongoUri = () => !!process.env.MONGODB_URI;

@Module({
  imports: [
    ConfigModule,
    ...(hasMongoUri()
      ? [
          MongooseModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              uri: config.getOrThrow<string>('mongo.uri'),
            }),
          }),
        ]
      : []),
  ],
})
export class DatabaseModule {}