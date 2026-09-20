import { Schema } from 'mongoose';
import { localizedText } from './common.js';

const variantOptionSchema = new Schema(
  {
    optionType: { type: String, enum: ['COLOR', 'SIZE', 'HANDLE'], required: true },
    value: { ...localizedText },
    hex: { type: String, trim: true, uppercase: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { collection: 'variant-options', timestamps: true },
);

variantOptionSchema.index({ optionType: 1, 'value.en': 1 }, { unique: true });
variantOptionSchema.index({ optionType: 1, active: 1, displayOrder: 1 });

export { variantOptionSchema };
export default variantOptionSchema;
export const VARIANT_OPTION_MODEL = 'VariantOption';