import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { Env, D1OrderRecord } from './types';
import { orderSchema, normalizeIraqiPhone, verifyTurnstileToken } from './validation';
import { OrderRepository } from './services/db';
import { checkRateLimit } from './services/rate-limiter';
import { sendTelegramOrder } from './services/telegram';
import { sendSheetsOrder } from './services/sheets';
import { sendMetaCapiOrder, extractMetaCookies } from './services/meta-capi';
import { calculateOrderPrice, PRODUCT, PRODUCTS } from '../config/products';
import { OrderResponse, OrderSuccessResponse } from '../shared/types';

const app = new Hono<{ Bindings: Env }>();

// 1. Security Headers
app.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// 2. Strict CORS (same origin / Worker domain)
app.use('/api/*', async (c, next) => {
  const origin = c.req.header('origin');
  const url = new URL(c.req.url);

  // If request has origin, allow only if same origin or local dev
  if (origin) {
    const originUrl = new URL(origin);
    const isSameHost = originUrl.host === url.host;
    const isLocalhost = originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1';
    
    if (isSameHost || isLocalhost) {
      c.res.headers.set('Access-Control-Allow-Origin', origin);
      c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key');
    } else {
      return c.json({ success: false, error: 'غير مصرح بالوصول عبر هذا النطاق (CORS)' }, 403);
    }
  }

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

// 3. Request Body Size Limit (max 64KB to prevent payload flooding)
app.use('/api/*', bodyLimit({
  maxSize: 64 * 1024,
  onError: (c) => c.json({ success: false, error: 'حجم الطلب تجاوز الحد المسموح به' }, 413),
}));

// Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    store: c.env.STORE_NAME_AR || PRODUCT.productName,
    time: new Date().toISOString()
  });
});

