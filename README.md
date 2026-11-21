# متجر الأناقة للساعات الجدارية الفاخرة (Abu Zahraa Store)

نظام هبوط ومعالجة طلبات متكامل، عالي الأداء والسرعة، ومخصص للسوق العراقي (RTL / Mobile-First)، مصمم للعمل مباشرة على **Cloudflare Workers with Static Assets** كخدمة واحدة سريعة واقتصادية، مع ربط متزامن وفوري بـ **Telegram Bot** و **Google Sheets** و **Meta Pixel + Conversions API (CAPI)** و **Cloudflare D1** لإدارة حالات التكرار وإعادة المحاولة التلقائية عبر Cron Triggers.

---

## 🌟 المميزات والمواصفات التقنية

1. **الواجهة الأمامية (Frontend - Mobile First):**
   - مطورة باستخدام **React 18** + **Vite** + **Tailwind CSS**.
   - دعم كامل للغة العربية والاتجاه من اليمين لليسار (`dir="rtl"`).
   - حجم صفحة خفيف جداً ومُحسّن ليعمل بسرعة فائقة حتى على شبكات الهاتف المتواضعة في المحافظات العراقية.
   - معرض صور تفاعلي مع إمكانية التبديل بين الزوايا والموديلات.
   - مصفوفة اختيار الموديل واللون والكمية مع حساب فوري وتلقائي للخصومات (وفر 10,000 د.ع عند طلب ساعتين، ووفر 21,000 د.ع عند طلب 3 ساعات).
   - نموذج طلب سريع: التحقق من أرقام الهواتف العراقية (11 رقماً، يبدأ بـ `07`) مع قائمة المحافظات الـ 18 العراقية.
   - حقل مصيدة بوتات (Honeypot) + دعم اختياري لـ Cloudflare Turnstile لمنع الهجمات المزعجة.
   - شريط الشراء السريع العائم (Sticky Fast-Buy Bar):
     `<aside class="sticky-bar" id="sticky-cta-bar" aria-label="شريط الشراء السريع">` مع تحديث السعر الفوري.
   - نافذة التأكيد المنبثقة وشاشة الشكر بعد إتمام الطلب.
   - **لوحة إدارة متكاملة للمتجر (`/admin`):** متابعة طلبات D1، فحص بوت التلغرام وميتا CAPI، تصدير CSV للإكسل، وإعادة إرسال الطلبات يدوياً.

2. **الواجهة الخلفية (Backend - Cloudflare Worker):**
   - مبني بالكامل على **Hono** و **TypeScript** مع تفعيل `nodejs_compat`.
   - لا يعتمد على خوادم Node أو Express أو MySQL، بل يعمل على بنية الحوسبة السحابية الموزعة (Serverless Edge) من Cloudflare.
   - التحقق الصارم من المدخلات باستخدام مكتبة **Zod** مع رسائل خطأ واضحة باللغة العربية.
   - **إعادة حساب الأسعار في السيرفر حصراً** استناداً لملف الإعدادات (`src/config/products.ts`) لمنع أي تلاعب بأسعار الشراء من جهة المتصفح.
   - حماية ضد تكرار الطلبات (Idempotency) باستخدام ترويسة `Idempotency-Key: <UUID>` وقاعدة بيانات SQLite الموزعة **Cloudflare D1**.
   - تحديد معدل الطلبات (Rate Limiting) بمعدل 8 طلبات في الدقيقة لكل IP لحماية السيرفر من الإغراق.

3. **التكامل المتزامن (Parallel Integrations):**
   - **Telegram Bot API:** إرسال إشعار فوري بتنسيق إيصال عربي مرتب، مع هروب الأحرف الخاصة لمنع ثغرات الحقن وتوقيت بغداد المحلي (`Asia/Baghdad`).
   - **Google Sheets Webhook:** إرسال فوري إلى Google Apps Script Web App مع رمز سري مشترك (`SHEETS_SECRET`) لمنع التكرار وحفظ البيانات.
   - الاستجابة للعميل بالنجاح إذا نجحت إحدى القناتين على الأقل، والاحتفاظ بالطلب في D1 إذا حدث انقطاع مؤقت لإعادة محاولته عبر الكرون.

