import { Schema, Types } from 'mongoose';

export const localizedText = {
  en: { type: String, required: true, trim: true },
  ta: { type: String, trim: true, default: undefined },
};

export const seoProps = {
  title: { type: String, trim: true },
  metaDescription: { type: String, trim: true },
  canonicalUrl: { type: String, trim: true },
  ogImageMediaId: { type: Types.ObjectId, ref: 'Media', default: undefined },
  noindex: { type: Boolean, default: false },
};

export const addressSnapshot = new Schema(
  {
    recipient: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    villageTown: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    label: { type: String, trim: true },
  },
  { _id: false, versionKey: false },
);