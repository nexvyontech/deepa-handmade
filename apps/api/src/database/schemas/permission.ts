import { ALL_PERMISSIONS } from '@deepa/shared';
import { Schema } from 'mongoose';

const permissionSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, enum: ALL_PERMISSIONS },
    resource: { type: String, required: true, trim: true },
    action: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { collection: 'permissions', timestamps: true },
);

export { permissionSchema };
export default permissionSchema;
export const PERMISSION_MODEL = 'Permission';