import { effectivePrice, roundMoney } from './money.js';

describe('roundMoney', () => {
  it('rounds to 2 decimal places', () => {
    expect(roundMoney(10.005)).toBe(10.01);
    expect(roundMoney(10.004)).toBe(10);
    expect(roundMoney(12.3456)).toBe(12.35);
  });

  it('handles integer inputs', () => {
    expect(roundMoney(5)).toBe(5);
  });
});

describe('effectivePrice', () => {
  it('adds the variant price delta to the base price', () => {
    expect(effectivePrice(100, 25.005)).toBe(125.01);
    expect(effectivePrice(100)).toBe(100);
  });
});