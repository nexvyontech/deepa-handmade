import { describe, expect, it } from 'vitest';

import { ALL_PERMISSIONS, PERMISSIONS } from './constants/permissions';
import {
  ORDER_STATES,
  PAYMENT_ORDER_STATES,
  TERMINAL_ORDER_STATES,
  type OrderState,
} from './constants/order';
import { PAYMENT_METHODS, UPI_PAYMENT_STATES } from './constants/payment';
import {
  PACKING_STATES,
  PRODUCTION_STATES,
  QC_STATES,
  REFUND_STATES,
  RETURN_STATES,
  SHIPPING_STATES,
} from './constants/operations';
import { isStaffRole, ROLES } from './constants/roles';

describe('canonical state models', () => {
  it('payment methods are exactly UPI_MANUAL and COD', () => {
    expect(Object.values(PAYMENT_METHODS).sort()).toEqual(['COD', 'UPI_MANUAL']);
  });

  it('UPI proof upload never equals confirmed', () => {
    expect(UPI_PAYMENT_STATES.PROOF_SUBMITTED).not.toBe(UPI_PAYMENT_STATES.PAYMENT_CONFIRMED);
  });

  it('order states are unique strings', () => {
    const values = Object.values(ORDER_STATES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('terminal order states are a subset of order states', () => {
    const terminalSet = new Set<OrderState>(TERMINAL_ORDER_STATES);
    for (const state of terminalSet) {
      expect(Object.values(ORDER_STATES)).toContain(state);
    }
  });

  it('payment order states come before fulfillment states', () => {
    const all = Object.values(ORDER_STATES);
    const paymentIndexes = PAYMENT_ORDER_STATES.map((s) => all.indexOf(s));
    const fulfillmentIndexes = all
      .filter((s) => (['ORDER_CONFIRMED', 'PRODUCTION', 'QUALITY_CHECK', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'] as OrderState[]).includes(s))
      .map((s) => all.indexOf(s));
    expect(Math.max(...paymentIndexes)).toBeLessThan(Math.min(...fulfillmentIndexes));
  });

  it('operations state lists are non-empty and unique', () => {
    const groups = [
      PRODUCTION_STATES,
      QC_STATES,
      PACKING_STATES,
      SHIPPING_STATES,
      RETURN_STATES,
      REFUND_STATES,
    ];
    for (const group of groups) {
      const values = Object.values(group);
      expect(values.length).toBeGreaterThan(0);
      expect(new Set(values).size).toBe(values.length);
    }
  });
});

describe('permissions', () => {
  it('every permission code is globally unique', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('payment.verify exists and is distinct from payment.reject', () => {
    expect(PERMISSIONS.PAYMENT_VERIFY).toBe('payment.verify');
    expect(PERMISSIONS.PAYMENT_REJECT).toBe('payment.reject');
  });
});

describe('roles', () => {
  it('customer is not a staff role', () => {
    expect(isStaffRole(ROLES.CUSTOMER)).toBe(false);
    expect(isStaffRole(ROLES.SUPER_ADMIN)).toBe(true);
  });
});