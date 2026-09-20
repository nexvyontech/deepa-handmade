import { ROLES } from '@deepa/shared';
import { Schema, Types } from 'mongoose';

const userSchema = new Schema(
  {
    profileType: { type: String, enum: ['CUSTOMER', 'STAFF'], required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    roleId: { type: Types.ObjectId, ref: 'Role', required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION'],
      default: 'PENDING_VERIFICATION',
    },
    avatarMediaId: { type: Types.ObjectId, ref: 'Media' },
    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date },
    passwordChangedAt: { type: Date },
  },
  { collection: 'users', timestamps: true },
);

userSchema.index({ status: 1, profileType: 1 });
userSchema.index({ roleId: 1 });
userSchema.index({ createdAt: 1 });

export { userSchema };
export default userSchema;
export const USER_MODEL = 'User';
export const USER_BASE_ROLES = [ROLES.CUSTOMER, ROLES.SUPER_ADMIN] as const;