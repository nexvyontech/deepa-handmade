import { Schema, Types } from 'mongoose';
import { localizedText } from './common.js';

const notificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, trim: true },
    title: { ...localizedText },
    body: { ...localizedText },
    channel: { type: String, enum: ['WEB', 'WHATSAPP', 'EMAIL', 'SMS'], required: true },
    status: { type: String, enum: ['PENDING', 'SENT', 'FAILED', 'READ'], default: 'PENDING' },
    error: { type: String, trim: true },
    related: {
      entityType: { type: String, trim: true },
      entityId: { type: Types.ObjectId },
    },
    readAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { collection: 'notifications', timestamps: true },
);

notificationSchema.index({ userId: 1, status: 1, createdAt: 1 });
notificationSchema.index({ type: 1, createdAt: 1 });

export { notificationSchema };
export default notificationSchema;
export const NOTIFICATION_MODEL = 'Notification';