4. **تتبع Meta Pixel و Conversions API (CAPI) الاحترافي:**
   - كود البيكسل الأساسي مدرج **Inline** في ترويسة `<head>` مع حقن `VITE_META_PIXEL_ID` أثناء البناء (Build time) لضمان إطلاق حدث `PageView` فور فتح الصفحة دون أي تأخير.
   - إطلاق أحداث: `PageView` (عند الفتح)، `ViewContent` (بعد 3 ثوان أو مع أول تمرير)، `InitiateCheckout` (عند بدء ملء النموذج)، `Purchase` (عند نجاح الطلب).
   - **Deduplication:** استخدام نفس معرف الحدث الفريد `event_id = "purchase-<orderId>"` في كل من بيكسل المتصفح (Browser Pixel) والسيرفر (Server CAPI).
   - تشفير بيانات العميل باستخدام **WebCrypto SHA-256**:
     - رقم الهاتف بصيغة E.164 الدولية (`9647XXXXXXXXX`).
     - الدولة (`iq`).
     - الاسم الأول والأخير والمعرف الخارجي (`orderId`).
   - استخراج وتمرير ملفات الارتباط `_fbp` و `_fbc` (مع بناء `fbc` تلقائياً من `fbclid` في حال عدم وجود الكوكي).
   - تحويل قيمة المبيعات إلى العملة المستهدفة (USD الافتراضي أو IQD) مع سعر صرف ديناميكي.
   - تسجيل استجابة ميتة ومسار التتبع (`fbtrace_id`) داخل قاعدة بيانات D1 لعرضها في السجلات ومنع ضياع الأحداث.

5. **المجدول التلقائي (Cron Trigger):**
   - يعمل كل 5 دقائق لمراجعة وإعادة إرسال أي طلب لم يصل إلى Telegram أو Google Sheets أو Meta CAPI (بحد أقصى 6 محاولات وخلال 24 ساعة).

---

## 📁 هيكلية المشروع (Project Structure)

```text
abu-zahraa/
├── .dev.vars.example           # نموذج المتغيرات السرية للتطوير المحلي
├── .env.example                # نموذج متغيرات البناء لـ Vite
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── wrangler.jsonc             # تكوين Cloudflare Workers والأصول وقاعدة بيانات D1 والكرون
├── migrations/
│   └── 0001_init.sql          # سكيما قاعدة بيانات D1 (الطلبات وحالات التكرار والـ Rate Limiting)
├── apps-script/
│   └── Code.gs                # كود Google Apps Script لاستقبال الطلبات في Google Sheets
├── src/
│   ├── config/
│   │   └── products.ts        # ملف إعدادات المنتجات (الأسماء، الأسعار، الصور، الموديلات، الألوان)
│   ├── shared/
│   │   └── types.ts           # الواجهات المشتركة وقائمة المحافظات الـ 18
│   ├── worker/                # كود Cloudflare Worker (Backend)
│   │   ├── index.ts           # مسارات Hono ومُعالج الـ Cron
│   │   ├── types.ts
│   │   ├── validation.ts      # مخطط Zod ودوال تطبيع الهاتف العراقي
│   │   └── services/
│   │       ├── db.ts          # استعلامات D1 للـ Idempotency وإعادة المحاولة
│   │       ├── telegram.ts    # إرسال الرسائل وبناء الإيصال العربي
│   │       ├── sheets.ts      # إرسال الطلبات إلى ويبهوك Google Sheets
│   │       ├── meta-capi.ts   # تشفير الهاشينغ وبناء حمولة Conversions API
│   │       └── rate-limiter.ts# محدد المعدل 8 طلبات/دقيقة بالاعتماد على D1
│   └── web/                   # كود الواجهة الأمامية (Frontend)
│       ├── index.html         # يحتوي على كود Meta Pixel الأساسي
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   ├── Header.tsx
│       │   ├── Hero.tsx
│       │   ├── Gallery.tsx
│       │   ├── ModelColorSelector.tsx
│       │   ├── Benefits.tsx
│       │   ├── OrderForm.tsx
│       │   ├── FAQ.tsx
│       │   ├── StickyBuyButton.tsx
│       │   ├── ThankYouView.tsx
│       │   └── Footer.tsx
│       └── utils/
│           ├── pixel.ts       # مكتبة إطلاق أحداث Meta Pixel
│           └── tracking.ts    # التقاط UTM و fbclid وملفات الارتباط
└── tests/                     # اختبارات الوحدة الشاملة (Vitest)
    ├── phone.test.ts
    ├── pricing.test.ts
    ├── idempotency.test.ts
    ├── meta-capi.test.ts
    └── telegram.test.ts
```

