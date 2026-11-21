// Client tracking & session utilities for Meta Pixel, GPC, and UTM attributes

export interface TrackingParams {
  sourceUrl: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
}

const STORAGE_KEY = 'az_tracking_params';

/**
 * Initializes tracking by reading URL query parameters on initial landing and saving to sessionStorage.
 */
export function initTracking(): TrackingParams {
  if (typeof window === 'undefined') {
    return { sourceUrl: '' };
  }

  try {
    const url = new URL(window.location.href);
    const existing = sessionStorage.getItem(STORAGE_KEY);
    let params: TrackingParams;

    if (existing) {
      try {
        params = JSON.parse(existing);
      } catch {
        params = { sourceUrl: window.location.href };
      }
    } else {
      params = {
        sourceUrl: window.location.href,
        utmSource: url.searchParams.get('utm_source') || undefined,
        utmMedium: url.searchParams.get('utm_medium') || undefined,
        utmCampaign: url.searchParams.get('utm_campaign') || undefined,
        utmContent: url.searchParams.get('utm_content') || undefined,
        utmTerm: url.searchParams.get('utm_term') || undefined,
        fbclid: url.searchParams.get('fbclid') || undefined,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(params));
    }

    // Also enrich with current cookies if available
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [k, ...v] = c.trim().split('=');
      if (k) acc[k] = v.join('=');
      return acc;
    }, {} as Record<string, string>);

    if (cookies['_fbp'] && !params.fbp) {
      params.fbp = cookies['_fbp'];
    }
    if (cookies['_fbc'] && !params.fbc) {
      params.fbc = cookies['_fbc'];
    }

    return params;
  } catch (err) {
    console.error('[Tracking] Error capturing parameters:', err);
    return { sourceUrl: window.location.href };
  }
}

/**
 * Checks if Global Privacy Control (GPC) is active.
 */
export function isGlobalPrivacyControlActive(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((navigator as any).globalPrivacyControl);
}
