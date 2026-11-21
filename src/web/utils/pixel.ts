declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

function getStoredTracking() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('az_tracking_params');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function sendServerEvent(data: Record<string, any>) {
  if (typeof window === 'undefined') return;
  const tracking = getStoredTracking();
  fetch('/api/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      sourceUrl: window.location.href,
      fbp: tracking.fbp,
      fbc: tracking.fbc,
      fbclid: tracking.fbclid,
    }),
  }).catch(() => {});
}

/**
 * Standard Meta Pixel + Server CAPI integration.
 * Fires events directly to browser fbq AND synchronizes via backend CAPI.
 */
export const MetaPixel = {
  pageView(): void {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  },

  viewContent(params: { productId: string; productName: string; value: number; currency?: string }): void {
    const currency = params.currency || 'USD';
    const eventId = `vc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq(
        'track',
        'ViewContent',
        {
          content_name: params.productName,
          content_type: 'product',
          content_ids: [params.productId],
          value: params.value,
          currency,
        },
        { eventID: eventId }
      );
      console.log('[Meta Pixel] Fired ViewContent', eventId);
    }

    sendServerEvent({
      eventName: 'ViewContent',
      eventId,
      productId: params.productId,
      productName: params.productName,
      value: params.value,
      currency,
    });
  },

  initiateCheckout(params: { productId: string; productName: string; value: number; currency?: string }): void {
    const currency = params.currency || 'USD';
    const eventId = `ic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq(
        'track',
        'InitiateCheckout',
        {
          content_name: params.productName,
          content_type: 'product',
          content_ids: [params.productId],
          value: params.value,
          currency,
        },
        { eventID: eventId }
      );
      window.fbq('track', 'AddToCart', {
        content_name: params.productName,
        content_type: 'product',
        content_ids: [params.productId],
        value: params.value,
        currency,
      });
      console.log('[Meta Pixel] Fired InitiateCheckout & AddToCart', eventId);
    }

    sendServerEvent({
      eventName: 'InitiateCheckout',
      eventId,
      productId: params.productId,
      productName: params.productName,
      value: params.value,
      currency,
    });
  },

  purchase(params: {
    orderId: string;
    value: number;
    currency: string;
    productId: string;
    quantity: number;
  }): void {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      const eventID = `purchase-${params.orderId}`;
      window.fbq(
        'track',
        'Purchase',
        {
          value: params.value,
          currency: params.currency,
          content_type: 'product',
          content_ids: [params.productId],
          contents: [
            {
              id: params.productId,
              quantity: params.quantity,
              item_price: Number((params.value / params.quantity).toFixed(2)),
            },
          ],
          num_items: params.quantity,
        },
        {
          eventID, // CRITICAL: matches server CAPI event_id for deduplication
        }
      );
      console.log(`[Meta Pixel] Fired Purchase with eventID: ${eventID}, value: ${params.value} ${params.currency}`);
    }
  },
};
