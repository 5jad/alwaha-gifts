import { D1OrderRecord, Env } from '../types';
import { PRODUCT } from '../../config/products';
import { formatBaghdadDateTime } from './telegram';

/**
 * Sends order data to Google Apps Script Web App.
 */
export async function sendSheetsOrder(order: D1OrderRecord, env: Env): Promise<{ success: boolean; duplicated?: boolean; error?: string }> {
  if (!env.SHEETS_WEBHOOK_URL) {
    console.warn('[Sheets] SHEETS_WEBHOOK_URL is not configured');
    return { success: false, error: 'SHEETS_WEBHOOK_URL missing' };
  }

  const model = PRODUCT.models.find(m => m.id === order.model_id)?.nameAr || order.model_id;
  const color = PRODUCT.colors.find(c => c.id === order.color_id)?.nameAr || order.color_id;
  const { date, time } = formatBaghdadDateTime(new Date(order.created_at * 1000));

  const payload = {
    secret: env.SHEETS_SECRET || '',
    order: {
      id: order.id,
      date,
      time,
      customerName: order.customer_name,
      phone: order.phone,
      governorate: order.governorate,
      address: order.address,
      productName: PRODUCT.nameAr,
      modelName: model,
      colorName: color,
      quantity: order.quantity,
      unitPrice: order.unit_price,
      totalPrice: order.total_price,
      status: 'جديد - قيد التجهيز',
      sourceUrl: order.source_url || '',
      utmSource: order.utm_source || '',
      utmCampaign: order.utm_campaign || ''
    }
  };

  try {
    const res = await fetch(env.SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Sheets] Webhook responded with status ${res.status} for order ${order.id}: ${errText}`);
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as { success: boolean; duplicated?: boolean; error?: string };
    if (!data.success) {
      console.error(`[Sheets] Webhook returned success=false for order ${order.id}: ${data.error}`);
      return { success: false, error: data.error };
    }

    return { success: true, duplicated: data.duplicated };
  } catch (err: any) {
    console.error(`[Sheets] Exception sending order ${order.id}:`, err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}
