import { describe, it, expect } from 'vitest';
import {
  sha256,
  buildFbc,
  computeMetaValueAndCurrency,
  buildMetaCapiPayload
} from '../src/worker/services/meta-capi';
import { D1OrderRecord } from '../src/worker/types';

describe('Meta Conversions API (CAPI) Payload Builder', () => {
  it('computes correct SHA-256 hashes via WebCrypto', async () => {
    // Standard test vector: sha256("test") = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    const hash = await sha256('test');
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  it('builds fbc from fbclid when _fbc cookie is missing', () => {
    const fbcGenerated = buildFbc('fbclid_xyz_123');
    expect(fbcGenerated).toBeDefined();
    expect(fbcGenerated).toMatch(/^fb\.1\.\d+\.fbclid_xyz_123$/);

    const fbcPreserved = buildFbc('fbclid_xyz_123', 'fb.1.1600000000000.existing');
    expect(fbcPreserved).toBe('fb.1.1600000000000.existing');
  });

  it('computes Meta currency and value with USD conversion and never returns 0', () => {
    const usdResult = computeMetaValueAndCurrency(35000, 'USD', '1310');
    expect(usdResult.currency).toBe('USD');
    expect(usdResult.value).toBe(26.72); // 35000 / 1310 rounded to 2 decimals

    const iqdResult = computeMetaValueAndCurrency(35000, 'IQD');
    expect(iqdResult.currency).toBe('IQD');
    expect(iqdResult.value).toBe(35000);

    // Extreme low value never returns 0
    const zeroHandling = computeMetaValueAndCurrency(0, 'USD', '1310');
    expect(zeroHandling.value).toBe(0.01);
  });

  it('builds full CAPI payload with deduplication event_id and hashed user data', async () => {
    const mockOrder: D1OrderRecord = {
      id: 'IQ-778899',
      idempotency_key: 'uuid-1',
      customer_name: 'محمد كريم',
      phone: '07701234567',
      governorate: 'بغداد',
      address: 'حي الكرادة',
      product_id: 'royal-wall-clock-3d',
      model_id: 'model-sunburst',
      color_id: 'gold',
      quantity: 2,
      unit_price: 30000,
      total_price: 60000,
      source_url: 'https://example.com/product?utm_source=facebook&fbclid=IwAR123',
      utm_source: 'facebook',
      utm_medium: 'cpc',
      utm_campaign: 'clocks_2024',
      fbclid: 'IwAR123',
      fbp: 'fb.1.1700000000.12345',
      fbc: null,
      ip_address: '185.120.10.5',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      telegram_sent: 0,
      sheet_sent: 0,
      meta_sent: 0,
      retry_count: 0,
      last_retry_at: null,
      meta_response: null,
      meta_error: null,
      created_at: 1732000000
    };

    const mockEnv = {
      DB: {} as any,
      META_CURRENCY: 'USD',
      USD_RATE: '1310',
      META_TEST_EVENT_CODE: 'TEST654321'
    };

    const payload = await buildMetaCapiPayload(mockOrder, mockEnv);

    expect(payload.test_event_code).toBe('TEST654321');
    expect(payload.data).toHaveLength(1);

    const event = payload.data[0];
    expect(event.event_name).toBe('Purchase');
    expect(event.event_id).toBe('purchase-IQ-778899'); // Deduplication key
    expect(event.action_source).toBe('website');
    expect(event.event_source_url).toBe('https://example.com/product'); // stripped query string

    // User data hashing
    expect(event.user_data.client_ip_address).toBe('185.120.10.5');
    expect(event.user_data.fbp).toBe('fb.1.1700000000.12345');
    expect(event.user_data.fbc).toMatch(/^fb\.1\.\d+\.IwAR123$/);

    // E.164 phone 9647701234567 hashed with SHA-256
    const expectedPhoneHash = await sha256('9647701234567');
    expect(event.user_data.ph[0]).toBe(expectedPhoneHash);

    // Country 'iq' hashed
    const expectedCountryHash = await sha256('iq');
    expect(event.user_data.country[0]).toBe(expectedCountryHash);

    // External ID (orderId) hashed
    const expectedExtIdHash = await sha256('IQ-778899');
    expect(event.user_data.external_id[0]).toBe(expectedExtIdHash);

    // Custom data
    expect(event.custom_data.currency).toBe('USD');
    expect(event.custom_data.value).toBe(45.80); // 60000 / 1310
    expect(event.custom_data.content_ids).toEqual(['royal-wall-clock-3d']);
    expect(event.custom_data.num_items).toBe(2);
  });
});
