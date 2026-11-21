import { describe, it, expect } from 'vitest';
import { calculateOrderPrice, PRODUCT } from '../src/config/products';

describe('Pricing Recomputation', () => {
  it('correctly calculates price for single unit', () => {
    const pricing = calculateOrderPrice(PRODUCT.id, 1);
    expect(pricing.unitPriceIQD).toBe(PRODUCT.basePriceIQD);
    expect(pricing.totalPriceIQD).toBe(PRODUCT.basePriceIQD);
  });

  it('keeps flat unit price for 2 units without discount', () => {
    const pricing = calculateOrderPrice(PRODUCT.id, 2);
    expect(pricing.unitPriceIQD).toBe(PRODUCT.basePriceIQD);
    expect(pricing.totalPriceIQD).toBe(PRODUCT.basePriceIQD * 2);
  });

  it('keeps flat unit price for 3 or more units without discount', () => {
    const pricing = calculateOrderPrice(PRODUCT.id, 3);
    expect(pricing.unitPriceIQD).toBe(PRODUCT.basePriceIQD);
    expect(pricing.totalPriceIQD).toBe(PRODUCT.basePriceIQD * 3);
  });

  it('clamps invalid or extreme quantities safely', () => {
    const minClamped = calculateOrderPrice(PRODUCT.id, -5);
    expect(minClamped.totalPriceIQD).toBe(PRODUCT.basePriceIQD);

    const maxClamped = calculateOrderPrice(PRODUCT.id, 999);
    expect(maxClamped.totalPriceIQD).toBe(PRODUCT.basePriceIQD * 50);
  });
});
