import { z } from 'zod';
import { IRAQ_GOVERNORATES } from '../shared/types';
import { PRODUCT, PRODUCTS } from '../config/products';

/**
 * Converts Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) and Persian numerals to Western digits (0123456789).
 */
export function convertArabicIndicDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9');
}

/**
 * Normalizes an Iraqi phone number into:
 * - standard local format: 07XXXXXXXXX (11 digits)
 * - international E.164 digits: 9647XXXXXXXXX (12 digits)
 */
export function normalizeIraqiPhone(raw: string): {
  isValid: boolean;
  normalized: string;
  e164: string;
  error?: string;
} {
  if (!raw || typeof raw !== 'string') {
    return { isValid: false, normalized: '', e164: '', error: 'رقم الهاتف مطلوب' };
  }

  // 1. Convert Arabic-Indic numerals to ASCII
  const asciiStr = convertArabicIndicDigits(raw.trim());

  // 2. Remove all non-digit characters (+, -, spaces, parentheses, etc.)
  let digits = asciiStr.replace(/\D/g, '');

  // 3. Strip international prefixes: 00964, +964, 964
  if (digits.startsWith('00964')) {
    digits = digits.slice(5);
  } else if (digits.startsWith('964')) {
    digits = digits.slice(3);
  }

  // 4. Handle leading zero
  if (digits.startsWith('7') && digits.length === 10) {
    digits = '0' + digits;
  }

  // 5. Must be 11 digits starting with 07 and valid Iraqi mobile prefix
  // Iraqi mobile networks: 073, 074, 075, 076, 077, 078, 079
  const iraqiMobileRegex = /^07[3-9]\d{8}$/;

  if (!iraqiMobileRegex.test(digits)) {
    return {
      isValid: false,
      normalized: digits,
      e164: '',
      error: 'يرجى إدخال رقم هاتف عراقي صحيح يتكون من 11 رقماً (مثال: 07701234567 أو 07801234567)'
    };
  }

  const normalized = digits;
  const e164 = '964' + digits.slice(1); // 9647XXXXXXXXX

  return {
    isValid: true,
    normalized,
    e164
  };
}

/**
 * Zod validation schema for incoming order payload
 */
export const orderSchema = z.object({
  name: z
    .string({ required_error: 'يرجى إدخال الاسم الكامل' })
    .trim()
    .min(3, { message: 'يجب أن يكون الاسم 3 أحرف على الأقل' })
    .max(80, { message: 'الاسم طويل جداً' }),
  
  phone: z
    .string({ required_error: 'يرجى إدخال رقم الهاتف' })
    .trim()
    .refine((val) => normalizeIraqiPhone(val).isValid, {
      message: 'يرجى إدخال رقم هاتف عراقي صحيح يتكون من 11 رقماً (مثال: 07701234567)'
    }),

  governorate: z
    .string({ required_error: 'يرجى اختيار المحافظة' })
    .refine((val) => (IRAQ_GOVERNORATES as readonly string[]).includes(val), {
      message: 'يرجى اختيار محافظة عراقية صحيحة من القائمة'
    }),

  address: z
    .string({ required_error: 'يرجى إدخال العنوان بالتفصيل' })
    .trim()
    .min(5, { message: 'يرجى كتابة العنوان بشكل واضح (المنطقة، أقرب نقطة دالة)' })
    .max(200, { message: 'العنوان طويل جداً' }),

  productId: z
    .string()
    .default(PRODUCT.id)
    .refine((val) => PRODUCTS.some((p) => p.id === val), {
      message: 'المنتج المحدد غير متوفر'
    }),

  modelId: z
    .string({ required_error: 'يرجى اختيار الموديل' })
    .refine((val) => PRODUCTS.some((p) => p.models.some((m) => m.id === val)), {
      message: 'الموديل المختار غير صالح'
    }),

  colorId: z
    .string({ required_error: 'يرجى اختيار اللون' })
    .min(1, { message: 'يرجى اختيار اللون' }),

  quantity: z
    .number({ invalid_type_error: 'الكمية يجب أن تكون رقماً' })
    .int({ message: 'الكمية يجب أن تكون رقماً صحيحاً' })
    .min(1, { message: 'أقل كمية للطلب هي 1' })
    .max(20, { message: 'أقصى كمية للطلب الفردي هي 20' }),

  website_url_hp: z.string().optional(),
  turnstileToken: z.string().optional(),
  sourceUrl: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  fbclid: z.string().optional(),
  fbp: z.string().optional(),
  fbc: z.string().optional(),
});

export type ValidatedOrder = z.infer<typeof orderSchema>;

/**
 * Cloudflare Turnstile token verification
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  secretKey: string | undefined,
  remoteIp?: string
): Promise<boolean> {
  // If no secret is configured, turnstile check is skipped
  if (!secretKey || secretKey.trim().length === 0) {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      return false;
    }

    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification error:', err);
    return false;
  }
}
