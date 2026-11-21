import { describe, it, expect } from 'vitest';
import { escapeTelegramHtml, buildTelegramMessage } from '../src/worker/services/telegram';

describe('Telegram Formatting and Escaping', () => {
  it('escapes &, <, >, and " to prevent HTML injection', () => {
    expect(escapeTelegramHtml('Ahmed & Ali')).toBe('Ahmed &amp; Ali');
    expect(escapeTelegramHtml('<script>alert("hack")</script>')).toBe('&lt;script&gt;alert(&quot;hack&quot;)&lt;/script&gt;');
    expect(escapeTelegramHtml('10 > 5 and 2 < 3')).toBe('10 &gt; 5 and 2 &lt; 3');
    expect(escapeTelegramHtml(null)).toBe('');
  });

  it('builds receipt containing Baghdad timestamp, store name, and escaped customer data', () => {
    const msg = buildTelegramMessage({
      id: 'IQ-543210',
      customerName: 'حسين <تاجر>',
      phone: '07701234567',
      governorate: 'النجف الأشرف',
      address: 'شارع الكوفة & حي المعلمين',
      modelName: 'موديل إشعاع الشمس',
      colorName: 'ذهبي ملكي',
      quantity: 1,
      unitPrice: 35000,
      totalPrice: 35000,
      createdAt: 1732000000,
      storeName: 'ساعات الأناقة',
      utmSource: 'snapchat',
      utmCampaign: 'black_friday'
    });

    expect(msg).toContain('ساعات الأناقة');
    expect(msg).toContain('IQ-543210');
    expect(msg).toContain('حسين &lt;تاجر&gt;');
    expect(msg).toContain('شارع الكوفة &amp; حي المعلمين');
    expect(msg).toContain('النجف الأشرف');
    expect(msg).toContain('07701234567');
    expect(msg).toContain('35,000 د.ع');
    expect(msg).toContain('الدفع عند الاستلام مع المعاينة قبل الدفع');
    expect(msg).toContain('توقيت بغداد');
    expect(msg).not.toContain('<script>');
    expect(msg).not.toContain('<تاجر>');
  });
});
