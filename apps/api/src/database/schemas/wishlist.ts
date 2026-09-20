import { Schema, Types } from 'mongoose';

const wishlistSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    productIds: { type: [Types.ObjectId], ref: 'Product', default: [] },
  },
  { collection: 'wishlists', timestamps: true },
);

export { wishlistSchema };
export default wishlistSchema;
export const WISHLIST_MODEL = 'Wishlist';