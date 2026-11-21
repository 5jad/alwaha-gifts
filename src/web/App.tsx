import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  Check,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  Truck,
} from "lucide-react";
import {
  formatIQD,
  PRODUCTS,
  STORE_CONFIG,
  StorefrontProduct,
  calculateOrderPrice,
} from "../config/products";
import ProductCards from "./components/ProductCards";
import ProductGallery from "./components/ProductGallery";
import PrivacySettings from "./components/PrivacySettings";
import { IRAQ_GOVERNORATES, OrderSuccessResponse } from "../shared/types";
import { initTracking, TrackingParams } from "./utils/tracking";
import { MetaPixel } from "./utils/pixel";
import { normalizeIraqiPhone } from "../worker/validation";

type OrderForm = {
  name: string;
  phone: string;
  governorate: string;
  address: string;
  modelId: string;
  color: string;
  quantity: number;
  website: string;
};

const initialForm: OrderForm = {
  name: "",
  phone: "",
  governorate: IRAQ_GOVERNORATES[0],
  address: "",
  modelId: "",
  color: "",
  quantity: 1,
  website: "",
};

function StoreHeader({
  storeName,
  hasSelection,
}: {
  storeName: string;
  hasSelection: boolean;
}) {
  return (
    <>
      <div className="announcement">
        <span className="announcement-dot" /> {storeName} — ساعات جدارية بتفاصيل تختارها بعناية
      </div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label={storeName}>
          <span className="brand-mark">
            <Clock3 size={20} strokeWidth={1.6} />
          </span>
          <span>
            <strong>{storeName}</strong>
            <small>ساعات جدارية فاخرة</small>
          </span>
        </a>
        <nav className="desktop-nav" aria-label="التنقل الرئيسي">
          <a href="#product-selection">اختيار الساعة</a>
          {hasSelection && (
            <>
              <a href="#details">التفاصيل والمواصفات</a>
              <a href="#order">إتمام الطلب</a>
            </>
          )}
        </nav>
        <a
          className="header-cta"
          href={hasSelection ? "#order" : "#product-selection"}
        >
          {hasSelection ? "اطلبها الآن" : "اختار ساعتك"} <ArrowLeft size={16} />
        </a>
      </header>
    </>
  );
}

