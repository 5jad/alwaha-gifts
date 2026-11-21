import { D1OrderRecord, Env } from '../types';
import { normalizeIraqiPhone } from '../validation';

/**
 * Computes SHA-256 hash of a string using WebCrypto (supported natively in Cloudflare Workers and modern Node).
 * Outputs hexadecimal string.
 */
export async function sha256(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses cookies header to extract _fbp and _fbc.
 */
export function extractMetaCookies(cookieHeader?: string | null): { fbp?: string; fbc?: string } {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((part) => {
    const [key, ...vals] = part.trim().split('=');
    if (key) {
      cookies[key.trim()] = vals.join('=').trim();
    }
  });

  return {
    fbp: cookies['_fbp'],
    fbc: cookies['_fbc']
  };
}

/**
 * Builds standard fbc string if _fbc cookie was absent but fbclid was present in landing URL.
 * Format: fb.1.<timestamp_ms>.<fbclid>
 */
export function buildFbc(fbclid?: string | null, existingFbc?: string | null): string | undefined {
  if (existingFbc && existingFbc.trim().length > 0) {
    return existingFbc.trim();
  }
  if (!fbclid || fbclid.trim().length === 0) {
    return undefined;
  }
  return `fb.1.${Date.now()}.${fbclid.trim()}`;
}

/**
 * Converts order total into the target currency (USD default or IQD).
 * Applies payment commission on top of the base USD value.
 * Example: 35000 IQD / 1520 rate = 23.03 USD → +5% commission = 24.18 USD
 */
export function computeMetaValueAndCurrency(
  totalIQD: number,
  currency: string = 'USD',
  rateString: string = '1520',
  commissionPercentString: string = '0'
): { value: number; currency: string } {
  const curr = currency.toUpperCase();
  if (curr === 'IQD') {
    return { value: Math.max(1, totalIQD), currency: 'IQD' };
  }

  const rate = parseFloat(rateString) || 1520;
  const commissionPercent = parseFloat(commissionPercentString) || 0;

  // 1. Convert IQD → USD
  const baseUsd = totalIQD / rate;
  // 2. Apply commission: 5% means multiply by 1.05
  const withCommission = baseUsd * (1 + commissionPercent / 100);
  const finalValue = Math.max(0.01, Number(withCommission.toFixed(2)));

  return {
    value: finalValue,
    currency: 'USD'
  };
}

/**
 * Builds Meta Conversions API (CAPI) payload
 */
export async function buildMetaCapiPayload(order: D1OrderRecord, env: Env): Promise<any> {
  const eventId = `purchase-${order.id}`;
  const currencySetting = env.META_CURRENCY || 'USD';
  const usdRateSetting = env.USD_RATE || '1520';
  const commissionSetting = env.PAYMENT_COMMISSION_PERCENT || '0';
  const { value, currency } = computeMetaValueAndCurrency(order.total_price, currencySetting, usdRateSetting, commissionSetting);

  // Phone normalization to E.164 digits for hashing
  const phoneRes = normalizeIraqiPhone(order.phone);
  const hashedPhone = phoneRes.e164 ? await sha256(phoneRes.e164) : await sha256(order.phone);

  // Customer Name splitting
  const nameParts = order.customer_name.trim().split(/\s+/);
  const firstName = nameParts[0] || '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const hashedFirstName = firstName ? await sha256(firstName) : undefined;
  const hashedLastName = lastName ? await sha256(lastName) : undefined;
  const hashedCountry = await sha256('iq');
  const hashedExternalId = await sha256(order.id);

  // Clean event source URL (strip query string)
  let cleanSourceUrl = 'https://store.local/';
  if (order.source_url) {
    try {
      const parsedUrl = new URL(order.source_url);
      cleanSourceUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
    } catch {
      cleanSourceUrl = order.source_url.split('?')[0];
    }
  }

  // fbc fallback
  const resolvedFbc = buildFbc(order.fbclid, order.fbc);

  // User data object
  const userData: Record<string, any> = {
    ph: [hashedPhone],
    country: [hashedCountry],
    external_id: [hashedExternalId],
  };

  if (hashedFirstName) userData.fn = [hashedFirstName];
  if (hashedLastName) userData.ln = [hashedLastName];
  if (order.ip_address) userData.client_ip_address = order.ip_address;
  if (order.user_agent) userData.client_user_agent = order.user_agent;
  if (order.fbp) userData.fbp = order.fbp;
  if (resolvedFbc) userData.fbc = resolvedFbc;

  const eventData: Record<string, any> = {
    event_name: 'Purchase',
    event_time: order.created_at,
    event_id: eventId,
    event_source_url: cleanSourceUrl,
    action_source: 'website',
    user_data: userData,
    custom_data: {
      currency,
      value,
      content_ids: [order.product_id],
      content_type: 'product',
      contents: [
        {
          id: order.product_id,
          quantity: order.quantity,
          item_price: Number((value / order.quantity).toFixed(2))
        }
      ],
      num_items: order.quantity
    }
  };

  const payload: Record<string, any> = {
    data: [eventData]
  };

  if (env.META_TEST_EVENT_CODE && env.META_TEST_EVENT_CODE.trim().length > 0) {
    payload.test_event_code = env.META_TEST_EVENT_CODE.trim();
  }

  return payload;
}

/**
 * Sends order event to Meta Conversions API (Graph API)
 */
export async function sendMetaCapiOrder(
  order: D1OrderRecord,
  env: Env
): Promise<{ success: boolean; response?: any; error?: string }> {
  const pixelId = env.META_PIXEL_ID;
  const accessToken = env.META_CAPI_ACCESS_TOKEN;
  const apiVersion = env.META_API_VERSION || 'v21.0';

  if (!pixelId || !accessToken) {
    const warning = `[Meta CAPI] Skipped: ${!pixelId ? 'META_PIXEL_ID is missing. ' : ''}${!accessToken ? 'META_CAPI_ACCESS_TOKEN is missing.' : ''}`;
    console.warn(warning);
    return { success: false, error: warning };
  }

  try {
    const payload = await buildMetaCapiPayload(order, env);
    const endpoint = `https://graph.facebook.com/${apiVersion}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000)
    });

    const responseBody = await res.json() as any;

    if (!res.ok || responseBody.error) {
      console.error(`[Meta CAPI] Error for order ${order.id}:`, JSON.stringify(responseBody.error || responseBody));
      return {
        success: false,
        response: responseBody,
        error: responseBody.error?.message || `HTTP ${res.status}`
      };
    }

    console.log(`[Meta CAPI] Successfully sent Purchase for order ${order.id}. Events received: ${responseBody.events_received}, fbtrace_id: ${responseBody.fbtrace_id}`);
    return {
      success: true,
      response: responseBody
    };
  } catch (err: any) {
    console.error(`[Meta CAPI] Exception for order ${order.id}:`, err?.message || err);
    return {
      success: false,
      error: err?.message || String(err)
    };
  }
}
