import { Schema, Types } from 'mongoose';
import { localizedText } from './common.js';

const mediaSchema = new Schema(
  {
    ownerType: { type: String, required: true, trim: true },
    ownerId: { type: Types.ObjectId, required: true },
    kind: { type: String, enum: ['IMAGE', 'VIDEO'], required: true },
    bucket: { type: String, enum: ['PUBLIC', 'PRIVATE'], required: true },
    storagePath: { type: String, required: true, unique: true },
    mime: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    durationSec: { type: Number, min: 0 },
    alt: { ...localizedText },
    status: {
      type: String,
      enum: ['AVAILABLE', 'PENDING_MODERATION', 'REJECTED', 'HIDDEN'],
      default: 'AVAILABLE',
    },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    uploadedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { collection: 'media', timestamps: { createdAt: true, updatedAt: false } },
);

mediaSchema.index({ ownerType: 1, ownerId: 1 });
mediaSchema.index({ bucket: 1, status: 1 });
mediaSchema.index({ uploadedBy: 1 });

export { mediaSchema };
export default mediaSchema;
export const MEDIA_MODEL = 'Media';