export default function App() {
  const [selectedProductId, setSelectedProductId] = useState<string>(PRODUCTS[0].id);
  const [form, setForm] = useState<OrderForm>(initialForm);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmationOrderId, setConfirmationOrderId] = useState("");
  const [confirmationAmount, setConfirmationAmount] = useState(0);
  const [tracking, setTracking] = useState<TrackingParams>({ sourceUrl: "" });
  const [trackingEnabled, setTrackingEnabled] = useState(true);

  const requestKey = useRef<string | null>(null);
  const hasFiredInitiateCheckout = useRef(false);
  const viewedProducts = useRef(new Set<string>());

  const product = PRODUCTS.find((item) => item.id === selectedProductId) ?? PRODUCTS[0];
  const selectedModel = product.models.find((model) => model.id === form.modelId) ?? product.models[0];
  const storeName = STORE_CONFIG.storeName;

  // Initialize tracking & capture UTMs
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";

    const params = initTracking();
    setTracking(params);
  }, []);

  // Set default model and color when product changes
  useEffect(() => {
    if (product && product.models.length > 0) {
      const firstModel = product.models[0];
      setForm((current) => ({
        ...current,
        modelId: firstModel.id,
        color: firstModel.colors[0] || "",
      }));
    }
  }, [product.id]);

  // ViewContent tracking
  useEffect(() => {
    if (!product || viewedProducts.current.has(product.id)) return;
    const currency = import.meta.env.VITE_META_CURRENCY || "USD";
    const usdRate = parseFloat(import.meta.env.VITE_USD_RATE || "1310");
    const val = currency === "IQD" ? product.priceIQD : Number((product.priceIQD / usdRate).toFixed(2));

    MetaPixel.viewContent(product.productName, Math.max(0.01, val), currency);
    viewedProducts.current.add(product.id);
  }, [product.id, product.productName, product.priceIQD]);

  function update(key: keyof OrderForm, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectProduct(next: StorefrontProduct) {
    if (sending || next.id === selectedProductId) return;
    setSelectedProductId(next.id);
    setResult(null);
    requestKey.current = null;
  }

  function handleFormFocus() {
    if (!hasFiredInitiateCheckout.current) {
      hasFiredInitiateCheckout.current = true;
      const pricing = calculateOrderPrice(product.id, form.quantity);
      const currency = import.meta.env.VITE_META_CURRENCY || "USD";
      const usdRate = parseFloat(import.meta.env.VITE_USD_RATE || "1310");
      const val = currency === "IQD" ? pricing.totalPriceIQD : Number((pricing.totalPriceIQD / usdRate).toFixed(2));
      MetaPixel.initiateCheckout(Math.max(0.01, val), currency);
    }
  }

  function scrollToOrder() {
    handleFormFocus();
    document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.getElementById("customer-name")?.focus({ preventScroll: true }), 400);
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !product) return;

    // Validate phone
    const phoneValidation = normalizeIraqiPhone(form.phone);
    if (!phoneValidation.isValid) {
      setResult({
        type: "error",
        message: phoneValidation.error || "يرجى إدخال رقم هاتف عراقي صحيح يتكون من 11 رقماً (مثال: 07701234567)",
      });
      return;
    }

    if (!form.name.trim() || form.name.trim().length < 3) {
      setResult({ type: "error", message: "يرجى إدخال الاسم الكامل (3 أحرف على الأقل)" });
      return;
    }

    if (!form.address.trim() || form.address.trim().length < 5) {
      setResult({ type: "error", message: "يرجى كتابة العنوان بالتفصيل (المنطقة، أقرب نقطة دالة)" });
      return;
    }

    requestKey.current ??= typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : "req-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": requestKey.current,
        },
        body: JSON.stringify({
          productId: product.id,
          name: form.name.trim(),
          phone: phoneValidation.normalized,
          governorate: form.governorate,
          address: form.address.trim(),
          modelId: form.modelId,
          colorId: form.color,
          quantity: form.quantity,
          website_url_hp: form.website,
          sourceUrl: tracking.sourceUrl,
          utmSource: tracking.utmSource,
          utmMedium: tracking.utmMedium,
          utmCampaign: tracking.utmCampaign,
          utmContent: tracking.utmContent,
          utmTerm: tracking.utmTerm,
          fbclid: tracking.fbclid,
          fbp: tracking.fbp,
          fbc: tracking.fbc,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as OrderSuccessResponse | { success: false; error?: string };

      if (!response.ok || !data.success) {
        throw new Error((data as any).error || "تعذر إرسال الطلب. حاول مرة ثانية بعد قليل.");
      }

      const successData = data as OrderSuccessResponse;

      // Fire Meta Pixel Purchase
      const currency = import.meta.env.VITE_META_CURRENCY || "USD";
      const usdRate = parseFloat(import.meta.env.VITE_USD_RATE || "1310");
      const val = currency === "IQD" ? successData.totalIQD : Number((successData.totalIQD / usdRate).toFixed(2));

      MetaPixel.purchase({
        orderId: successData.orderId,
        value: Math.max(0.01, val),
        currency,
        productId: product.id,
        quantity: successData.quantity,
      });

      requestKey.current = null;
      setResult(null);
      setConfirmationAmount(successData.totalIQD);
      setConfirmationOrderId(successData.orderId);
      setForm(initialForm);
    } catch (error) {
      setResult({
        type: "error",
        message: error instanceof Error ? error.message : "صار خطأ غير متوقع. حاول مرة ثانية.",
      });
    } finally {
      setSending(false);
    }
  }

  const pricing = calculateOrderPrice(product.id, form.quantity);
  const currentProductIdx = PRODUCTS.findIndex((p) => p.id === product.id) + 1;

  return (
    <main className="store-page">
      <StoreHeader storeName={storeName} hasSelection={Boolean(product)} />

      {/* 1. Clock Selection Cards (Exact previous design) */}
      <ProductCards
        id="product-selection"
        products={PRODUCTS}
        selectedProductId={product.id}
        onSelect={selectProduct}
        disabled={sending}
      />

      {/* 2. Selected Clock Presentation */}
      <div className="selected-clock-content" key={product.id}>
        {/* Hero Section */}
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> {product.category}
            </p>
            <h1>
              {product.tagline}
              <br />
              <em>من {storeName}.</em>
            </h1>
            <p className="hero-description">{product.description}</p>
            <div className="hero-price">
              <span>السعر</span>
              <strong>{formatIQD(product.priceIQD)}</strong>
            </div>
            <div className="hero-actions">
              <button className="primary-button" onClick={scrollToOrder}>
                أكمل طلبك <ArrowLeft size={18} />
              </button>
              <a className="text-link" href="#details">
                اكتشف التفاصيل <ArrowDown size={15} />
              </a>
            </div>
            <div className="hero-note">
              <ShieldCheck size={17} />
              <span>بيانات طلبك تُرسل للتاجر لتأكيده فقط — الدفع عند الاستلام مع المعاينة.</span>
            </div>
          </div>

          <div className="hero-visual" aria-label={`معرض صور ${product.productName}`}>
            <div className="visual-glow" />
            <ProductGallery key={product.id} images={product.images} productName={product.productName} />
            <div className="visual-caption">
              <span>{storeName}</span>
              <span>{product.productName}</span>
            </div>
            <div className="vertical-label">ABU ZAHRAA CLOCKS</div>
          </div>

          <div className="hero-index">
            <span>{String(currentProductIdx).padStart(2, "0")}</span>
            <i />
            <span>{String(PRODUCTS.length).padStart(2, "0")}</span>
          </div>
        </section>

        {/* Promise Strip */}
        <section className="promise-strip" id="story">
          <div>
            <span className="promise-icon">
              <Truck size={19} />
            </span>
            <p>
              <strong>تأكيد مباشر وتوصيل مجاني</strong>
              <small>مندوبنا يتواصل وياك ويصل لباب بيتك مجاناً</small>
            </p>
          </div>
          <div>
            <span className="promise-icon">
              <ShieldCheck size={19} />
            </span>
            <p>
              <strong>فحص ومعاينة قبل الدفع</strong>
              <small>افتح الطرد وافحص الساعة كاملة قبل تسليم المبلغ</small>
            </p>
          </div>
          <div>
            <span className="promise-icon">
              <Clock3 size={19} />
            </span>
            <p>
              <strong>ماكينة صامتة 100%</strong>
              <small>حركة كوارتز انسيابية ناعمة بدون دقات مزعجة</small>
            </p>
          </div>
        </section>

        {/* Details Section */}
        <section className="details-section" id="details">
          <div className="section-heading">
            <p className="eyebrow">تفاصيل المنتج والمواصفات</p>
            <h2>{product.productName}</h2>
            <p>مواصفات الساعة الجدارية ومميزاتها الأصلية مع ضمان تشغيلي لمدة سنة كاملة.</p>
          </div>
          <div className="feature-list">
            {product.features.map((feature, index) => (
              <div className="feature-row" key={`${feature}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{feature}</p>
                <Check size={17} />
              </div>
            ))}
          </div>
        </section>

        {/* Order Section */}
        <section className="order-section" id="order">
          <div className="order-intro">
            <p className="eyebrow">خطوة أخيرة</p>
            <h2>
              خلّينا نثبت
              <br />
              <em>طلبك.</em>
            </h2>
            <p>اكتب معلوماتك، ونوصل الطلب للتاجر حتى يتواصل وياك ويأكد العنوان والتفاصيل.</p>
            <div className="order-summary">
              <div>
                <span>المنتج</span>
                <strong>{product.productName}</strong>
              </div>
              <div>
                <span>المجموع النهائي</span>
                <strong>{formatIQD(pricing.totalPriceIQD)}</strong>
              </div>
            </div>
            {form.quantity >= 2 && (
              <p className="setup-price-note">
                🎉 تم تطبيق خصم الكمية! (سعر الساعة: {formatIQD(pricing.unitPriceIQD)})
              </p>
            )}
          </div>

          <form
            className="order-form manus-no-record"
            id="order-form"
            onSubmit={submitOrder}
            onFocus={handleFormFocus}
          >
            <div className="form-heading">
              <h3>معلومات الطلب</h3>
              <span>الحقول بعلامة * مطلوبة</span>
            </div>

            <label htmlFor="customer-name">
              الاسم الكامل <b>*</b>
            </label>
            <input
              id="customer-name"
              name="name"
              autoComplete="name"
              required
              minLength={3}
              maxLength={80}
              placeholder="اكتب اسمك الكامل"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />

            <label htmlFor="customer-phone">
              رقم الهاتف <b>*</b>
            </label>
            <input
              id="customer-phone"
              name="phone"
              autoComplete="tel-national"
              type="tel"
              inputMode="numeric"
              dir="ltr"
              required
              minLength={10}
              maxLength={15}
              placeholder="07701234567"
              value={form.phone}
              onChange={(event) => update("phone", event.target.value)}
            />
            <p id="phone-field-hint" className="phone-field-hint">
              ١١ رقمًا بالضبط، يبدأ بـ 07 بدون رمز الدولة +964 (مثال: 07701234567).
            </p>

            <div className="form-row">
              <div className="field">
                <label htmlFor="clock-model">
                  الموديل <b>*</b>
                </label>
                <select
                  id="clock-model"
                  name="model"
                  required
                  value={form.modelId}
                  onChange={(event) => {
                    const newModelId = event.target.value;
                    const m = product.models.find((item) => item.id === newModelId);
                    setForm((current) => ({
                      ...current,
                      modelId: newModelId,
                      color: m?.colors[0] || "",
                    }));
                  }}
                >
                  {product.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="clock-color">
                  اللون <b>*</b>
                </label>
                <select
                  id="clock-color"
                  name="color"
                  required
                  value={form.color}
                  onChange={(event) => update("color", event.target.value)}
                >
                  {selectedModel?.colors.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="field">
                <label htmlFor="governorate">
                  المحافظة <b>*</b>
                </label>
                <select
                  id="governorate"
                  name="governorate"
                  required
                  value={form.governorate}
                  onChange={(event) => update("governorate", event.target.value)}
                >
                  {IRAQ_GOVERNORATES.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="quantity">
                  الكمية <b>*</b>
                </label>
                <select
                  id="quantity"
                  name="quantity"
                  required
                  value={form.quantity}
                  onChange={(event) => update("quantity", Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "قطعة" : "قطع"} {n === 2 ? "(خصم 10 آلاف)" : n >= 3 ? "(خصم خاص)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label htmlFor="address">
              المنطقة وأقرب نقطة دالة <b>*</b>
            </label>
            <textarea
              id="address"
              name="address"
              required
              minLength={5}
              maxLength={300}
              placeholder="اكتب اسم الحي / المنطقة والشارع وأقرب نقطة دالة بالتفصيل"
              value={form.address}
              onChange={(event) => update("address", event.target.value)}
              rows={3}
            />

            {/* Honeypot field */}
            <label className="honeypot" aria-hidden="true">
              اترك هذا الحقل فارغاً
              <input
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(event) => update("website", event.target.value)}
              />
            </label>

            <p className="order-submit-disclosure">
              بالضغط على زر الإرسال، ترسل بيانات طلبك للتاجر لتأكيده وتوصيله لباب بيتك مجاناً، والدفع عند الاستلام بعد المعاينة.
            </p>

            <button className="submit-button" type="submit" disabled={sending}>
              {sending ? (
                <>
                  <LoaderCircle size={18} className="spin" /> جارٍ إرسال الطلب…
                </>
              ) : (
                <>
                  اطلب الآن والدفع عند الاستلام <ArrowLeft size={18} />
                </>
              )}
            </button>

            {result && (
              <div className={`form-result ${result.type}`} role="status">
                <span>{result.message}</span>
              </div>
            )}
          </form>
        </section>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark">
            <Clock3 size={18} />
          </span>
          <strong>{storeName}</strong>
        </a>
        <span>ساعات جدارية تختارها بعناية — توصيل لجميع محافظات العراق.</span>
        <PrivacySettings
          trackingEnabled={trackingEnabled}
          onTrackingChange={() => setTrackingEnabled(!trackingEnabled)}
        />
        <a href="/admin" className="header-cta" style={{ fontSize: "12px", color: "var(--gold)" }}>
          إدارة المتجر <ArrowLeft size={14} />
        </a>
      </footer>

      {/* Sticky Fast-Buy CTA Bar */}
      <aside className="sticky-bar" id="sticky-cta-bar" aria-label="شريط الشراء السريع">
        <div className="sticky-price-block">
          <span className="sticky-price-label">الإجمالي:</span>
          <span className="sticky-price-num" id="sticky-price-val">
            {formatIQD(pricing.totalPriceIQD)}
          </span>
        </div>
        <a href="#order-form" className="sticky-pill-btn" onClick={scrollToOrder}>
          اطلب الآن
        </a>
      </aside>

      {/* Order Confirmation Modal (Exact previous design) */}
      {confirmationOrderId && (
        <div
          className="order-confirmation-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmationOrderId("");
          }}
        >
          <section
            className="order-confirmation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-confirmation-title"
          >
            <span className="order-confirmation-icon">
              <Check size={28} />
            </span>
            <p className="eyebrow">{storeName}</p>
            <h2 id="order-confirmation-title">شكراً لكم</h2>
            <p>تم تثبيت الطلب بنجاح</p>
            <p className="confirmation-delivery">
              السعر النهائي <strong>{formatIQD(confirmationAmount)}</strong> والتوصيل مجاني
              <br />
              راح يوصلكم الطلب خلال 24 - 48 ساعة مع المعاينة قبل الدفع
            </p>
            <small>رقم الطلب: {confirmationOrderId}</small>
            <button
              type="button"
              className="submit-button"
              onClick={() => setConfirmationOrderId("")}
            >
              تم
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
