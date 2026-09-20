import { Schema, Types } from 'mongoose';

const AUDIT_ACTIONS = [
  'PAYMENT_APPROVED',
  'PAYMENT_REJECTED',
  'PRICE_CHANGED',
  'INVENTORY_ADJUSTED',
  'REFUND_APPROVED',
  'REFUND_PROCESSED',
  'ROLE_CHANGED',
  'USER_STATUS_CHANGED',
  'SETTINGS_UPDATED',
  'QUOTE_OVERRIDDEN',
  'REPORT_EXPORTED',
] as const;

const auditLogSchema = new Schema(
  {
    actorId: { type: Types.ObjectId, ref: 'User' },
    actorRole: { type: String, trim: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Types.ObjectId, required: true },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    meta: {
      ip: { type: String, trim: true },
      userAgent: { type: String, trim: true },
    },
  },
  { collection: 'audit-logs', timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: 1 });
auditLogSchema.index({ actorId: 1, createdAt: 1 });
auditLogSchema.index({ action: 1, createdAt: 1 });

export { auditLogSchema, AUDIT_ACTIONS };
export default auditLogSchema;
export const AUDIT_LOG_MODEL = 'AuditLog';