// POST /api/order - Order Processing Route
app.post('/api/order', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || '';
  const cookieHeader = c.req.header('cookie');
  const { fbp, fbc } = extractMetaCookies(cookieHeader);

  // 1. Rate Limiting Check (8 requests/min per IP)
  const rateLimit = await checkRateLimit(c.env.DB, ip, 8);
  if (!rateLimit.allowed) {
    console.warn(`[Security] Rate limit exceeded for IP: ${ip.slice(0, 7)}***`);
    return c.json({
      success: false,
      error: 'لقد تجاوزت الحد المسموح به للطلبات. يرجى الانتظار دقيقة واحدة ثم المحاولة مجدداً.'
    }, 429);
  }

  // 2. Validate Idempotency-Key Header
  const idempotencyKey = c.req.header('idempotency-key') || c.req.header('Idempotency-Key');
  if (!idempotencyKey || idempotencyKey.trim().length === 0) {
    return c.json({
      success: false,
      error: 'مفتاح عدم التكرار (Idempotency-Key) مفقود في ترويسة الطلب.'
    }, 400);
  }

  const repo = new OrderRepository(c.env.DB);

  // Check if order was already processed with this key
  const existingOrder = await repo.findByIdempotencyKey(idempotencyKey);
  if (existingOrder) {
    console.log(`[Order] Idempotent replay for key: ${idempotencyKey}, returning existing order: ${existingOrder.id}`);
    const existingProduct = PRODUCTS.find(p => p.id === existingOrder.product_id) || PRODUCT;
    const model = existingProduct.models.find(m => m.id === existingOrder.model_id)?.name || existingOrder.model_id;
    const color = existingOrder.color_id;

    const response: OrderResponse = {
      success: true,
      orderId: existingOrder.id,
      customerName: existingOrder.customer_name,
      totalIQD: existingOrder.total_price,
      quantity: existingOrder.quantity,
      modelName: model,
      colorName: color,
      governorate: existingOrder.governorate,
      phone: existingOrder.phone,
      message: 'تم استلام طلبك بنجاح مسبقاً!',
      eventId: `purchase-${existingOrder.id}`
    };
    return c.json(response, 200);
  }

  // 3. Parse JSON Body
  let rawBody: any;
  try {
    rawBody = await c.req.json();
  } catch (err) {
    return c.json({ success: false, error: 'صيغة البيانات المرسلة غير صالحة (Invalid JSON)' }, 400);
  }

  // 4. Honeypot Field Check (reject bots silently with a mock success)
  if (rawBody.website_url_hp && String(rawBody.website_url_hp).trim().length > 0) {
    console.warn('[Security] Bot detected via honeypot field');
    return c.json({
      success: true,
      orderId: 'IQ-BOT-FILTERED',
      message: 'تم استلام طلبك بنجاح!',
      eventId: 'purchase-bot'
    }, 200);
  }

  // 5. Cloudflare Turnstile Verification (if configured)
  if (c.env.TURNSTILE_SECRET) {
    const isTurnstileValid = await verifyTurnstileToken(
      rawBody.turnstileToken,
      c.env.TURNSTILE_SECRET,
      ip
    );
    if (!isTurnstileValid) {
      return c.json({
        success: false,
        error: 'فشل التحقق الأمني (Turnstile). يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.'
      }, 400);
    }
  }

  // 6. Zod Schema Validation
  const validationResult = orderSchema.safeParse(rawBody);
  if (!validationResult.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validationResult.error.issues) {
      const field = issue.path[0] ? String(issue.path[0]) : 'general';
      if (!fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    const firstErrorMessage = validationResult.error.issues[0]?.message || 'يرجى مراجعة البيانات المدخلة';
    return c.json({
      success: false,
      error: firstErrorMessage,
      fieldErrors
    }, 422);
  }

  const data = validationResult.data;

  // 7. Normalize Iraqi Phone
  const phoneInfo = normalizeIraqiPhone(data.phone);
  if (!phoneInfo.isValid) {
    return c.json({
      success: false,
      error: phoneInfo.error || 'رقم الهاتف العراقي غير صالح'
    }, 422);
  }

  // 8. Server-Side Price Recomputation (NEVER trust client prices)
  const pricing = calculateOrderPrice(data.productId, data.quantity);
  const now = Math.floor(Date.now() / 1000);
  // Generate short, unique Order ID e.g. IQ-829104
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  const orderId = `IQ-${randomSuffix}`;

  // 9. Insert Order into D1 with initial flags = 0
  const orderRecord: D1OrderRecord = {
    id: orderId,
    idempotency_key: idempotencyKey,
    customer_name: data.name,
    phone: phoneInfo.normalized,
    governorate: data.governorate,
    address: data.address,
    product_id: data.productId,
    model_id: data.modelId,
    color_id: data.colorId,
    quantity: data.quantity,
    unit_price: pricing.unitPriceIQD,
    total_price: pricing.totalPriceIQD,
    source_url: data.sourceUrl || null,
    utm_source: data.utmSource || null,
    utm_medium: data.utmMedium || null,
    utm_campaign: data.utmCampaign || null,
    fbclid: data.fbclid || null,
    fbp: data.fbp || fbp || null,
    fbc: data.fbc || fbc || null,
    ip_address: ip,
    user_agent: userAgent,
    telegram_sent: 0,
    sheet_sent: 0,
    meta_sent: 0,
    retry_count: 0,
    last_retry_at: null,
    meta_response: null,
    meta_error: null,
    created_at: now
  };

  try {
    await repo.createOrder({
      id: orderRecord.id,
      idempotencyKey: orderRecord.idempotency_key,
      customerName: orderRecord.customer_name,
      phone: orderRecord.phone,
      governorate: orderRecord.governorate,
      address: orderRecord.address,
      productId: orderRecord.product_id,
      modelId: orderRecord.model_id,
      colorId: orderRecord.color_id,
      quantity: orderRecord.quantity,
      unitPrice: orderRecord.unit_price,
      totalPrice: orderRecord.total_price,
      sourceUrl: orderRecord.source_url || undefined,
      utmSource: orderRecord.utm_source || undefined,
      utmMedium: orderRecord.utm_medium || undefined,
      utmCampaign: orderRecord.utm_campaign || undefined,
      fbclid: orderRecord.fbclid || undefined,
      fbp: orderRecord.fbp || undefined,
      fbc: orderRecord.fbc || undefined,
      ipAddress: orderRecord.ip_address || undefined,
      userAgent: orderRecord.user_agent || undefined,
      createdAt: orderRecord.created_at
    });
  } catch (dbErr: any) {
    console.error('[D1] Error inserting order:', dbErr?.message || dbErr);
    return c.json({
      success: false,
      error: 'تعذر حفظ بيانات الطلب، يرجى المحاولة مرة أخرى.'
    }, 500);
  }

  // 10. Send to Telegram AND Google Sheets in Parallel
  const [telegramResult, sheetsResult] = await Promise.all([
    sendTelegramOrder(orderRecord, c.env),
    sendSheetsOrder(orderRecord, c.env)
  ]);

  // Update D1 delivery flags
  await repo.updateDeliveryStatus(orderId, {
    telegramSent: telegramResult.success,
    sheetSent: sheetsResult.success
  });

  // 11. Check delivery outcome: Must succeed in at least ONE of Telegram or Sheets
  const atLeastOneSucceeded = telegramResult.success || sheetsResult.success;

  if (!atLeastOneSucceeded) {
    console.error(`[Order] Both Telegram and Sheets failed for order ${orderId}. Order retained in D1 for cron retry.`);
    return c.json({
      success: false,
      error: 'حدث خطأ مؤقت في استقبال الطلب. طلبك محفوظ في النظام وسيقوم فريقنا بمراجعته أو يمكنك المحاولة لاحقاً.'
    }, 503);
  }

  // 12. Run Meta Conversions API (CAPI) inside ctx.waitUntil()
  c.executionCtx.waitUntil((async () => {
    try {
      const capiResult = await sendMetaCapiOrder(orderRecord, c.env);
      await repo.updateMetaStatus(
        orderId,
        capiResult.success,
        capiResult.response,
        capiResult.error
      );
    } catch (capiErr: any) {
      console.error(`[Meta CAPI] waitUntil exception for order ${orderId}:`, capiErr?.message || capiErr);
      await repo.updateMetaStatus(orderId, false, undefined, capiErr?.message || String(capiErr));
    }
  })());

  // 13. Success Response to Customer
  const targetProduct = PRODUCTS.find(p => p.id === data.productId) || PRODUCT;
  const modelName = targetProduct.models.find(m => m.id === data.modelId)?.name || data.modelId;
  const colorName = data.colorId;

  const successResponse: OrderSuccessResponse = {
    success: true,
    orderId,
    customerName: data.name,
    totalIQD: pricing.totalPriceIQD,
    quantity: data.quantity,
    modelName,
    colorName,
    governorate: data.governorate,
    phone: phoneInfo.normalized,
    message: 'تم استلام طلبك بنجاح! سيتصل بك مندوبنا لتأكيد التوصيل.',
    eventId: `purchase-${orderId}`
  };

  return c.json(successResponse, 200);
});