---

## 🛠️ دليل التثبيت والنشر خطوة بخطوة

### 1. تثبيت الحزم والمتطلبات
تأكد من وجود Node.js (الإصدار 18 أو أحدث) ثم نفذ:
```bash
npm install
```

### 2. تشغيل الاختبارات للتأكد من سلامة النظام
تم إعداد 18 اختبار وحدة لفحص أرقام الهواتف، وحساب الأسعار، والـ Idempotency، وتشفير CAPI، وتنسيق التلغرام:
```bash
npm run test
```

---

## 🤖 إعداد بوت التلغرام (Telegram Bot)

1. افتح تطبيق تلغرام وابحث عن بوت [@BotFather](https://t.me/BotFather).
2. أرسل الأمر `/newbot` واتبع التعليمات لاختيار اسم للبوت ومعرف (Username) ينتهي بـ `bot`.
3. انسخ الـ **Token** الذي يزودك به BotFather (مثال: `7123456789:AAHj...`).
4. أنشئ مجموعة (Group) أو قناة خاصة بك على التلغرام وأضف البوت فيها كمسؤول (Admin).
5. للحصول على معرف المجموعة (`TELEGRAM_CHAT_ID`):
   - أرسل أي رسالة تجريبية داخل المجموعة.
   - افتح الرابط التالي في المتصفح مع استبدال التوكن:
     `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - ابحث في النتيجة عن `"chat":{"id": -100xxxxxxxxxx}`، وانسخ الرقم (مع إشارة السالب إن وجدت).

---

## 📊 إعداد Google Sheets و Apps Script

1. افتح [Google Sheets](https://sheets.new) وأنشئ جدول بيانات جديد (سمّه مثلاً: "طلبات ساعات متجر الأناقة").
2. من القائمة العلوية اضغط على **الإضافات (Extensions)** > **Apps Script**.
3. احذف الكود الافتراضي والصق محتويات الملف `apps-script/Code.gs` الموجود في المشروع.
4. (اختياري) يمكنك تعديل الرمز السري `DEFAULT_SECRET` داخل الكود أو تركه كما هو، وتأكد من مطابقته للمتغير `SHEETS_SECRET`.
5. اضغط على زر **نشر (Deploy)** في الزاوية العلوية > **نشر جديد (New deployment)**.
6. اختر نوع النشر: **تطبيق ويب (Web app)**:
   - **الوصف (Description):** Orders Webhook
   - **تنفيذ باسم (Execute as):** أنا (`Me` - بريدك الإلكتروني)
   - **من يملك حق الوصول (Who has access):** أي شخص (`Anyone`)  *(هام جداً حتى يتمكن Cloudflare Worker من مراسلته)*.
7. اضغط **نشر (Deploy)** وامنح الأذونات المطلوبة لحساب Google الخاص بك.
8. انسخ رابط تطبيق الويب (**Web app URL**) لاستخدامه كـ `SHEETS_WEBHOOK_URL`.

---

## 🗄️ إعداد قاعدة بيانات Cloudflare D1

1. سجل الدخول إلى Cloudflare عبر سطر الأوامر:
   ```bash
   npx wrangler login
   ```
2. أنشئ قاعدة بيانات D1 جديدة للطلبات:
   ```bash
   npx wrangler d1 create orders-db
   ```
3. سيظهر لك سطر يوضح `database_id`، افتح ملف `wrangler.jsonc` واستبدل القيمة `REPLACE_WITH_YOUR_D1_DATABASE_ID` بالمعرف الحقيقي:
   ```jsonc
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "orders-db",
       "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
       "migrations_dir": "migrations"
     }
   ]
   ```
4. طبق سكيما الجداول محلياً أو على السحابة:
   ```bash
   # للتطبيق على السحابة (Production):
   npx wrangler d1 migrations apply orders-db --remote
   
   # أو للتطوير المحلي (Local):
   npx wrangler d1 migrations apply orders-db --local
   ```

---

## 🔑 ضبط المتغيرات والأسرار (Secrets & Environment Variables)

### أ. ملف التطوير المحلي (`.dev.vars`)
انسخ ملف `.dev.vars.example` إلى `.dev.vars` وضع القيم الخاصة بك:
```bash
cp .dev.vars.example .dev.vars
```
محتوى `.dev.vars`:
```ini
TELEGRAM_BOT_TOKEN="7123456789:AAHj..."
TELEGRAM_CHAT_ID="-1001234567890"
SHEETS_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbx.../exec"
SHEETS_SECRET="abu-zahraa-secure-sheets-token-2024"
META_PIXEL_ID="1234567890123456"
META_CAPI_ACCESS_TOKEN="EAA..."
META_API_VERSION="v21.0"
META_CURRENCY="USD"
USD_RATE="1310"
META_TEST_EVENT_CODE=""
```

### ب. تعيين الأسرار للإنتاج عبر Cloudflare (Production Secrets)
قم بتخزين المتغيرات السرية على بيئة Cloudflare Workers باستخدام الأمر:
```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put SHEETS_WEBHOOK_URL
npx wrangler secret put SHEETS_SECRET
npx wrangler secret put META_CAPI_ACCESS_TOKEN
npx wrangler secret put META_PIXEL_ID
```

### ج. متغير البيئة للواجهة الأمامية (`.env`)
أنشئ ملف `.env` في المجلد الرئيسي وضع معرف بيكسل ميتا الخاص بك:
```ini
VITE_META_PIXEL_ID="1234567890123456"
VITE_META_CURRENCY="USD"
VITE_USD_RATE="1310"
```

---

## 🚀 البناء والنشر (Build & Deploy)

1. قم ببناء الواجهة الأمامية:
   ```bash
   npm run build:client
   ```
   سيتم حقن كود البيكسل مباشرة داخل `dist/client/index.html` وتجهيز كافة الأصول الثابتة.

2. نشر المشروع بالكامل (الواجهة الأمامية + الباك إند + الـ Cron) بضغطة زر واحدة:
   ```bash
   npx wrangler deploy
   ```
   ستحصل فوراً على رابط العامل الحي الخاص بك، مثل:
   `https://abu-zahraa-store.<your-subdomain>.workers.dev`

