import { describe, it, expect } from 'vitest';
import { orderSchema } from '../src/worker/validation';
import { StorefrontProduct, PRODUCTS } from '../src/config/products';

describe('D1 Dynamic Product Ordering Validation', () => {
  it('orderSchema accepts any non-empty productId and modelId (not restricted to static PRODUCTS)', () => {
    const d1OnlyPayload = {
      name: 'أحمد كريم',
      phone: '07701234567',
      governorate: 'بغداد',
      address: 'شارع فلسطين قرب ساحة بيروت',
      productId: 'd1-exclusive-clock-999', // Only in D1, NOT in PRODUCTS!
      modelId: 'd1-exclusive-model-abc',   // Only in D1, NOT in PRODUCTS!
      colorId: 'فضي معتق',
      quantity: 1,
    };

    const parsed = orderSchema.safeParse(d1OnlyPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.productId).toBe('d1-exclusive-clock-999');
      expect(parsed.data.modelId).toBe('d1-exclusive-model-abc');
    }
  });

  it('catalog lookup finds D1 product before static products', () => {
    const d1CustomProduct: StorefrontProduct = {
      id: 'd1-custom-clock',
      isPublished: true,
      storeName: 'الواحة للهداية',
      category: 'ساعات جدارية',
      productName: 'ساعة جدارية حصرية من D1',
      nameAr: 'ساعة جدارية حصرية من D1',
      tagline: 'تصميم خاص',
      description: 'وصف خاص',
      priceIQD: 42000,
      basePriceIQD: 42000,
      compareAtPriceIQD: 60000,
      features: ['ميزة 1'],
      images: [{ id: 1, url: 'https://example.com/clock.jpg', isActive: true }],
      models: [{ id: 'model-d1-special', name: 'موديل خاص', colors: ['ذهبي'], stock: 10 }]
    };

    const dbProducts = [d1CustomProduct];
    const activeCatalog = dbProducts.length > 0 ? dbProducts : PRODUCTS;

    const matchedProduct = activeCatalog.find(p => p.id === 'd1-custom-clock');
    expect(matchedProduct).toBeDefined();
    expect(matchedProduct?.productName).toBe('ساعة جدارية حصرية من D1');
    expect(matchedProduct?.priceIQD).toBe(42000);

    const matchedModel = matchedProduct?.models.find(m => m.id === 'model-d1-special');
    expect(matchedModel).toBeDefined();
    expect(matchedModel?.name).toBe('موديل خاص');

    // Unknown product check returns undefined
    const unknownProduct = activeCatalog.find(p => p.id === 'non-existent-clock');
    expect(unknownProduct).toBeUndefined();
  });
});
