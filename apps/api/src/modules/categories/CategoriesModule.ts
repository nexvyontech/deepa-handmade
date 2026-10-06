import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CATEGORY_MODEL, categorySchema } from '../../database/schemas/index.js';
import { AuditModule } from '../audit/AuditModule.js';
import { MediaModule } from '../media/MediaModule.js';
import { AdminCategoriesController, PublicCategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Catalogue tree module (Phase 5): public/catalog categories + admin CRUD.
 * Deletion is a soft deactivate (`active: false`), blocked while active
 * children remain.
 */
@Module({
  imports: [
    MediaModule,
    AuditModule,
    ...(hasMongoUri()
      ? [MongooseModule.forFeature([{ name: CATEGORY_MODEL, schema: categorySchema }])]
      : []),
  ],
  controllers: [PublicCategoriesController, AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}