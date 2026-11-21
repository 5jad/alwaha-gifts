import { isGlobalPrivacyControlActive } from './tracking';

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

/**
 * Helper to call standard Meta Pixel fbq events safely.
 * Respects Global Privacy Control for non-essential tracking if enabled.
 */
export const MetaPixel = {
  pageView(): void {
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }
  },

  viewContent(productName: string, value: number, currency: string = 'USD'): void {
    if (isGlobalPrivacyControlActive()) return;
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'ViewContent', {
        content_name: productName,
        content_type: 'product',
        value,
        currency,
      });
      console.log('[Meta Pixel] Fired ViewContent');
    }
  },

  initiateCheckout(value: number, currency: string = 'USD'): void {
    if (isGlobalPrivacyControlActive()) return;
    if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
      window.fbq('track', 'InitiateCheckout', {
        content_type: 'product',
        value,
        currency,
      });
      console.log('[Meta Pixel] Fired InitiateCheckout');
    }
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
