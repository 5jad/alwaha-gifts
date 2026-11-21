import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { Env, D1OrderRecord } from './types';
import { orderSchema, normalizeIraqiPhone, verifyTurnstileToken } from './validation';
import { OrderRepository, SettingsRepository, ProductRepository } from './services/db';
import { checkRateLimit, checkAdminLoginRateLimit } from './services/rate-limiter';
import { sendTelegramOrder } from './services/telegram';
import { sendSheetsOrder } from './services/sheets';
import { sendMetaCapiOrder, extractMetaCookies, computeMetaValueAndCurrency } from './services/meta-capi';
import { signAdminToken, verifyAdminToken } from './services/admin-auth';
import { PRODUCT, PRODUCTS, StorefrontProduct, STORE_CONFIG } from '../config/products';
import { OrderResponse, OrderSuccessResponse } from '../shared/types';

const app = new Hono<{ Bindings: Env }>();

// 1. Security Headers (applied to API routes to avoid mutating immutable static asset headers)
app.use('/api/*', secureHeaders({
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
      c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Idempotency-Key, Authorization, X-Admin-Token');
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

// GET /api/meta-config - Public Meta Pixel configuration synchronization
app.get('/api/meta-config', (c) => {
  return c.json({
    currency: c.env.META_CURRENCY || 'USD',
    usdRate: parseFloat(c.env.USD_RATE || '1520'),
    commissionPercent: parseFloat(c.env.PAYMENT_COMMISSION_PERCENT || '0')
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

  // 8. Server-Side Dynamic Catalog Matching & Price Recomputation
  const productRepo = new ProductRepository(c.env.DB);
  const dbProducts = await productRepo.getAllProducts(false);
  const activeCatalog = dbProducts.length > 0 ? dbProducts : PRODUCTS;
  const matchedProduct = activeCatalog.find((p) => p.id === data.productId) || PRODUCTS.find((p) => p.id === data.productId);
  if (!matchedProduct) {
    return c.json({
      success: false,
      error: 'المنتج المحدد غير متوفر حالياً.'
    }, 400);
  }

  const matchedModel = matchedProduct.models.find((m) => m.id === data.modelId);
  if (!matchedModel) {
    return c.json({
      success: false,
      error: 'الموديل المختار غير صالح أو غير متوفر لهذا المنتج.'
    }, 400);
  }

  const basePrice = matchedProduct.priceIQD;
  const qty = Math.max(1, Math.min(20, Math.floor(data.quantity)));
  let discountPerUnit = 0;
  if (qty === 2) discountPerUnit = 5000;
  else if (qty >= 3) discountPerUnit = 7000;
  const unitPriceIQD = Math.max(1000, basePrice - discountPerUnit);
  const totalPriceIQD = unitPriceIQD * qty;
  const pricing = { unitPriceIQD, totalPriceIQD };

  // Calculate synchronized Meta conversion value (default USD with 0% inflation)
  const { value: metaValue, currency: metaCurrency } = computeMetaValueAndCurrency(
    pricing.totalPriceIQD,
    c.env.META_CURRENCY || 'USD',
    c.env.USD_RATE || '1520',
    c.env.PAYMENT_COMMISSION_PERCENT || '0'
  );

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

  // 10. Run all external notification deliveries (Telegram, Sheets, Meta CAPI) in background
  // This keeps the user order response ultra-fast (<200ms) and prevents timeouts
  c.executionCtx.waitUntil((async () => {
    try {
      const settingsRepo = new SettingsRepository(c.env.DB);
      const dbSettings = await settingsRepo.getAllSettings();
      const effectiveEnv: Env = {
        ...c.env,
        TELEGRAM_CHAT_ID: c.env.TELEGRAM_CHAT_ID || dbSettings['telegram_chat_id'],
        SHEETS_WEBHOOK_URL: c.env.SHEETS_WEBHOOK_URL || dbSettings['sheets_webhook_url'],
        SHEETS_SECRET: c.env.SHEETS_SECRET || dbSettings['sheets_secret'],
      };

      const isTelegramConfigured = Boolean(effectiveEnv.TELEGRAM_BOT_TOKEN && effectiveEnv.TELEGRAM_CHAT_ID);
      const isSheetsConfigured = Boolean(effectiveEnv.SHEETS_WEBHOOK_URL);

      const [telegramResult, sheetsResult, capiResult] = await Promise.allSettled([
        isTelegramConfigured
          ? sendTelegramOrder(orderRecord, effectiveEnv, matchedProduct.productName, matchedModel.name)
          : Promise.resolve({ success: false }),
        isSheetsConfigured
          ? sendSheetsOrder(orderRecord, effectiveEnv, matchedProduct.productName, matchedModel.name)
          : Promise.resolve({ success: false }),
        sendMetaCapiOrder(orderRecord, effectiveEnv)
      ]);

      const telegramSent = telegramResult.status === 'fulfilled' && telegramResult.value.success ? 1 : 0;
      const sheetSent = sheetsResult.status === 'fulfilled' && sheetsResult.value.success ? 1 : 0;

      await repo.updateDeliveryStatus(orderId, {
        telegramSent: Boolean(telegramSent),
        sheetSent: Boolean(sheetSent)
      });

      if (capiResult.status === 'fulfilled') {
        await repo.updateMetaStatus(
          orderId,
          capiResult.value.success,
          capiResult.value.response,
          capiResult.value.error
        );
      }
    } catch (deliveryErr: any) {
      console.error(`[Order Delivery Background Error] Order ${orderId}:`, deliveryErr?.message || deliveryErr);
    }
  })());

  // 11. Immediate Success Response to Customer
  const successResponse: OrderSuccessResponse = {
    success: true,
    orderId,
    customerName: data.name,
    totalIQD: pricing.totalPriceIQD,
    quantity: data.quantity,
    modelName: matchedModel.name,
    colorName: data.colorId,
    governorate: data.governorate,
    phone: phoneInfo.normalized,
    message: 'تم استلام طلبك بنجاح! سيتصل بك مندوبنا لتأكيد التوصيل.',
    eventId: `purchase-${orderId}`,
    metaValue,
    metaCurrency
  };

  return c.json(successResponse, 200);
});

// ==========================================
// Admin API Routes
// ==========================================

// Global Admin Middleware protecting all /api/admin/* routes (except /login)
app.use('/api/admin/*', async (c, next) => {
  if (c.req.path === '/api/admin/login') {
    return next();
  }

  // Fail closed if required admin secrets are missing
  if (!c.env.ADMIN_PASSWORD || !c.env.ADMIN_SESSION_SECRET) {
    return c.json({
      success: false,
      error: 'لوحة التحكم غير مهيأة: يرجى ضبط المتغيرات السرية (ADMIN_PASSWORD و ADMIN_SESSION_SECRET).'
    }, 503);
  }

  const authHeader = c.req.header('authorization') || c.req.header('Authorization') || '';
  const adminTokenHeader = c.req.header('x-admin-token') || '';

  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  } else if (adminTokenHeader) {
    token = adminTokenHeader.trim();
  }

  if (!token) {
    return c.json({ success: false, error: 'غير مصرح بالوصول: يرجى تسجيل الدخول.' }, 401);
  }

  const expectedUsername = (c.env.ADMIN_USERNAME || 'admin').trim();
  const verification = await verifyAdminToken(token, c.env.ADMIN_SESSION_SECRET, expectedUsername);
  if (!verification.valid) {
    return c.json({
      success: false,
      error: verification.expired ? 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.' : 'رمز الدخول غير صالح.'
    }, 401);
  }

  (c as any).adminUsername = verification.username;
  await next();
});

// POST /api/admin/login
app.post('/api/admin/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';

  // Fail closed if secrets are missing
  if (!c.env.ADMIN_PASSWORD || !c.env.ADMIN_SESSION_SECRET) {
    return c.json({
      success: false,
      error: 'لوحة التحكم غير مهيأة: يرجى ضبط المتغيرات السرية (ADMIN_PASSWORD و ADMIN_SESSION_SECRET).'
    }, 503);
  }

  // Rate Limiting: 5 attempts per 15 minutes per IP
  const rateLimit = await checkAdminLoginRateLimit(c.env.DB, ip, 5, 15);
  if (!rateLimit.allowed) {
    return c.json({
      success: false,
      error: 'تم تجاوز الحد المسموح به لمحاولات الدخول (5 محاولات). يرجى الانتظار 15 دقيقة.'
    }, 429);
  }

  try {
    const body = await c.req.json() as any;
    const expectedUsername = (c.env.ADMIN_USERNAME || 'admin').trim();
    const expectedPassword = c.env.ADMIN_PASSWORD;

    if (body.username !== expectedUsername || body.password !== expectedPassword) {
      // Small delay on failure to resist brute force timing attacks
      await new Promise((r) => setTimeout(r, 600));
      return c.json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' }, 401);
    }

    const token = await signAdminToken(expectedUsername, c.env.ADMIN_SESSION_SECRET, 12);
    return c.json({
      success: true,
      authenticated: true,
      token,
      username: expectedUsername,
      message: 'تم تسجيل الدخول بنجاح.'
    });
  } catch {
    return c.json({ success: false, error: 'بيانات الدخول غير صالحة.' }, 400);
  }
});

// GET /api/admin/session
app.get('/api/admin/session', (c) => {
  return c.json({
    authenticated: true,
    username: (c as any).adminUsername || (c.env.ADMIN_USERNAME || 'admin').trim()
  });
});

// GET /api/admin/orders
app.get('/api/admin/orders', async (c) => {
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
  const orderId = c.req.param('id');
  const repo = new OrderRepository(c.env.DB);
  const order = await repo.getOrderById(orderId);

  if (!order) {
    return c.json({ success: false, error: 'الطلب غير موجود.' }, 404);
  }

  const settingsRepo = new SettingsRepository(c.env.DB);
  const dbSettings = await settingsRepo.getAllSettings();
  const effectiveEnv: Env = {
    ...c.env,
    TELEGRAM_CHAT_ID: c.env.TELEGRAM_CHAT_ID || dbSettings['telegram_chat_id'],
    SHEETS_WEBHOOK_URL: c.env.SHEETS_WEBHOOK_URL || dbSettings['sheets_webhook_url'],
    SHEETS_SECRET: c.env.SHEETS_SECRET || dbSettings['sheets_secret'],
  };

  const [tgRes, sheetRes, capiRes] = await Promise.all([
    sendTelegramOrder(order, effectiveEnv),
    sendSheetsOrder(order, effectiveEnv),
    sendMetaCapiOrder(order, effectiveEnv)
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
  const settingsRepo = new SettingsRepository(c.env.DB);
  const dbSettings = await settingsRepo.getAllSettings();
  const chatId = c.env.TELEGRAM_CHAT_ID || dbSettings['telegram_chat_id'];
  const hasToken = Boolean(c.env.TELEGRAM_BOT_TOKEN);
  const hasChatId = Boolean(chatId);

  return c.json({
    success: true,
    botConfigured: hasToken && hasChatId,
    chatId: chatId || null,
    message: hasToken && hasChatId
      ? 'بوت التلغرام ومعرف المحادثة مضبوطان وجاهزان لاستقبال الطلبات.'
      : 'إعدادات التلغرام غير مكتملة (اختياري، يمكنك إضافة معرف المحادثة من تبويب الإعدادات).'
  });
});

// POST /api/admin/telegram-test
app.post('/api/admin/telegram-test', async (c) => {
  const settingsRepo = new SettingsRepository(c.env.DB);
  const dbSettings = await settingsRepo.getAllSettings();
  const botToken = c.env.TELEGRAM_BOT_TOKEN;
  const chatId = c.env.TELEGRAM_CHAT_ID || dbSettings['telegram_chat_id'];

  if (!botToken || !chatId) {
    return c.json({ success: false, error: 'بيانات بوت التلغرام غير مكتملة (يرجى توفير Token ومعرف المحادثة).' }, 400);
  }

  try {
    const text = `🔔 <b>رسالة فحص تجريبية من لوحة إدارة المتجر</b>\n\nبوت التلغرام متصل بنجاح ومستعد لاستقبال طلبات الزبائن!`;
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML'
      }),
      signal: AbortSignal.timeout(8000)
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
  return c.json({
    success: true,
    pixelId: c.env.META_PIXEL_ID || null,
    capiConfigured: Boolean(c.env.META_PIXEL_ID && c.env.META_CAPI_ACCESS_TOKEN),
    apiVersion: c.env.META_API_VERSION || 'v21.0',
    currency: c.env.META_CURRENCY || 'USD',
    usdRate: c.env.USD_RATE || '1520',
    commissionPercent: c.env.PAYMENT_COMMISSION_PERCENT || '0',
    testEventCode: c.env.META_TEST_EVENT_CODE || null
  });
});

// ==========================================
// Settings Routes
// ==========================================

// GET /api/admin/settings
app.get('/api/admin/settings', async (c) => {
  const settings = new SettingsRepository(c.env.DB);
  const all = await settings.getAllSettings();
  return c.json({ success: true, settings: all });
});

// POST /api/admin/settings
app.post('/api/admin/settings', async (c) => {
  let body: Record<string, string>;
  try {
    body = await c.req.json() as Record<string, string>;
  } catch {
    return c.json({ success: false, error: 'بيانات غير صالحة.' }, 400);
  }
  const settings = new SettingsRepository(c.env.DB);
  const allowed = ['telegram_chat_id', 'sheets_webhook_url', 'sheets_secret', 'promise_strip'];
  for (const key of allowed) {
    if (key in body && typeof body[key] === 'string') {
      await settings.setSetting(key, body[key].trim());
    }
  }
  return c.json({ success: true, message: 'تم حفظ الإعدادات بنجاح.' });
});

// ==========================================
// Products Public Route
// ==========================================

// GET /api/products - public, returns D1 products and promise strip (or fallback)
app.get('/api/products', async (c) => {
  try {
    const repo = new ProductRepository(c.env.DB);
    const settingsRepo = new SettingsRepository(c.env.DB);
    const [dbProducts, promiseStripRaw] = await Promise.all([
      repo.getAllProducts(true),
      settingsRepo.getSetting('promise_strip')
    ]);
    let promiseStrip = null;
    if (promiseStripRaw) {
      try {
        promiseStrip = JSON.parse(promiseStripRaw);
      } catch {}
    }
    const products = dbProducts.length > 0 ? dbProducts : PRODUCTS;
    return c.json({ success: true, products, promiseStrip, source: dbProducts.length > 0 ? 'd1' : 'config' });
  } catch {
    return c.json({ success: true, products: PRODUCTS, source: 'config' });
  }
});

// ==========================================
// Admin Products Routes
// ==========================================

// GET /api/admin/products
app.get('/api/admin/products', async (c) => {
  const repo = new ProductRepository(c.env.DB);
  const dbProducts = await repo.getAllProducts(false);
  const dbIds = new Set(dbProducts.map((p) => p.id));
  const merged = [...dbProducts, ...PRODUCTS.filter((p) => !dbIds.has(p.id))];
  return c.json({ success: true, products: merged });
});

// POST /api/admin/products - create
app.post('/api/admin/products', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'بيانات غير صالحة.' }, 400);
  }
  if (!body.productName || !body.priceIQD) {
    return c.json({ success: false, error: 'الحقول المطلوبة: productName, priceIQD.' }, 400);
  }
  const id = body.id
    ? String(body.id).trim().toLowerCase().replace(/\s+/g, '-')
    : `product-${Date.now()}`;
  const product: StorefrontProduct = {
    id,
    isPublished: body.isPublished !== false,
    storeName: body.storeName || STORE_CONFIG.storeName,
    category: body.category || 'ساعة جدارية',
    productName: String(body.productName),
    nameAr: String(body.productName),
    tagline: body.tagline || '',
    description: body.description || '',
    priceIQD: Number(body.priceIQD),
    basePriceIQD: Number(body.priceIQD),
    compareAtPriceIQD: Number(body.compareAtPriceIQD || 0),
    features: Array.isArray(body.features) ? body.features : [],
    images: Array.isArray(body.images) ? body.images : [],
    models: Array.isArray(body.models) ? body.models : [],
  };
  const repo = new ProductRepository(c.env.DB);
  await repo.saveProduct(product);
  return c.json({ success: true, product, message: 'تم إضافة المنتج بنجاح.' });
});

