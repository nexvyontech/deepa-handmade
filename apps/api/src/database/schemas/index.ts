import type { Schema } from 'mongoose';

import { addressSchema, ADDRESS_MODEL, default as addressSchemaDefault } from './address.js';
import { auditLogSchema, AUDIT_LOG_MODEL, default as auditLogSchemaDefault } from './audit-log.js';
import { bannerSchema, BANNER_MODEL, default as bannerSchemaDefault } from './banner.js';
import { cartSchema, CART_MODEL, default as cartSchemaDefault } from './cart.js';
import { categorySchema, CATEGORY_MODEL, default as categorySchemaDefault } from './category.js';
import { cmsPageSchema, CMS_PAGE_MODEL, default as cmsPageSchemaDefault } from './cms-page.js';
import { couponSchema, COUPON_MODEL, default as couponSchemaDefault } from './coupon.js';
import { customQuoteSchema, CUSTOM_QUOTE_MODEL, default as customQuoteSchemaDefault } from './custom-quote.js';
import { customRequestSchema, CUSTOM_REQUEST_MODEL, default as customRequestSchemaDefault } from './custom-request.js';
import { inventoryItemSchema, INVENTORY_ITEM_MODEL, default as inventoryItemSchemaDefault } from './inventory-item.js';
import { inventoryTransactionSchema, INVENTORY_TRANSACTION_MODEL, default as inventoryTransactionSchemaDefault } from './inventory-transaction.js';
import { invoiceSchema, INVOICE_MODEL, default as invoiceSchemaDefault } from './invoice.js';
import { mediaSchema, MEDIA_MODEL, default as mediaSchemaDefault } from './media.js';
import { notificationSchema, NOTIFICATION_MODEL, default as notificationSchemaDefault } from './notification.js';
import { offerSchema, OFFER_MODEL, default as offerSchemaDefault } from './offer.js';
import { orderSchema, ORDER_MODEL, default as orderSchemaDefault } from './order.js';
import { packingRecordSchema, PACKING_RECORD_MODEL, default as packingRecordSchemaDefault } from './packing-record.js';
import { passwordResetTokenSchema, PASSWORD_RESET_TOKEN_MODEL, default as passwordResetTokenSchemaDefault } from './password-reset-token.js';
import { paymentProofSchema, PAYMENT_PROOF_MODEL, default as paymentProofSchemaDefault } from './payment-proof.js';
import { paymentSchema, PAYMENT_MODEL, default as paymentSchemaDefault } from './payment.js';
import { permissionSchema, PERMISSION_MODEL, default as permissionSchemaDefault } from './permission.js';
import { productVariantSchema, PRODUCT_VARIANT_MODEL, default as productVariantSchemaDefault } from './product-variant.js';
import { productSchema, PRODUCT_MODEL, default as productSchemaDefault } from './product.js';
import { productionTaskSchema, PRODUCTION_TASK_MODEL, default as productionTaskSchemaDefault } from './production-task.js';
import { purchaseSchema, PURCHASE_MODEL, default as purchaseSchemaDefault } from './purchase.js';
import { qcResultSchema, QC_RESULT_MODEL, default as qcResultSchemaDefault } from './qc-result.js';
import { refundSchema, REFUND_MODEL, default as refundSchemaDefault } from './refund.js';
import { returnRequestSchema, RETURN_REQUEST_MODEL, default as returnRequestSchemaDefault } from './return-request.js';
import { reviewSchema, REVIEW_MODEL, default as reviewSchemaDefault } from './review.js';
import { roleSchema, ROLE_MODEL, default as roleSchemaDefault } from './role.js';
import { shipmentSchema, SHIPMENT_MODEL, default as shipmentSchemaDefault } from './shipment.js';
import { siteSettingSchema, SITE_SETTING_MODEL, default as siteSettingSchemaDefault } from './settings.js';
import { supplierSchema, SUPPLIER_MODEL, default as supplierSchemaDefault } from './supplier.js';
import { userRefreshTokenSchema, USER_REFRESH_TOKEN_MODEL, default as userRefreshTokenSchemaDefault } from './user-refresh-token.js';
import { userSchema, USER_MODEL, default as userSchemaDefault } from './user.js';
import { variantOptionSchema, VARIANT_OPTION_MODEL, default as variantOptionSchemaDefault } from './variant-option.js';
import { wholesaleEnquirySchema, WHOLESALE_ENQUIRY_MODEL, default as wholesaleEnquirySchemaDefault } from './wholesale-enquiry.js';
import { wholesaleQuoteSchema, WHOLESALE_QUOTE_MODEL, default as wholesaleQuoteSchemaDefault } from './wholesale-quote.js';
import { wholesaleTierSchema, WHOLESALE_TIER_MODEL, default as wholesaleTierSchemaDefault } from './wholesale-tier.js';
import { whatsappSettingSchema, WHATSAPP_SETTING_MODEL, default as whatsappSettingSchemaDefault } from './whatsapp-setting.js';
import { wishlistSchema, WISHLIST_MODEL, default as wishlistSchemaDefault } from './wishlist.js';

