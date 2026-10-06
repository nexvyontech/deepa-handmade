import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditService } from '../../common/auth/audit.service.js';
import { AUDIT_LOG_MODEL, auditLogSchema } from '../../database/schemas/index.js';

const hasMongoUri = (): boolean => !!process.env.MONGODB_URI;

/**
 * Shared audit-trail writer (Phase 4 auth + Phase 5 catalogue/CMS/media).
 * Best-effort by design: persistence failures are logged, never propagated.
 */
@Module({
  imports: hasMongoUri()
    ? [MongooseModule.forFeature([{ name: AUDIT_LOG_MODEL, schema: auditLogSchema }])]
    : [],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}