---

## 🎯 التحقق من Meta Pixel و Conversions API (CAPI)

1. **Meta Pixel Helper (إضافة المتصفح Chrome):**
   - افتح رابط صفحة الهبوط في المتصفح.
   - ستلاحظ فوراً إشارة خضراء من إضافة Meta Pixel Helper تشير إلى تسجيل حدث `PageView`.
   - مرر الصفحة أو انتظر 3 ثوانٍ لملاحظة إطلاق حدث `ViewContent`.
   - اضغط على أول حقل في نموذج الطلب لملاحظة إطلاق حدث `InitiateCheckout`.

2. **التحقق من إلغاء التكرار (Deduplication) و Test Events:**
   - افتح **Meta Events Manager** > انتقل إلى البيكسل الخاص بك > اختر تبويب **Test Events (اختبار الأحداث)**.
   - انسخ رمز الاختبار المعروض هناك (مثال: `TEST12345`).
   - ضعه في متغير `META_TEST_EVENT_CODE="TEST12345"` (في `.dev.vars` أو عبر `wrangler secret put META_TEST_EVENT_CODE`).
   - قم بإجراء طلب تجريبي عبر صفحة الهبوط.
   - في نافذة **Test Events** في مدير أحداث ميتا، سترى وصول حدث `Purchase` من مصدرين:
     - **Browser** (عبر الجافا سكريبت في المتصفح).
     - **Server** (عبر Conversions API من Cloudflare Worker).
     - وستظهر بجانبهما علامة **Deduplicated (تم إلغاء التكرار)** بنجاح بفضل تطابق `event_id = "purchase-IQ-XXXXXX"`.

---

## 📝 تعديل بيانات المنتجات والأسعار

لتعديل اسم المنتج، الموديلات، الألوان، الأسعار، أو النصوص بدون لمس أي كود برمجي، يكفيك تعديل الملف:
`src/config/products.ts`

ثم إعادة البناء والنشر:
```bash
npm run deploy
```
يقوم السيرفر تلقائياً بإعادة حساب الأسعار ومنح الخصومات بناءً على هذا الملف حصراً.