export interface SchemaDef {
  name: string;
  schema: Schema;
  collection: string;
}

export const SCHEMA_DEFS: SchemaDef[] = [
  { name: USER_MODEL, schema: userSchema, collection: 'users' },
  { name: ROLE_MODEL, schema: roleSchema, collection: 'roles' },
  { name: PERMISSION_MODEL, schema: permissionSchema, collection: 'permissions' },
  { name: USER_REFRESH_TOKEN_MODEL, schema: userRefreshTokenSchema, collection: 'user-refresh-tokens' },
  { name: PASSWORD_RESET_TOKEN_MODEL, schema: passwordResetTokenSchema, collection: 'password-reset-tokens' },
  { name: ADDRESS_MODEL, schema: addressSchema, collection: 'addresses' },
  { name: CATEGORY_MODEL, schema: categorySchema, collection: 'categories' },
  { name: PRODUCT_MODEL, schema: productSchema, collection: 'products' },
  { name: VARIANT_OPTION_MODEL, schema: variantOptionSchema, collection: 'variant-options' },
  { name: PRODUCT_VARIANT_MODEL, schema: productVariantSchema, collection: 'product-variants' },
  { name: MEDIA_MODEL, schema: mediaSchema, collection: 'media' },
  { name: CART_MODEL, schema: cartSchema, collection: 'carts' },
  { name: WISHLIST_MODEL, schema: wishlistSchema, collection: 'wishlists' },
  { name: OFFER_MODEL, schema: offerSchema, collection: 'offers' },
  { name: COUPON_MODEL, schema: couponSchema, collection: 'coupons' },
  { name: ORDER_MODEL, schema: orderSchema, collection: 'orders' },
  { name: PAYMENT_MODEL, schema: paymentSchema, collection: 'payments' },
  { name: PAYMENT_PROOF_MODEL, schema: paymentProofSchema, collection: 'payment-proofs' },
  { name: REFUND_MODEL, schema: refundSchema, collection: 'refunds' },
  { name: CUSTOM_REQUEST_MODEL, schema: customRequestSchema, collection: 'custom-requests' },
  { name: CUSTOM_QUOTE_MODEL, schema: customQuoteSchema, collection: 'custom-quotes' },
  { name: WHOLESALE_ENQUIRY_MODEL, schema: wholesaleEnquirySchema, collection: 'wholesale-enquiries' },
  { name: WHOLESALE_TIER_MODEL, schema: wholesaleTierSchema, collection: 'wholesale-tiers' },
  { name: WHOLESALE_QUOTE_MODEL, schema: wholesaleQuoteSchema, collection: 'wholesale-quotes' },
  { name: INVENTORY_ITEM_MODEL, schema: inventoryItemSchema, collection: 'inventory-items' },
  { name: INVENTORY_TRANSACTION_MODEL, schema: inventoryTransactionSchema, collection: 'inventory-transactions' },
  { name: SUPPLIER_MODEL, schema: supplierSchema, collection: 'suppliers' },
  { name: PURCHASE_MODEL, schema: purchaseSchema, collection: 'purchases' },
  { name: PRODUCTION_TASK_MODEL, schema: productionTaskSchema, collection: 'production-tasks' },
  { name: QC_RESULT_MODEL, schema: qcResultSchema, collection: 'qc-results' },
  { name: PACKING_RECORD_MODEL, schema: packingRecordSchema, collection: 'packing-records' },
  { name: SHIPMENT_MODEL, schema: shipmentSchema, collection: 'shipments' },
  { name: RETURN_REQUEST_MODEL, schema: returnRequestSchema, collection: 'return-requests' },
  { name: REVIEW_MODEL, schema: reviewSchema, collection: 'reviews' },
  { name: NOTIFICATION_MODEL, schema: notificationSchema, collection: 'notifications' },
  { name: WHATSAPP_SETTING_MODEL, schema: whatsappSettingSchema, collection: 'whatsapp-settings' },
  { name: CMS_PAGE_MODEL, schema: cmsPageSchema, collection: 'cms-pages' },
  { name: BANNER_MODEL, schema: bannerSchema, collection: 'banners' },
  { name: INVOICE_MODEL, schema: invoiceSchema, collection: 'invoices' },
  { name: SITE_SETTING_MODEL, schema: siteSettingSchema, collection: 'settings' },
  { name: AUDIT_LOG_MODEL, schema: auditLogSchema, collection: 'audit-logs' },
];

