import { ApiException } from '../../common/exceptions/api.exception.js';
import { ShippingCalculatorService } from './shipping-calculator.service.js';

describe('ShippingCalculatorService', () => {
  const calculator = new ShippingCalculatorService();
  const config = { mode: 'FLAT_FREE_THRESHOLD', flatFee: 99, freeThreshold: 1499 };

  it('charges the flat fee below the free-shipping threshold', () => {
    const quote = calculator.calculate(1000, config);
    expect(quote).toEqual({
      method: 'FLAT_FREE_THRESHOLD',
      shipping: 99,
      flatFee: 99,
      freeThreshold: 1499,
    });
  });

  it('waives shipping once the subtotal reaches the threshold', () => {
    expect(calculator.calculate(1499, config).shipping).toBe(0);
    expect(calculator.calculate(2000, config).shipping).toBe(0);
  });

  it('charges the fee on an empty subtotal (never free before an order exists)', () => {
    expect(calculator.calculate(0, config).shipping).toBe(99);
  });

  it('rounds the flat fee to two decimals', () => {
    expect(calculator.calculate(100, { mode: 'FLAT_FREE_THRESHOLD', flatFee: 12.345 }).shipping).toBe(12.35);
  });

  it('treats a missing free threshold as always chargeable', () => {
    expect(calculator.calculate(99999, { mode: 'FLAT_FREE_THRESHOLD', flatFee: 50 }).shipping).toBe(50);
  });

  it('rejects a missing configuration', () => {
    expect(() => calculator.calculate(1000, null)).toThrow(ApiException);
  });

  it('rejects an unsupported shipping mode', () => {
    expect(() => calculator.calculate(1000, { mode: 'PER_PINCODE', flatFee: 50 })).toThrow(ApiException);
  });

  it('rejects a missing fee', () => {
    expect(() => calculator.calculate(1000, { mode: 'FLAT_FREE_THRESHOLD' })).toThrow(ApiException);
  });
});