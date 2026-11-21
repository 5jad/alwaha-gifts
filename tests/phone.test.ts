import { describe, it, expect } from 'vitest';
import { normalizeIraqiPhone, convertArabicIndicDigits } from '../src/worker/validation';

describe('Iraqi Phone Normalization', () => {
  it('converts Arabic-Indic digits to ASCII digits', () => {
    expect(convertArabicIndicDigits('٠٧٧٠١٢٣٤٥٦٧')).toBe('07701234567');
    expect(convertArabicIndicDigits('۰۷۸۰۱۲۳۴۵۶۷')).toBe('07801234567');
  });

  it('normalizes standard 11-digit numbers starting with 07', () => {
    const res = normalizeIraqiPhone('07701234567');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('07701234567');
    expect(res.e164).toBe('9647701234567');
  });

  it('handles numbers with spaces, hyphens, and brackets', () => {
    const res = normalizeIraqiPhone('0780-123 4567');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('07801234567');
    expect(res.e164).toBe('9647801234567');
  });

  it('handles +964 and 00964 international prefixes', () => {
    const withPlus = normalizeIraqiPhone('+9647501234567');
    expect(withPlus.isValid).toBe(true);
    expect(withPlus.normalized).toBe('07501234567');
    expect(withPlus.e164).toBe('9647501234567');

    const withDoubleZero = normalizeIraqiPhone('009647709876543');
    expect(withDoubleZero.isValid).toBe(true);
    expect(withDoubleZero.normalized).toBe('07709876543');
    expect(withDoubleZero.e164).toBe('9647709876543');

    const withPrefixOnly = normalizeIraqiPhone('9647901122334');
    expect(withPrefixOnly.isValid).toBe(true);
    expect(withPrefixOnly.normalized).toBe('07901122334');
    expect(withPrefixOnly.e164).toBe('9647901122334');
  });

  it('handles 10-digit number missing leading zero', () => {
    const res = normalizeIraqiPhone('7701234567');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('07701234567');
    expect(res.e164).toBe('9647701234567');
  });

  it('handles Arabic-Indic formatted phone numbers directly', () => {
    const res = normalizeIraqiPhone('٠٧٧٠١٢٣٤٥٦٧');
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe('07701234567');
    expect(res.e164).toBe('9647701234567');
  });

  it('rejects invalid numbers, non-Iraqi numbers, or wrong lengths', () => {
    // Too short
    expect(normalizeIraqiPhone('077012345').isValid).toBe(false);
    // Too long
    expect(normalizeIraqiPhone('0770123456789').isValid).toBe(false);
    // Invalid network prefix (071 or 072)
    expect(normalizeIraqiPhone('07101234567').isValid).toBe(false);
    // Non-numeric
    expect(normalizeIraqiPhone('0770abcdefg').isValid).toBe(false);
    // Empty
    expect(normalizeIraqiPhone('').isValid).toBe(false);
  });
});