// ==========================================
// Admin API Routes
// ==========================================

function verifyAdminAuth(c: any): boolean {
  const authHeader = c.req.header('authorization') || c.req.header('Authorization') || '';
  const adminTokenHeader = c.req.header('x-admin-token') || '';
  const expectedPassword = c.env.ADMIN_PASSWORD || 'admin123456';

  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (adminTokenHeader) {
    token = adminTokenHeader.trim();
  }

  // Token is validated if it matches expected password or encoded token
  return Boolean(token && (token === expectedPassword || token === btoa(`admin:${expectedPassword}`)));
}

// POST /api/admin/login
app.post('/api/admin/login', async (c) => {
  try {
    const body = await c.req.json() as any;
    const expectedUsername = c.env.ADMIN_USERNAME || 'admin';
    const expectedPassword = c.env.ADMIN_PASSWORD || 'admin123456';

    if (body.username === expectedUsername && body.password === expectedPassword) {
      const token = btoa(`admin:${expectedPassword}`);
      return c.json({
        success: true,
        authenticated: true,
        token,
        username: expectedUsername,
        message: 'تم تسجيل الدخول بنجاح.'
      });
    }

    return c.json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' }, 401);
  } catch {
    return c.json({ success: false, error: 'بيانات الدخول غير صالحة.' }, 400);
  }
});

