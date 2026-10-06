import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { LogFormat } from '../../config/configuration.js';
import { AUDIT_ACTIONS, AUDIT_LOG_MODEL } from '../../database/schemas/index.js';
import { StructuredLogger } from '../logging/structured-logger.js';

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Structured context stored in `meta` (schema keeps ip/userAgent; extras are log-only). */
export interface AuditMeta {
  ip?: string;
  userAgent?: string;
  reason?: string;
  attempts?: number;
}

export interface AuditEntry {
  actorId?: string;
  actorRole?: string;
  action: AuditAction;
  entityType: string;
  /** Required by the schema; skip persistence (structured log only) when absent/invalid. */
  entityId?: string;
  before?: unknown;
  after?: unknown;
  meta?: AuditMeta;
}

interface AuditLogDoc {
  _id: Types.ObjectId;
  actorId?: Types.ObjectId;
  actorRole?: string;
  action: AuditAction;
  entityType: string;
  entityId: Types.ObjectId;
  before?: unknown;
  after?: unknown;
  meta?: AuditMeta;
}

/**
 * Best-effort audit trail writer: persistence failures are logged and never
 * propagated, so an audit hiccup cannot fail an authentication flow. When the
 * database is not configured (documented no-DB boot mode) entries go to the
 * structured log only.
 */
@Injectable()
export class AuditService {
  private readonly logger: StructuredLogger;

  constructor(
    config: ConfigService,
    @Optional()
    @InjectModel(AUDIT_LOG_MODEL)
    private readonly model?: Model<AuditLogDoc>,
  ) {
    this.logger = new StructuredLogger(
      'auth-audit',
      config.get<LogFormat>('logging.format') ?? 'pretty',
    );
  }

  async record(entry: AuditEntry): Promise<void> {
    const fields = {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      reason: entry.meta?.reason,
      attempts: entry.meta?.attempts,
      ip: entry.meta?.ip,
    };

    if (!this.model || !entry.entityId || !Types.ObjectId.isValid(entry.entityId)) {
      this.logger.log(entry.action, fields);
      return;
    }

    try {
      await this.model.create({
        actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : undefined,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: new Types.ObjectId(entry.entityId),
        before: entry.before,
        after: entry.after,
        meta: entry.meta,
      });
    } catch (error) {
      this.logger.warn('failed to persist audit log', {
        ...fields,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
