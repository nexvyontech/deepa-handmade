export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SALES_SUPPORT: 'SALES_SUPPORT',
  PRODUCTION: 'PRODUCTION',
  QC: 'QC',
  PACKING: 'PACKING',
  INVENTORY: 'INVENTORY',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const STAFF_ROLES: readonly Role[] = [
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
  ROLES.SALES_SUPPORT,
  ROLES.PRODUCTION,
  ROLES.QC,
  ROLES.PACKING,
  ROLES.INVENTORY,
];

export function isStaffRole(role: string): boolean {
  return (STAFF_ROLES as readonly string[]).includes(role);
}