// GET /api/admin/session
app.get('/api/admin/session', (c) => {
  const isAuthed = verifyAdminAuth(c);
  return c.json({
    authenticated: isAuthed,
    username: isAuthed ? (c.env.ADMIN_USERNAME || 'admin') : null
  });
});

// GET /api/admin/orders
app.get('/api/admin/orders', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ success: false, error: 'غير مصرح بالوصول.' }, 401);
  }

  const repo = new OrderRepository(c.env.DB);
  const orders = await repo.getAllOrders(200);

  const totalOrders = orders.length;
  const totalRevenueIQD = orders.reduce((sum, o) => sum + (o.total_price || 0), 0);

  return c.json({
    success: true,
    totalOrders,
    totalRevenueIQD,
    orders
  });
});

// POST /api/admin/orders/:id/retry
app.post('/api/admin/orders/:id/retry', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ success: false, error: 'غير مصرح بالوصول.' }, 401);
  }

  const orderId = c.req.param('id');
  const repo = new OrderRepository(c.env.DB);
  const order = await repo.getOrderById(orderId);

  if (!order) {
    return c.json({ success: false, error: 'الطلب غير موجود.' }, 404);
  }

  const [tgRes, sheetRes, capiRes] = await Promise.all([
    sendTelegramOrder(order, c.env),
    sendSheetsOrder(order, c.env),
    sendMetaCapiOrder(order, c.env)
  ]);

  await repo.updateDeliveryStatus(order.id, {
    telegramSent: tgRes.success,
    sheetSent: sheetRes.success
  });
  await repo.updateMetaStatus(order.id, capiRes.success, capiRes.response, capiRes.error);

  return c.json({
    success: true,
    orderId: order.id,
    telegram: tgRes,
    sheets: sheetRes,
    meta: capiRes
  });
});

// GET /api/admin/orders/export
app.get('/api/admin/orders/export', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.text('Unauthorized', 401);
  }

  const repo = new OrderRepository(c.env.DB);
  const orders = await repo.getAllOrders(1000);

  const header = ['رقم الطلب', 'تاريخ الطلب', 'العميل', 'الهاتف', 'المحافظة', 'العنوان', 'المنتج', 'الموديل', 'اللون', 'الكمية', 'سعر المفرد', 'المجموع الكلي', 'التلغرام', 'الشيتس', 'ميتا'];
  const rows = orders.map((o) => [
    `"${o.id}"`,
    `"${new Date(o.created_at * 1000).toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' })}"`,
    `"${o.customer_name.replace(/"/g, '""')}"`,
    `"'${o.phone}"`,
    `"${o.governorate}"`,
    `"${o.address.replace(/"/g, '""')}"`,
    `"${o.product_id}"`,
    `"${o.model_id}"`,
    `"${o.color_id}"`,
    o.quantity,
    o.unit_price,
    o.total_price,
    o.telegram_sent ? 'تم الإرسال' : 'فشل',
    o.sheet_sent ? 'تم الإرسال' : 'فشل',
    o.meta_sent ? 'تم الإرسال' : 'فشل'
  ]);

  const csvContent = '\uFEFF' + [header.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    }
  });
});

// GET /api/admin/telegram-status
app.get('/api/admin/telegram-status', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ success: false, error: 'غير مصرح بالوصول.' }, 401);
  }

  const hasToken = Boolean(c.env.TELEGRAM_BOT_TOKEN);
  const hasChatId = Boolean(c.env.TELEGRAM_CHAT_ID);

  return c.json({
    success: true,
    botConfigured: hasToken && hasChatId,
    chatId: c.env.TELEGRAM_CHAT_ID || null,
    message: hasToken && hasChatId
      ? 'بوت التلغرام ومعرف المحادثة مضبوطان وجاهزان لاستقبال الطلبات.'
      : 'إعدادات التلغرام غير مكتملة (يرجى تعيين TELEGRAM_BOT_TOKEN و TELEGRAM_CHAT_ID).'
  });
});

