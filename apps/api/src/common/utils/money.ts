/** Round a number to 2 decimal places (canonical money precision). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Effective sellable price of a product/variant combination:
 * product base price plus variant price delta.
 */
export function effectivePrice(basePrice: number, priceDelta = 0): number {
  return roundMoney(basePrice + priceDelta);
}