export { userSchema, userSchemaDefault, USER_MODEL };
export { roleSchema, roleSchemaDefault, ROLE_MODEL };
export { permissionSchema, permissionSchemaDefault, PERMISSION_MODEL };
export { userRefreshTokenSchema, userRefreshTokenSchemaDefault, USER_REFRESH_TOKEN_MODEL };
export { passwordResetTokenSchema, passwordResetTokenSchemaDefault, PASSWORD_RESET_TOKEN_MODEL };
export { addressSchema, addressSchemaDefault, ADDRESS_MODEL };
export { categorySchema, categorySchemaDefault, CATEGORY_MODEL };
export { productSchema, productSchemaDefault, PRODUCT_MODEL };
export { variantOptionSchema, variantOptionSchemaDefault, VARIANT_OPTION_MODEL };
export { productVariantSchema, productVariantSchemaDefault, PRODUCT_VARIANT_MODEL };
export { mediaSchema, mediaSchemaDefault, MEDIA_MODEL };
export { cartSchema, cartSchemaDefault, CART_MODEL };
export { wishlistSchema, wishlistSchemaDefault, WISHLIST_MODEL };
export { offerSchema, offerSchemaDefault, OFFER_MODEL };
export { couponSchema, couponSchemaDefault, COUPON_MODEL };
export { orderSchema, orderSchemaDefault, ORDER_MODEL };
export { paymentSchema, paymentSchemaDefault, PAYMENT_MODEL };
export { paymentProofSchema, paymentProofSchemaDefault, PAYMENT_PROOF_MODEL };
export { refundSchema, refundSchemaDefault, REFUND_MODEL };
export { customRequestSchema, customRequestSchemaDefault, CUSTOM_REQUEST_MODEL };
export { customQuoteSchema, customQuoteSchemaDefault, CUSTOM_QUOTE_MODEL };
export { wholesaleEnquirySchema, wholesaleEnquirySchemaDefault, WHOLESALE_ENQUIRY_MODEL };
export { wholesaleTierSchema, wholesaleTierSchemaDefault, WHOLESALE_TIER_MODEL };
export { wholesaleQuoteSchema, wholesaleQuoteSchemaDefault, WHOLESALE_QUOTE_MODEL };
export { inventoryItemSchema, inventoryItemSchemaDefault, INVENTORY_ITEM_MODEL };
export { inventoryTransactionSchema, inventoryTransactionSchemaDefault, INVENTORY_TRANSACTION_MODEL };
export { supplierSchema, supplierSchemaDefault, SUPPLIER_MODEL };
export { purchaseSchema, purchaseSchemaDefault, PURCHASE_MODEL };
export { productionTaskSchema, productionTaskSchemaDefault, PRODUCTION_TASK_MODEL };
export { qcResultSchema, qcResultSchemaDefault, QC_RESULT_MODEL };
export { packingRecordSchema, packingRecordSchemaDefault, PACKING_RECORD_MODEL };
export { shipmentSchema, shipmentSchemaDefault, SHIPMENT_MODEL };
export { returnRequestSchema, returnRequestSchemaDefault, RETURN_REQUEST_MODEL };
export { reviewSchema, reviewSchemaDefault, REVIEW_MODEL };
export { notificationSchema, notificationSchemaDefault, NOTIFICATION_MODEL };
export { whatsappSettingSchema, whatsappSettingSchemaDefault, WHATSAPP_SETTING_MODEL };
export { cmsPageSchema, cmsPageSchemaDefault, CMS_PAGE_MODEL };
export { bannerSchema, bannerSchemaDefault, BANNER_MODEL };
export { invoiceSchema, invoiceSchemaDefault, INVOICE_MODEL };
export { siteSettingSchema, siteSettingSchemaDefault, SITE_SETTING_MODEL };
export { auditLogSchema, auditLogSchemaDefault, AUDIT_LOG_MODEL };