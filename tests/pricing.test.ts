import { describe, it, expect } from 'vitest';
import { calculateOrderPrice, PRODUCT } from '../src/config/products';

describe('Pricing Recomputation', () => {
  it('correctly calculates price for single unit', () => {
    const pricing = calculateOrderPrice(PRODUCT.id, 1);
    expect(pricing.unitPriceIQD).toBe(PRODUCT.basePriceIQD);
    expect(pricing.totalPriceIQD).toBe(PRODUCT.basePriceIQD);
  });

  it('applies volume discount for 2 units', () => {
    const pricing = calculateOrderPrice(PRODUCT.id, 2);
    // Discount is 5,000 per unit
    const expectedUnitPrice = PRODUCT.basePriceIQD - 5000;
    expect(pricing.unitPriceIQD).toBe(expectedUnitPrice);
    expect(pricing.totalPriceIQD).toBe(expectedUnitPrice * 2);
  });

  it('applies tier 3 volume discount for 3 or more units', () => {
    const pricing = calculateOrderPrice(PRODUCT.id, 3);
    // Discount is 7,000 per unit
    const expectedUnitPrice = PRODUCT.basePriceIQD - 7000;
    expect(pricing.unitPriceIQD).toBe(expectedUnitPrice);
    expect(pricing.totalPriceIQD).toBe(expectedUnitPrice * 3);
  });

  it('clamps invalid or extreme quantities safely between 1 and 20', () => {
    const minClamped = calculateOrderPrice(PRODUCT.id, -5);
    expect(minClamped.totalPriceIQD).toBe(PRODUCT.basePriceIQD);

    const maxClamped = calculateOrderPrice(PRODUCT.id, 999);
    const expectedUnitPrice = PRODUCT.basePriceIQD - 7000;
    expect(maxClamped.totalPriceIQD).toBe(expectedUnitPrice * 20);
  });
});
