import { Schema } from 'mongoose';
import { localizedText } from './common.js';

const whatsappSettingSchema = new Schema(
  {
    businessNumber: { type: String, required: true, trim: true },
    mode: { type: String, enum: ['WA_ME', 'CLOUD_API'], default: 'WA_ME' },
    defaultTemplate: { ...localizedText },
    templates: {
      type: [
        {
          name: { type: String, trim: true },
          body: { ...localizedText },
        },
      ],
      default: [],
    },
    webhookConfig: { type: Schema.Types.Mixed },
    ctaTemplates: {
      product: { type: String, trim: true },
      customOrder: { type: String, trim: true },
      wholesale: { type: String, trim: true },
      payment: { type: String, trim: true },
    },
  },
  { collection: 'whatsapp-settings', timestamps: true },
);

export { whatsappSettingSchema };
export default whatsappSettingSchema;
export const WHATSAPP_SETTING_MODEL = 'WhatsAppSetting';