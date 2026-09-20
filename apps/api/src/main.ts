import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppConfig } from './config/configuration.js';
import { AppModule } from './app.module.js';
import { configureApp, configureSwagger } from './app.setup.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  configureApp(app);
  configureSwagger(app);

  app.enableShutdownHooks();

  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const port = config.get('port');

  await app.listen(port);
  Logger.log(`API listening on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();