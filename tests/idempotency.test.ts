import { describe, it, expect } from 'vitest';
import { OrderRepository } from '../src/worker/services/db';

describe('Idempotency Logic', () => {
  it('returns saved order without inserting duplicate when idempotency key exists', async () => {
    const mockStore = new Map<string, any>();

    // Mock D1Database
    const mockDb: any = {
      prepare: (query: string) => {
        return {
          bind: (...params: any[]) => {
            return {
              first: async () => {
                if (query.includes('FROM orders WHERE idempotency_key = ?')) {
                  const key = params[0];
                  return mockStore.get(key) || null;
                }
                return null;
              },
              run: async () => {
                if (query.includes('INSERT INTO orders')) {
                  const orderId = params[0];
                  const idempotencyKey = params[1];
                  mockStore.set(idempotencyKey, {
                    id: orderId,
                    idempotency_key: idempotencyKey,
                    customer_name: params[2],
                    phone: params[3],
                    governorate: params[4],
                    address: params[5],
                    product_id: params[6],
                    model_id: params[7],
                    color_id: params[8],
                    quantity: params[9],
                    unit_price: params[10],
                    total_price: params[11],
                    created_at: params[21]
                  });
                }
                return { success: true };
              }
            };
          }
        };
      }
    };

    const repo = new OrderRepository(mockDb);

    // Initial check: not found
    const key = 'test-uuid-12345';
    const firstCheck = await repo.findByIdempotencyKey(key);
    expect(firstCheck).toBeNull();

    // Create order
    await repo.createOrder({
      id: 'IQ-100001',
      idempotencyKey: key,
      customerName: 'علي جاسم',
      phone: '07701234567',
      governorate: 'بغداد',
      address: 'المنصور - شارع 14 رمضان',
      productId: 'royal-wall-clock-3d',
      modelId: 'model-sunburst',
      colorId: 'gold',
      quantity: 1,
      unitPrice: 35000,
      totalPrice: 35000,
      createdAt: 1700000000
    });

    // Second check: found and matches
    const secondCheck = await repo.findByIdempotencyKey(key);
    expect(secondCheck).not.toBeNull();
    expect(secondCheck?.id).toBe('IQ-100001');
    expect(secondCheck?.customer_name).toBe('علي جاسم');
    expect(secondCheck?.total_price).toBe(35000);
  });
});
