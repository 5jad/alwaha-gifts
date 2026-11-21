import { describe, it, expect } from 'vitest';
import { computeMetaValueAndCurrency, buildMetaCapiPayload } from '../src/worker/services/meta-capi';
import { D1OrderRecord } from '../src/worker/types';

describe('Meta Value Consistency (Browser Pixel vs Server CAPI)', () => {
  it('guarantees identical values between computeMetaValueAndCurrency and CAPI custom_data', async () => {
    const totalIQD = 35000;
    const usdRate = '1520';
    const commissionPercent = '0';
    const currency = 'USD';

    // 1. Value calculated by computeMetaValueAndCurrency (sent in order response to browser)
    const { value: responseValue, currency: responseCurrency } = computeMetaValueAndCurrency(
      totalIQD,
      currency,
      usdRate,
      commissionPercent
    );

    // 2. Value in CAPI payload generated for server
    const mockOrder: D1OrderRecord = {
      id: 'IQ-123456',
      idempotency_key: 'idemp-1',
      customer_name: 'علي حسن',
      phone: '07701234567',
      governorate: 'بغداد',
      address: 'المنصور',
      product_id: 'custom-d1-clock',
      model_id: 'gold-model',
      color_id: 'ذهبي',
      quantity: 1,
      unit_price: 35000,
      total_price: 35000,
      source_url: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      fbclid: null,
      fbp: null,
      fbc: null,
      ip_address: '1.2.3.4',
      user_agent: 'test-agent',
      telegram_sent: 0,
      sheet_sent: 0,
      meta_sent: 0,
      retry_count: 0,
      last_retry_at: null,
      meta_response: null,
      meta_error: null,
      created_at: 1700000000
    };

    const mockEnv = {
      DB: {} as any,
      META_CURRENCY: currency,
      USD_RATE: usdRate,
      PAYMENT_COMMISSION_PERCENT: commissionPercent
    };

    const capiPayload = await buildMetaCapiPayload(mockOrder, mockEnv);
    const capiEvent = capiPayload.data[0];

    // Assert absolute equality between response returned to frontend and CAPI payload
    expect(responseValue).toBe(capiEvent.custom_data.value);
    expect(responseCurrency).toBe(capiEvent.custom_data.currency);
    expect(responseValue).toBe(23.03); // 35000 / 1520 = 23.026... rounded to 23.03
  });
});
