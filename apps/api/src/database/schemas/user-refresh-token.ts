import { Schema, Types } from 'mongoose';

const userRefreshTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedByRef: { type: Types.ObjectId, ref: 'UserRefreshToken' },
    userAgent: { type: String, trim: true },
    ip: { type: String, trim: true },
  },
  { collection: 'user-refresh-tokens', timestamps: { createdAt: true, updatedAt: false } },
);

userRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
userRefreshTokenSchema.index({ userId: 1, revokedAt: 1 });

export { userRefreshTokenSchema };
export default userRefreshTokenSchema;
export const USER_REFRESH_TOKEN_MODEL = 'UserRefreshToken';