// PUT /api/admin/products/:id - update
app.put('/api/admin/products/:id', async (c) => {
  const id = c.req.param('id');
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'بيانات غير صالحة.' }, 400);
  }
  const product: StorefrontProduct = {
    id,
    isPublished: body.isPublished !== false,
    storeName: body.storeName || STORE_CONFIG.storeName,
    category: body.category || 'ساعة جدارية',
    productName: String(body.productName || ''),
    nameAr: String(body.productName || ''),
    tagline: body.tagline || '',
    description: body.description || '',
    priceIQD: Number(body.priceIQD || 0),
    basePriceIQD: Number(body.priceIQD || 0),
    compareAtPriceIQD: Number(body.compareAtPriceIQD || 0),
    features: Array.isArray(body.features) ? body.features : [],
    images: Array.isArray(body.images) ? body.images : [],
    models: Array.isArray(body.models) ? body.models : [],
  };
  const repo = new ProductRepository(c.env.DB);
  await repo.saveProduct(product);
  return c.json({ success: true, product, message: 'تم تحديث المنتج بنجاح.' });
});

// DELETE /api/admin/products/:id
app.delete('/api/admin/products/:id', async (c) => {
  const id = c.req.param('id');
  const repo = new ProductRepository(c.env.DB);
  await repo.deleteProduct(id);
  return c.json({ success: true, message: 'تم حذف المنتج.' });
});