// POST /api/admin/telegram-test
app.post('/api/admin/telegram-test', async (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ success: false, error: 'غير مصرح بالوصول.' }, 401);
  }

  if (!c.env.TELEGRAM_BOT_TOKEN || !c.env.TELEGRAM_CHAT_ID) {
    return c.json({ success: false, error: 'بيانات بوت التلغرام غير مكتملة.' }, 400);
  }

  try {
    const text = `🔔 <b>رسالة فحص تجريبية من لوحة إدارة المتجر</b>\n\nبوت التلغرام متصل بنجاح ومستعد لاستقبال طلبات الزبائن!`;
    const res = await fetch(`https://api.telegram.org/bot${c.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: c.env.TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML'
      })
    });

    const data = await res.json() as any;
    if (res.ok && data.ok) {
      return c.json({ success: true, message: 'تم إرسال رسالة الاختبار بنجاح إلى التلغرام!' });
    }
    return c.json({ success: false, error: data.description || 'فشل إرسال رسالة التلغرام' }, 400);
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'خطأ في الاتصال بتلغرام' }, 500);
  }
});

// GET /api/admin/meta-status
app.get('/api/admin/meta-status', (c) => {
  if (!verifyAdminAuth(c)) {
    return c.json({ success: false, error: 'غير مصرح بالوصول.' }, 401);
  }

  return c.json({
    success: true,
    pixelId: c.env.META_PIXEL_ID || null,
    capiConfigured: Boolean(c.env.META_PIXEL_ID && c.env.META_CAPI_ACCESS_TOKEN),
    apiVersion: c.env.META_API_VERSION || 'v21.0',
    currency: c.env.META_CURRENCY || 'USD',
    usdRate: c.env.USD_RATE || '1310',
    testEventCode: c.env.META_TEST_EVENT_CODE || null
  });
});

// Fallback route: serve static assets if ASSETS binding exists
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

/**
 * Cloudflare Worker Export with fetch and scheduled (Cron Trigger)
 */
export default {
  fetch: app.fetch,

  /**
   * Cron Trigger: Runs every 5 minutes to retry failed deliveries
   */
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log(`[Cron] Retry job triggered at ${new Date(event.scheduledTime).toISOString()}`);
    const repo = new OrderRepository(env.DB);

    try {
      // Find orders where any channel failed (telegram_sent=0 OR sheet_sent=0 OR meta_sent=0)
      const pendingOrders = await repo.getOrdersForRetry(86400, 20);
      if (pendingOrders.length === 0) {
        console.log('[Cron] No pending orders requiring retry.');
        return;
      }

      console.log(`[Cron] Found ${pendingOrders.length} pending orders to retry.`);

      for (const order of pendingOrders) {
        try {
          // Increment retry attempt counter
          await repo.incrementRetryCount(order.id);

          // Retry Telegram if not sent
          if (!order.telegram_sent) {
            const tgRes = await sendTelegramOrder(order, env);
            if (tgRes.success) {
              await repo.updateDeliveryStatus(order.id, { telegramSent: true });
              order.telegram_sent = 1;
              console.log(`[Cron] Order ${order.id} Telegram retry succeeded.`);
            }
          }

          // Retry Sheets if not sent
          if (!order.sheet_sent) {
            const sheetRes = await sendSheetsOrder(order, env);
            if (sheetRes.success) {
              await repo.updateDeliveryStatus(order.id, { sheetSent: true });
              order.sheet_sent = 1;
              console.log(`[Cron] Order ${order.id} Sheets retry succeeded.`);
            }
          }

          // Retry Meta CAPI if not sent
          if (!order.meta_sent) {
            const metaRes = await sendMetaCapiOrder(order, env);
            await repo.updateMetaStatus(order.id, metaRes.success, metaRes.response, metaRes.error);
            if (metaRes.success) {
              console.log(`[Cron] Order ${order.id} Meta CAPI retry succeeded.`);
            }
          }
        } catch (itemErr: any) {
          console.error(`[Cron] Error processing retry for order ${order.id}:`, itemErr?.message || itemErr);
        }
      }
    } catch (err: any) {
      console.error('[Cron] Fatal error in retry worker:', err?.message || err);
    }
  }
};
