import { ALL_PERMISSIONS, ROLES, STAFF_ROLES } from '@deepa/shared';
import { Schema } from 'mongoose';

const roleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, enum: Object.values(ROLES) },
    permissions: { type: [String], enum: ALL_PERMISSIONS, default: [] },
    isSystem: { type: Boolean, default: false },
    description: { type: String, trim: true },
  },
  { collection: 'roles', timestamps: true },
);

export { roleSchema, STAFF_ROLES };
export default roleSchema;
export const ROLE_MODEL = 'Role';