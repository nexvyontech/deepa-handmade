import { INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import helmet from 'helmet';
import { LogFormat, type AppEnv } from './config/configuration.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { createAppValidationPipe } from './common/pipes/validation.pipe.js';

export function configureApp(app: INestApplication): INestApplication {
  const config = app.get<ConfigService>(ConfigService);

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix(config.get<string>('api.prefix')!);

  app.useGlobalPipes(createAppValidationPipe());
  app.useGlobalFilters(
    new AllExceptionsFilter(config.get<LogFormat>('logging.format')!, config.get<AppEnv>('env')!),
  );
  app.useGlobalInterceptors(new LoggingInterceptor(config.get<LogFormat>('logging.format')!));

  app.use(helmet());
  app.enableCors({
    origin: config.get('corsOrigins'),
    credentials: true,
  });
  app.use(express.json({ limit: config.get('bodyLimit') }));
  app.use(express.urlencoded({ extended: true, limit: config.get('bodyLimit') }));
  app.getHttpAdapter().getInstance().set('trust proxy', config.get('trustProxy'));

  return app;
}

export function configureSwagger(app: INestApplication): INestApplication {
  const config = app.get<ConfigService>(ConfigService);

  if (!config.get('swagger.enabled')) {
    return app;
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle(config.get<string>('swagger.title')!)
    .setDescription(config.get<string>('swagger.description')!)
    .setVersion(config.get<string>('swagger.version')!)
    .addBearerAuth()
    .addTag('app', 'Application metadata')
    .addTag('health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(config.get<string>('swagger.path')!, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  return app;
}