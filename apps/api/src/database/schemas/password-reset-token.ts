import { Schema, Types } from 'mongoose';

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { collection: 'password-reset-tokens', timestamps: { createdAt: true, updatedAt: false } },
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export { passwordResetTokenSchema };
export default passwordResetTokenSchema;
export const PASSWORD_RESET_TOKEN_MODEL = 'PasswordResetToken';