import { D1OrderRecord, Env } from '../types';
import { PRODUCT, PRODUCTS } from '../../config/products';

/**
 * Escapes HTML characters for Telegram HTML parse mode.
 * Crucial to prevent injection attacks and message formatting breakage.
 */
export function escapeTelegramHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Formats a Date object or Unix timestamp into Baghdad local date and time string.
 */
export function formatBaghdadDateTime(date: Date = new Date()): { date: string; time: string; full: string } {
  try {
    const baghdadDate = new Intl.DateTimeFormat('ar-IQ', {
      timeZone: 'Asia/Baghdad',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);

    const baghdadTime = new Intl.DateTimeFormat('ar-IQ', {
      timeZone: 'Asia/Baghdad',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);

    return {
      date: baghdadDate,
      time: baghdadTime,
      full: `${baghdadDate} ${baghdadTime}`
    };
  } catch (err) {
    // Fallback if locale is unsupported
    const iso = date.toISOString();
    return {
      date: iso.slice(0, 10),
      time: iso.slice(11, 19),
      full: iso
    };
  }
}

/**
 * Builds the Arabic Telegram receipt text using HTML formatting.
 */
export function buildTelegramMessage(order: {
  id: string;
  customerName: string;
  phone: string;
  governorate: string;
  address: string;
  productName?: string;
  modelName: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: number;
  storeName?: string;
  sourceUrl?: string;
  utmSource?: string;
  utmCampaign?: string;
}): string {
  const store = order.storeName || 'الواحة للهداية';
  const productName = order.productName || 'ساعة حائط فاخرة';
  const { full: dateTimeBaghdad } = formatBaghdadDateTime(new Date(order.createdAt * 1000));

  return [
    `🔔 <b>طلب شراء جديد!</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🏪 <b>المتجر:</b> ${escapeTelegramHtml(store)}`,
    `📦 <b>رقم الطلب:</b> <code>${escapeTelegramHtml(order.id)}</code>`,
    `⏰ <b>التاريخ والوقت:</b> ${escapeTelegramHtml(dateTimeBaghdad)} (توقيت بغداد)`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `👤 <b>العميل:</b> ${escapeTelegramHtml(order.customerName)}`,
    `📱 <b>الهاتف:</b> <code>${escapeTelegramHtml(order.phone)}</code>`,
    `📍 <b>المحافظة:</b> ${escapeTelegramHtml(order.governorate)}`,
    `🏠 <b>العنوان:</b> ${escapeTelegramHtml(order.address)}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🕰 <b>المنتج:</b> ${escapeTelegramHtml(productName)}`,
    `✨ <b>الموديل:</b> ${escapeTelegramHtml(order.modelName)}`,
    `🎨 <b>اللون:</b> ${escapeTelegramHtml(order.colorName)}`,
    `🔢 <b>الكمية:</b> ${order.quantity}`,
    `💵 <b>سعر المفرد:</b> ${order.unitPrice.toLocaleString('en-US')} د.ع`,
    `💰 <b>المجموع الكلي:</b> <b>${order.totalPrice.toLocaleString('en-US')} د.ع</b>`,
    `🚚 <b>الشحن:</b> مجاني لكافة المحافظات`,
    `💳 <b>طريقة الدفع:</b> الدفع عند الاستلام مع المعاينة قبل الدفع`,
    `━━━━━━━━━━━━━━━━━━━━`,
    order.utmSource ? `🎯 <b>المصدر:</b> ${escapeTelegramHtml(order.utmSource)}` : '',
    order.utmCampaign ? `📢 <b>الحملة:</b> ${escapeTelegramHtml(order.utmCampaign)}` : ''
  ].filter(Boolean).join('\n');
}

/**
 * Sends order receipt to Telegram Bot API.
 */
export async function sendTelegramOrder(
  order: D1OrderRecord,
  env: Env,
  resolvedProductName?: string,
  resolvedModelName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not configured');
    return { success: false, error: 'Telegram credentials missing' };
  }

  const targetProduct = PRODUCTS.find(p => p.id === order.product_id) || PRODUCT;
  const productName = resolvedProductName || targetProduct.productName;
  const model = resolvedModelName || targetProduct.models.find(m => m.id === order.model_id)?.name || order.model_id;
  const color = order.color_id;

  const text = buildTelegramMessage({
    id: order.id,
    customerName: order.customer_name,
    phone: order.phone,
    governorate: order.governorate,
    address: order.address,
    productName,
    modelName: model,
    colorName: color,
    quantity: order.quantity,
    unitPrice: order.unit_price,
    totalPrice: order.total_price,
    createdAt: order.created_at,
    storeName: env.STORE_NAME_AR,
    sourceUrl: order.source_url || undefined,
    utmSource: order.utm_source || undefined,
    utmCampaign: order.utm_campaign || undefined,
  });

  try {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Telegram] Send failed for order ${order.id}. HTTP ${res.status}: ${errText}`);
      return { success: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error(`[Telegram] Bot API returned ok=false for order ${order.id}: ${data.description}`);
      return { success: false, error: data.description };
    }

    return { success: true };
  } catch (err: any) {
    console.error(`[Telegram] Exception sending order ${order.id}:`, err?.message || err);
    return { success: false, error: err?.message || String(err) };
  }
}
