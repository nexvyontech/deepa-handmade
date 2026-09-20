import { Schema } from 'mongoose';
import { localizedText, seoProps } from './common.js';

const cmsPageSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    type: { type: String, enum: ['PAGE', 'POLICY', 'CONTACT', 'FAQ'], required: true },
    title: { ...localizedText },
    content: { ...localizedText },
    seo: { ...seoProps },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT' },
    publishedAt: { type: Date },
    sortOrder: { type: Number, default: 0 },
  },
  { collection: 'cms-pages', timestamps: true },
);

cmsPageSchema.index({ type: 1, status: 1 });
cmsPageSchema.index({ status: 1, sortOrder: 1 });

export { cmsPageSchema };
export default cmsPageSchema;
export const CMS_PAGE_MODEL = 'CmsPage';