// Fallback route: serve static assets if ASSETS binding exists
app.all('*', async (c) => {
  if (c.env.ASSETS) {
    const res = await c.env.ASSETS.fetch(c.req.raw);
    return new Response(res.body, res);
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
    const settingsRepo = new SettingsRepository(env.DB);
    const dbSettings = await settingsRepo.getAllSettings();
    const effectiveEnv: Env = {
      ...env,
      TELEGRAM_CHAT_ID: env.TELEGRAM_CHAT_ID || dbSettings['telegram_chat_id'],
      SHEETS_WEBHOOK_URL: env.SHEETS_WEBHOOK_URL || dbSettings['sheets_webhook_url'],
      SHEETS_SECRET: env.SHEETS_SECRET || dbSettings['sheets_secret'],
    };

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
            const tgRes = await sendTelegramOrder(order, effectiveEnv);
            if (tgRes.success) {
              await repo.updateDeliveryStatus(order.id, { telegramSent: true });
              order.telegram_sent = 1;
              console.log(`[Cron] Order ${order.id} Telegram retry succeeded.`);
            }
          }

          // Retry Sheets if not sent
          if (!order.sheet_sent) {
            const sheetRes = await sendSheetsOrder(order, effectiveEnv);
            if (sheetRes.success) {
              await repo.updateDeliveryStatus(order.id, { sheetSent: true });
              order.sheet_sent = 1;
              console.log(`[Cron] Order ${order.id} Sheets retry succeeded.`);
            }
          }

          // Retry Meta CAPI if not sent
          if (!order.meta_sent) {
            const metaRes = await sendMetaCapiOrder(order, effectiveEnv);
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
