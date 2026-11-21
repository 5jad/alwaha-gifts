import { useEffect, useState, type FormEvent } from "react";
import {
  Check,
  Clock3,
  Download,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Send,
  ShieldCheck,
  Search,
  Truck,
  TrendingUp,
  Package,
  Plus,
  Pencil,
  Trash2,
  X,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Upload,
  Sparkles,
} from "lucide-react";
import {
  formatIQD,
  PRODUCTS,
  STORE_CONFIG,
  DEFAULT_PROMISES,
  type StorefrontProduct,
  type StorefrontModel,
  type PromiseItem,
} from "../../config/products";
import { type D1OrderRecord } from "../../worker/types";

type Notice = { type: "success" | "error"; message: string };
type Tab = "orders" | "products" | "settings";

// ─── Blank product template ─────────────────────────────────────────────────
const blankProduct = (): Partial<StorefrontProduct> => ({
  id: "",
  isPublished: true,
  category: "ساعة جدارية ملكية",
  productName: "",
  tagline: "",
  description: "",
  priceIQD: 35000,
  compareAtPriceIQD: 55000,
  features: [
    "محرك كوارتز صامت 100% انسيابي الحركة بدون دقات مزعجة",
    "هيكل فولاذي فاخر مقاوم للصدأ والرطوبة وتغير اللون",
    "توصيل سريع ومجاني لباب بيتك لكافة محافظات العراق",
    "معاينة وفحص وتشغيل الساعة أمام المندوب قبل الدفع",
  ],
  images: [],
  models: [
    {
      id: "model-1",
      name: "الموديل الملكي الأساسي",
      colors: ["ذهبي ملكي", "أسود مطفي", "روز غولد"],
      stock: 15,
    },
  ],
});

// ─── Status Badge Helper ────────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`order-status ${ok ? "order-status-confirmed" : "order-status-delivery_failed"}`}
    >
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}: {ok ? "✓" : "✗"}
    </span>
  );
}

// ─── Image compression helper ──────────────────────────────────────────────
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Admin() {
  // ── Auth ────────────────────────────────────────────────────────────────
  const [loading, setLoading]           = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername]         = useState("admin");
  const [password, setPassword]         = useState("");
  const [showPw, setShowPw]             = useState(false);
  const [token, setToken]               = useState("");
  const [busy, setBusy]                 = useState(false);
  const [notice, setNotice]             = useState<Notice | null>(null);

  // ── Tab ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>("orders");

  // ── Orders ──────────────────────────────────────────────────────────────
  const [orders, setOrders]               = useState<D1OrderRecord[]>([]);
  const [totalOrders, setTotalOrders]     = useState(0);
  const [totalRevenueIQD, setTotalRevenue] = useState(0);
  const [searchQuery, setSearchQuery]     = useState("");
  const [retryingId, setRetryingId]       = useState<string | null>(null);
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  // ── Products ─────────────────────────────────────────────────────────────
  const [products, setProducts]       = useState<StorefrontProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Partial<StorefrontProduct>>(blankProduct());
  const [isEditMode, setIsEditMode]   = useState(false);
  const [productBusy, setProductBusy] = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  // ── Settings ─────────────────────────────────────────────────────────────
  const [settings, setSettings]           = useState<Record<string, string>>({});
  const [settingsForm, setSettingsForm]   = useState({ telegram_chat_id: "", sheets_webhook_url: "", sheets_secret: "" });
  const [settingsBusy, setSettingsBusy]   = useState(false);
  const [tgTestBusy, setTgTestBusy]       = useState(false);
  const [tgBotReady, setTgBotReady]       = useState(false);
  const [metaInfo, setMetaInfo]           = useState<any>(null);

  // ── Promise Strip Settings ───────────────────────────────────────────────
  const [promisesList, setPromisesList]   = useState<PromiseItem[]>(DEFAULT_PROMISES);
  const [promisesBusy, setPromisesBusy]   = useState(false);

  // ── Boot ──────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    const saved = localStorage.getItem("az_admin_token");
    if (saved) { setToken(saved); checkSession(saved); }
    else setLoading(false);
  }, []);

  function flash(type: Notice["type"], message: string) {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  }

  function authHeaders(t = token) {
    return { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };
  }

  async function checkSession(t: string) {
    try {
      const res  = await fetch("/api/admin/session", { headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json() as any;
      if (data.authenticated) {
        setAuthenticated(true);
        if (data.username) setUsername(data.username);
        void loadAll(t);
      } else {
        localStorage.removeItem("az_admin_token");
        setAuthenticated(false);
      }
    } catch { setAuthenticated(false); }
    finally { setLoading(false); }
  }

  async function loadAll(t = token) {
    setBusy(true);
    try {
      const [ordersRes, tgRes, metaRes, settingsRes] = await Promise.all([
        fetch("/api/admin/orders",         { headers: authHeaders(t) }),
        fetch("/api/admin/telegram-status",{ headers: authHeaders(t) }),
        fetch("/api/admin/meta-status",    { headers: authHeaders(t) }),
        fetch("/api/admin/settings",       { headers: authHeaders(t) }),
      ]);
      if (ordersRes.ok) {
        const d = await ordersRes.json() as any;
        setOrders(d.orders || []);
        setTotalOrders(d.totalOrders || 0);
        setTotalRevenue(d.totalRevenueIQD || 0);
      }
      if (tgRes.ok) {
        const d = await tgRes.json() as any;
        setTgBotReady(d.botConfigured);
      }
      if (metaRes.ok) setMetaInfo(await metaRes.json());
      if (settingsRes.ok) {
        const d = await settingsRes.json() as any;
        setSettings(d.settings || {});
        setSettingsForm({
          telegram_chat_id:  d.settings?.telegram_chat_id  || "",
          sheets_webhook_url: d.settings?.sheets_webhook_url || "",
          sheets_secret:     d.settings?.sheets_secret     || "",
        });
        if (d.settings?.promise_strip) {
          try {
            setPromisesList(JSON.parse(d.settings.promise_strip));
          } catch {}
        }
      }
    } catch (e: any) { flash("error", e?.message || "تعذر التحميل."); }
    finally { setBusy(false); }
  }

  async function loadProducts(t = token) {
    if (productsLoaded) return;
    try {
      const res = await fetch("/api/admin/products", { headers: authHeaders(t) });
      if (res.ok) {
        const d = await res.json() as any;
        setProducts(d.products || PRODUCTS);
      } else {
        setProducts(PRODUCTS);
      }
    } catch { setProducts(PRODUCTS); }
    finally { setProductsLoaded(true); }
  }

  function switchTab(t: Tab) {
    setTab(t);
    if (t === "products" && !productsLoaded) void loadProducts();
  }

  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res  = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "بيانات الدخول غير صحيحة.");
      setToken(data.token);
      localStorage.setItem("az_admin_token", data.token);
      setAuthenticated(true);
      setPassword("");
      void loadAll(data.token);
    } catch (e: any) { flash("error", e?.message || "تعذر تسجيل الدخول."); }
    finally { setBusy(false); }
  }

  function logout() {
    localStorage.removeItem("az_admin_token");
    setAuthenticated(false);
    setToken("");
    setOrders([]);
    setProducts([]);
    setProductsLoaded(false);
  }

  // ── Orders actions ───────────────────────────────────────────────────────
  async function retryOrder(orderId: string) {
    setRetryingId(orderId);
    try {
      const res  = await fetch(`/api/admin/orders/${orderId}/retry`, { method: "POST", headers: authHeaders() });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "فشلت إعادة الإرسال.");
      flash("success", `تمت إعادة إرسال الطلب ${orderId} بنجاح.`);
      void loadAll();
    } catch (e: any) { flash("error", e?.message || "خطأ."); }
    finally { setRetryingId(null); }
  }

  // ── Products actions ────────────────────────────────────────────────────
  function openAddProduct() {
    setEditProduct(blankProduct());
    setIsEditMode(false);
    setShowProductModal(true);
  }

  function openEditProduct(p: StorefrontProduct) {
    setEditProduct({ ...p });
    setIsEditMode(true);
    setShowProductModal(true);
  }

  function handleProductNameChange(name: string) {
    setEditProduct((p) => {
      const next = { ...p, productName: name, nameAr: name };
      if (!isEditMode && (!p.id || p.id.startsWith("clock-") || p.id === "")) {
        const slug = name
          .trim()
          .toLowerCase()
          .replace(/[^\w\u0621-\u064A]+/g, "-")
          .replace(/^-+|-+$/g, "");
        next.id = slug || `clock-${Date.now().toString(36)}`;
      }
      return next;
    });
  }

  async function handleImageFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    try {
      const base64List = await Promise.all(files.map(compressImage));
      setEditProduct((p) => {
        const current = p.images || [];
        const newImgs = base64List.map((url, idx) => ({
          id: Date.now() + idx,
          url,
          isActive: true,
          fit: "contain" as const,
          scale: 96,
        }));
        return {
          ...p,
          images: [...current.filter((img) => Boolean(img.url)), ...newImgs],
        };
      });
      flash("success", `تم رفع ${files.length} صورة من جهازك بنجاح.`);
    } catch {
      flash("error", "فشل تجهيز إحدى الصور، يرجى المحاولة بصورة أخرى.");
    }
    e.target.value = "";
  }

  function removeProductImage(index: number) {
    setEditProduct((p) => {
      const imgs = [...(p.images || [])];
      imgs.splice(index, 1);
      return { ...p, images: imgs };
    });
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProductBusy(true);
    try {
      const url    = isEditMode ? `/api/admin/products/${editProduct.id}` : "/api/admin/products";
      const method = isEditMode ? "PUT" : "POST";
      const res    = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(editProduct) });
      const data   = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الحفظ.");
      flash("success", data.message);
      setShowProductModal(false);
      setProductsLoaded(false);
      void loadProducts();
    } catch (e: any) { flash("error", e?.message || "خطأ في الحفظ."); }
    finally { setProductBusy(false); }
  }

  async function deleteProduct(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;
    setDeletingId(id);
    try {
      const res  = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: authHeaders() });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الحذف.");
      flash("success", "تم حذف المنتج.");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) { flash("error", e?.message || "خطأ."); }
    finally { setDeletingId(null); }
  }

  // ── Settings actions ─────────────────────────────────────────────────────
  async function saveSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSettingsBusy(true);
    try {
      const res  = await fetch("/api/admin/settings", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الحفظ.");
      flash("success", data.message);
      void loadAll();
    } catch (e: any) { flash("error", e?.message || "خطأ."); }
    finally { setSettingsBusy(false); }
  }

  async function savePromises(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPromisesBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ promise_strip: JSON.stringify(promisesList) }),
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الحفظ.");
      flash("success", "تم حفظ شريط الوعود والمميزات بنجاح.");
      void loadAll();
    } catch (err: any) {
      flash("error", err?.message || "خطأ في الحفظ.");
    } finally {
      setPromisesBusy(false);
    }
  }

  async function testTelegram() {
    setTgTestBusy(true);
    try {
      const res  = await fetch("/api/admin/telegram-test", { method: "POST", headers: authHeaders() });
      const data = await res.json() as any;
      if (!res.ok || !data.success) throw new Error(data.error || "فشل الاختبار.");
      flash("success", data.message);
    } catch (e: any) { flash("error", e?.message || "خطأ في التلغرام."); }
    finally { setTgTestBusy(false); }
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.governorate.toLowerCase().includes(q)
    );
  });

  // ── Form helpers ──────────────────────────────────────────────────────────
  function setFeature(i: number, val: string) {
    const f = [...(editProduct.features || [])];
    f[i] = val;
    setEditProduct((p) => ({ ...p, features: f }));
  }
  function addFeature() {
    setEditProduct((p) => ({ ...p, features: [...(p.features || []), ""] }));
  }
  function removeFeature(i: number) {
    const f = [...(editProduct.features || [])];
    f.splice(i, 1);
    setEditProduct((p) => ({ ...p, features: f }));
  }

  function setModel(i: number, field: keyof StorefrontModel, val: any) {
    const ms = [...(editProduct.models || [])];
    ms[i] = { ...ms[i], [field]: val };
    setEditProduct((p) => ({ ...p, models: ms }));
  }
  function setModelColors(i: number, raw: string) {
    const colors = raw.split(",").map((c) => c.trim()).filter(Boolean);
    setModel(i, "colors", colors);
  }
  function addModel() {
    const ms = editProduct.models || [];
    setEditProduct((p) => ({
      ...p,
      models: [...ms, { id: `model-${ms.length + 1}`, name: "", colors: [""], stock: 10 }],
    }));
  }
  function removeModel(i: number) {
    const ms = [...(editProduct.models || [])];
    ms.splice(i, 1);
    setEditProduct((p) => ({ ...p, models: ms }));
  }

  // ── Promise editor helpers ────────────────────────────────────────────────
  function updatePromiseItem(idx: number, field: keyof PromiseItem, val: string) {
    const copy = [...promisesList];
    copy[idx] = { ...copy[idx], [field]: val };
    setPromisesList(copy);
  }
  function addPromiseItem() {
    setPromisesList((prev) => [
      ...prev,
      {
        id: `promise-${Date.now()}`,
        icon: "check",
        title: "ميزة جديدة",
        subtitle: "تفاصيل الميزة الترويجية",
      },
    ]);
  }
  function removePromiseItem(idx: number) {
    setPromisesList((prev) => prev.filter((_, i) => i !== idx));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="admin-loading">
        <LoaderCircle className="spin" size={24} /> جارٍ التحقق من الجلسة…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <main className="admin-page">
        <header className="admin-header">
          <a className="admin-brand" href="/" aria-label="العودة للمتجر">
            <span className="brand-mark"><Clock3 size={20} /></span>
            <span>
              <strong>{STORE_CONFIG.storeName}</strong>
              <small>لوحة إدارة المتجر</small>
            </span>
          </a>
        </header>

        <section className="admin-login-card">
          <p className="eyebrow">دخول الإدارة</p>
          <h1>تسجيل الدخول</h1>
          <p className="admin-muted">
            سجّل الدخول لمتابعة الطلبات، إدارة المنتجات والصور، وضبط إعدادات الربط.
          </p>
          <form onSubmit={login} className="admin-form">
            <label htmlFor="admin-username">اسم المستخدم</label>
            <input
              id="admin-username"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <label htmlFor="admin-password">كلمة المرور</label>
            <div style={{ position: "relative" }}>
              <input
                id="admin-password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                placeholder="اكتب كلمة المرور"
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#78756e",
                }}
                aria-label={showPw ? "إخفاء" : "إظهار"}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button className="admin-primary" type="submit" disabled={busy}>
              {busy ? <><LoaderCircle size={18} className="spin" /> جارٍ التحقق…</> : "دخول لوحة الإدارة"}
            </button>
          </form>
          {notice && <div className={`admin-notice ${notice.type}`} role="alert">{notice.message}</div>}
          <p className="admin-security"><ShieldCheck size={15} /> الجلسة محمية بـ Cloudflare Workers.</p>
        </section>
      </main>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <main className="admin-page">
      {/* ── Global Notice ── */}
      {notice && (
        <div className={`admin-global-notice ${notice.type}`} role="alert">
          {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          {notice.message}
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{ marginRight: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="admin-header">
        <a className="admin-brand" href="/" aria-label="العودة للمتجر">
          <span className="brand-mark"><Clock3 size={20} /></span>
          <span>
            <strong>{STORE_CONFIG.storeName}</strong>
            <small>لوحة إدارة المتجر</small>
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            className="admin-quiet-button"
            onClick={() => void loadAll()}
            disabled={busy}
            title="تحديث"
          >
            <RefreshCw size={14} className={busy ? "spin" : ""} />
            <span className="hide-xs">تحديث</span>
          </button>
          <a className="admin-store-link" href="/" target="_blank" rel="noopener noreferrer">
            معاينة المتجر ↗
          </a>
          <button className="admin-logout" onClick={logout}>
            <LogOut size={14} /> <span className="hide-xs">خروج</span>
          </button>
        </div>
      </header>

      {/* ── KPI Row ── */}
      <div className="admin-kpi-row">
        <div className="admin-kpi-card">
          <div className="admin-kpi-label"><Package size={15} /> إجمالي الطلبات</div>
          <div className="admin-kpi-value">{totalOrders} طلب</div>
        </div>
        <div className="admin-kpi-card highlight">
          <div className="admin-kpi-label"><TrendingUp size={15} /> إجمالي المبيعات</div>
          <div className="admin-kpi-value">{formatIQD(totalRevenueIQD)}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="admin-kpi-label"><Truck size={15} /> التوصيل</div>
          <div className="admin-kpi-value" style={{ fontSize: "1rem" }}>مجاني لـ18 محافظة</div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs-wrapper">
        <nav className="admin-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === "orders"}
            className={`admin-tab${tab === "orders" ? " active" : ""}`}
            onClick={() => switchTab("orders")}
          >
            <BarChart3 size={15} /> الطلبات {totalOrders > 0 && <span className="admin-tab-badge">{totalOrders}</span>}
          </button>
          <button
            role="tab"
            aria-selected={tab === "products"}
            className={`admin-tab${tab === "products" ? " active" : ""}`}
            onClick={() => switchTab("products")}
          >
            <Package size={15} /> المنتجات والساعات
          </button>
          <button
            role="tab"
            aria-selected={tab === "settings"}
            className={`admin-tab${tab === "settings" ? " active" : ""}`}
            onClick={() => switchTab("settings")}
          >
            <Settings size={15} /> إعدادات الربط والوعود
          </button>
        </nav>
      </div>

      {/* ════════════════════════════════════
          TAB 1: ORDERS
      ════════════════════════════════════ */}
      {tab === "orders" && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">سجل العمليات</p>
              <h2>طلبات الزبائن ({filteredOrders.length})</h2>
            </div>
            <div className="order-history-actions">
              <a
                href="/api/admin/orders/export"
                target="_blank"
                rel="noopener noreferrer"
                className="admin-quiet-button"
              >
                <Download size={14} /> تصدير CSV
              </a>
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، المحافظة…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
            <Search size={16} className="admin-search-icon" />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="order-history-state">
              {orders.length === 0 ? "لا توجد طلبات بعد." : "لا نتائج تطابق بحثك."}
            </div>
          ) : (
            <div className="order-history-list">
              {filteredOrders.map((order) => {
                const dateStr = new Date(order.created_at * 1000).toLocaleString("ar-IQ", {
                  timeZone: "Asia/Baghdad",
                  month: "2-digit", day: "2-digit",
                  hour: "2-digit", minute: "2-digit", hour12: true,
                });
                const expanded = expandedId === order.id;
                const isRetrying = retryingId === order.id;

                return (
                  <div className="order-history-card" key={order.id}>
                    {/* Summary row */}
                    <div
                      className="order-card-summary"
                      onClick={() => setExpandedId(expanded ? null : order.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setExpandedId(expanded ? null : order.id)}
                    >
                      <div className="order-card-main">
                        <strong>{order.id}</strong>
                        <span>{order.customer_name} — {order.governorate}</span>
                        <span style={{ fontSize: "0.75rem", color: "#78756e" }}>{order.phone}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                        <div className="order-card-total">{formatIQD(order.total_price)}</div>
                        <div className="order-card-date">{dateStr}</div>
                        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                          <StatusBadge ok={!!order.telegram_sent} label="تلغرام" />
                          <StatusBadge ok={!!order.sheet_sent}    label="شيتس" />
                          <StatusBadge ok={!!order.meta_sent}     label="ميتا" />
                        </div>
                        {expanded ? <ChevronUp size={15} style={{ color: "#78756e" }} /> : <ChevronDown size={15} style={{ color: "#78756e" }} />}
                      </div>
                    </div>

                    {/* Expanded details */}
                    {expanded && (
                      <div className="order-history-details">
                        <div><span>العنوان بالتفصيل</span><strong>{order.address}</strong></div>
                        <div>
                          <span>المنتج / الموديل / اللون</span>
                          <strong>{order.product_id} | {order.model_id} | {order.color_id}</strong>
                        </div>
                        <div>
                          <span>الكمية × السعر</span>
                          <strong>{order.quantity} × {formatIQD(order.unit_price)}</strong>
                        </div>
                        {order.utm_source && (
                          <div>
                            <span>المصدر / الحملة</span>
                            <span className="text-xs">{order.utm_source}{order.utm_campaign && ` | ${order.utm_campaign}`}</span>
                          </div>
                        )}
                        <div>
                          <span>معرف عدم التكرار (Idempotency Key)</span>
                          <code style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "#78756e", wordBreak: "break-all" }} dir="ltr">{order.idempotency_key}</code>
                        </div>
                        <div>
                          <span>إعادة الإرسال اليدوي</span>
                          <button
                            type="button"
                            onClick={() => retryOrder(order.id)}
                            disabled={isRetrying}
                            className="admin-quiet-button"
                            style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
                          >
                            {isRetrying
                              ? <><LoaderCircle size={13} className="spin" /> جارٍ…</>
                              : <><RefreshCw size={13} /> إعادة إرسال القنوات</>
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ════════════════════════════════════
          TAB 2: PRODUCTS
      ════════════════════════════════════ */}
      {tab === "products" && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">كتالوج الساعات الفاخرة</p>
              <h2>الساعات المتوفرة في المتجر ({products.length})</h2>
            </div>
            <button className="admin-primary" type="button" onClick={openAddProduct}>
              <Plus size={15} /> إضافة ساعة جديدة
            </button>
          </div>

          {!productsLoaded ? (
            <div className="order-history-state"><LoaderCircle size={20} className="spin" /> جارٍ التحميل…</div>
          ) : products.length === 0 ? (
            <div className="order-history-state">لا توجد منتجات مسجلة. اضغط على "إضافة ساعة جديدة" أعلاه.</div>
          ) : (
            <div className="admin-products-grid">
              {products.map((p) => (
                <div key={p.id} className={`admin-product-card${p.isPublished ? "" : " unpublished"}`}>
                  <div className="admin-product-img">
                    {p.images?.[0]?.url ? (
                      <img src={p.images[0].url} alt="" loading="lazy" />
                    ) : (
                      <Clock3 size={28} style={{ color: "#a38c61" }} />
                    )}
                  </div>
                  <div className="admin-product-body">
                    <div className="admin-product-top">
                      <h3>{p.productName}</h3>
                      <span className={`admin-product-badge${p.isPublished ? " published" : " draft"}`}>
                        {p.isPublished ? "منشور" : "مسودة"}
                      </span>
                    </div>
                    <p className="admin-product-cat">{p.category}</p>
                    <p className="admin-product-desc">
                      {p.description?.slice(0, 90)}{(p.description?.length || 0) > 90 ? "…" : ""}
                    </p>
                    <div className="admin-product-footer">
                      <strong className="admin-product-price">{formatIQD(p.priceIQD)}</strong>
                      {p.compareAtPriceIQD > p.priceIQD && (
                        <s style={{ fontSize: "0.78rem", color: "#78756e" }}>{formatIQD(p.compareAtPriceIQD)}</s>
                      )}
                      <div style={{ display: "flex", gap: "0.4rem", marginRight: "auto" }}>
                        <button type="button" className="admin-icon-btn" onClick={() => openEditProduct(p)} title="تعديل">
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-btn danger"
                          onClick={() => deleteProduct(p.id)}
                          disabled={deletingId === p.id}
                          title="حذف"
                        >
                          {deletingId === p.id ? <LoaderCircle size={13} className="spin" /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ════════════════════════════════════
          TAB 3: SETTINGS
      ════════════════════════════════════ */}
      {tab === "settings" && (
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <p className="eyebrow">إعدادات المتجر والربط</p>
              <h2>إعدادات القنوات وشريط الوعود</h2>
            </div>
          </div>

          <div className="admin-settings-grid">
            {/* 1. Telegram */}
            <div className="admin-settings-card">
              <div className="admin-settings-card-header">
                <Send size={17} className="text-gold" />
                <h3>Telegram Bot</h3>
                <span className={`admin-product-badge ${tgBotReady ? "published" : "draft"}`}>
                  {tgBotReady ? "متصل" : "غير مضبوط (اختياري)"}
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: "0.82rem" }}>
                معرف المحادثة (Chat ID) اختياري — الطلبات تخزن في D1 حتى لو لم يتم تفعيل التلغرام.
              </p>
              <form onSubmit={saveSettings} className="admin-form" style={{ marginTop: "1rem" }}>
                <label>معرف محادثة التلغرام (Chat ID)</label>
                <input
                  type="text"
                  placeholder="-100xxxxxxxx"
                  value={settingsForm.telegram_chat_id}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, telegram_chat_id: e.target.value }))}
                  dir="ltr"
                />
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <button className="admin-primary" type="submit" disabled={settingsBusy} style={{ flex: 1 }}>
                    {settingsBusy ? <><LoaderCircle size={15} className="spin" /> حفظ…</> : <><Check size={15} /> حفظ</>}
                  </button>
                  <button
                    type="button"
                    className="admin-quiet-button"
                    onClick={testTelegram}
                    disabled={tgTestBusy || !tgBotReady}
                    title={tgBotReady ? "إرسال رسالة اختبار" : "البوت غير مضبوط بعد"}
                    style={{ flexShrink: 0 }}
                  >
                    {tgTestBusy ? <><LoaderCircle size={14} className="spin" /> جارٍ…</> : <><Send size={14} /> فحص التلغرام</>}
                  </button>
                </div>
              </form>
            </div>

            {/* 2. Google Sheets */}
            <div className="admin-settings-card">
              <div className="admin-settings-card-header">
                <Check size={17} className="text-gold" />
                <h3>Google Sheets Webhook</h3>
                <span className={`admin-product-badge ${settings.sheets_webhook_url ? "published" : "draft"}`}>
                  {settings.sheets_webhook_url ? "مضبوط" : "غير مضبوط (اختياري)"}
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: "0.82rem" }}>
                رابط تطبيق ويب Google Apps Script الذي يستقبل ويسجل صفوف الطلبات في الشيت.
              </p>
              <form onSubmit={saveSettings} className="admin-form" style={{ marginTop: "1rem" }}>
                <label>رابط Webhook (Sheets URL)</label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/…/exec"
                  value={settingsForm.sheets_webhook_url}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, sheets_webhook_url: e.target.value }))}
                  dir="ltr"
                />
                <label style={{ marginTop: "0.75rem" }}>كلمة السر المشتركة (Sheets Secret)</label>
                <input
                  type="text"
                  placeholder="my-secret-token"
                  value={settingsForm.sheets_secret}
                  onChange={(e) => setSettingsForm((s) => ({ ...s, sheets_secret: e.target.value }))}
                  dir="ltr"
                />
                <button className="admin-primary" type="submit" disabled={settingsBusy} style={{ marginTop: "0.75rem" }}>
                  {settingsBusy ? <><LoaderCircle size={15} className="spin" /> حفظ…</> : <><Check size={15} /> حفظ إعدادات الشيتس</>}
                </button>
              </form>
            </div>

            {/* 3. Meta Status */}
            <div className="admin-settings-card">
              <div className="admin-settings-card-header">
                <ShieldCheck size={17} className="text-gold" />
                <h3>Meta Pixel & CAPI</h3>
                <span className={`admin-product-badge ${metaInfo?.capiConfigured ? "published" : "draft"}`}>
                  {metaInfo?.capiConfigured ? "جاهز ومضبوط" : "يحتاج ضبط أسرار"}
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                تُضبط هذه القيم لحماية الأمان عبر <code>wrangler secret put</code>.
              </p>
              <div className="admin-meta-info">
                <div><span>Pixel ID</span><code>{metaInfo?.pixelId || "—"}</code></div>
                <div><span>API Version</span><code dir="ltr">{metaInfo?.apiVersion || "v21.0"}</code></div>
                <div><span>Currency</span><code dir="ltr">{metaInfo?.currency || "USD"} (Rate: {metaInfo?.usdRate || "1310"})</code></div>
                {metaInfo?.testEventCode && (
                  <div><span>Test Event Code</span><code dir="ltr">{metaInfo.testEventCode}</code></div>
                )}
              </div>
              <div className="admin-meta-note">
                <ShieldCheck size={13} /> إلغاء التكرار (Deduplication) مفعّل بـ <code>event_id = "purchase-{"{orderId}"}"</code>
              </div>
            </div>
          </div>

          {/* 4. Promise Strip Manager (شريط الوعود والمميزات) */}
          <div className="admin-settings-card" style={{ marginTop: "1.5rem" }}>
            <div className="admin-settings-card-header">
              <Sparkles size={18} className="text-gold" />
              <h3>شريط الوعود والمميزات الترويجية (Promise Strip)</h3>
            </div>
            <p className="admin-muted" style={{ fontSize: "0.82rem" }}>
              هذه هي الوعود والميزات الثلاث (أو أكثر) التي تظهر أسفل ساعة العرض مباشرة في الصفحة الرئيسية.
            </p>

            <form onSubmit={savePromises} className="admin-form" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {promisesList.map((item, idx) => (
                  <div key={item.id || idx} className="admin-promise-row">
                    <div style={{ width: "120px" }}>
                      <label style={{ fontSize: "0.72rem" }}>الأيقونة</label>
                      <select
                        value={item.icon}
                        onChange={(e) => updatePromiseItem(idx, "icon", e.target.value as any)}
                        style={{ padding: "0.4rem 0.5rem", fontSize: "0.82rem" }}
                      >
                        <option value="truck">🚚 توصيل مجاني</option>
                        <option value="shield-check">🛡️ فحص ومعاينة</option>
                        <option value="clock3">⏰ ماكينة صامتة</option>
                        <option value="package">📦 جودة وتغليف</option>
                        <option value="star">⭐ ضمان ذهبي</option>
                        <option value="check">✓ علامة صح</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.72rem" }}>العنوان الرئيسي</label>
                      <input
                        value={item.title}
                        onChange={(e) => updatePromiseItem(idx, "title", e.target.value)}
                        placeholder="تأكيد مباشر وتوصيل مجاني"
                        required
                      />
                    </div>
                    <div style={{ flex: 1.5 }}>
                      <label style={{ fontSize: "0.72rem" }}>النص التوضيحي</label>
                      <input
                        value={item.subtitle}
                        onChange={(e) => updatePromiseItem(idx, "subtitle", e.target.value)}
                        placeholder="مندوبنا يتواصل وياك ويصل لباب بيتك مجاناً"
                        required
                      />
                    </div>
                    {promisesList.length > 1 && (
                      <button
                        type="button"
                        className="admin-icon-btn danger"
                        onClick={() => removePromiseItem(idx)}
                        style={{ alignSelf: "flex-end", marginBottom: "2px" }}
                        title="حذف هذا الوعد"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "0.6rem", marginTop: "1rem" }}>
                <button type="button" className="admin-quiet-button" onClick={addPromiseItem}>
                  <Plus size={14} /> إضافة ميزة / وعد جديد
                </button>
                <button type="submit" className="admin-primary" disabled={promisesBusy} style={{ marginRight: "auto" }}>
                  {promisesBusy ? <><LoaderCircle size={15} className="spin" /> جارٍ الحفظ…</> : <><Check size={15} /> حفظ شريط الوعود</>}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <p className="admin-footer-note">
        مسجّل الدخول باسم <strong>{username}</strong> • {STORE_CONFIG.storeName} • يعمل بكفاءة عبر Cloudflare Workers & D1
      </p>

      {/* ════════════════════════════════════
          PRODUCT MODAL (REORGANIZED & ORDERED)
      ════════════════════════════════════ */}
      {showProductModal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowProductModal(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="admin-modal-header">
              <h2 id="modal-title">
                {isEditMode ? "تعديل بيانات الساعة" : "إضافة ساعة جدارية جديدة"}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="admin-modal-close"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveProduct} className="admin-modal-form">
              {/* 1️⃣ الخطوة الأولى: البيانات الأساسية */}
              <fieldset>
                <legend>1️⃣ المعلومات الأساسية وتسمية الساعة</legend>
                <div className="admin-form-row">
                  <div>
                    <label>اسم الساعة الفاخرة (عربي) *</label>
                    <input
                      required
                      placeholder="مثال: ساعة إشعاع الشمس الملكية"
                      value={editProduct.productName || ""}
                      onChange={(e) => handleProductNameChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>فئة الساعة أو التصنيف *</label>
                    <input
                      required
                      placeholder="مثال: ساعة جدارية ملكية"
                      value={editProduct.category || ""}
                      onChange={(e) => setEditProduct((p) => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="admin-form-row" style={{ alignItems: "center" }}>
                  <div>
                    <label>معرف الساعة البرمجي (ID) *</label>
                    <input
                      required
                      dir="ltr"
                      placeholder="royal-sunburst-3d"
                      value={editProduct.id || ""}
                      onChange={(e) => setEditProduct((p) => ({ ...p, id: e.target.value }))}
                      disabled={isEditMode}
                    />
                  </div>
                  <div style={{ paddingTop: "1.2rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", fontWeight: 700 }}>
                      <input
                        type="checkbox"
                        checked={editProduct.isPublished !== false}
                        onChange={(e) => setEditProduct((p) => ({ ...p, isPublished: e.target.checked }))}
                        style={{ width: "18px", height: "18px" }}
                      />
                      نشر فوري (تظهر الساعة في المتجر للزبائن)
                    </label>
                  </div>
                </div>
              </fieldset>

              {/* 2️⃣ الخطوة الثانية: التسعير */}
              <fieldset>
                <legend>2️⃣ التسعير والعروض بالدينار العراقي (IQD)</legend>
                <div className="admin-form-row">
                  <div>
                    <label>سعر البيع الفعلي للزبون (د.ع) *</label>
                    <input
                      type="number"
                      required
                      min={1000}
                      step={500}
                      dir="ltr"
                      placeholder="35000"
                      value={editProduct.priceIQD || ""}
                      onChange={(e) =>
                        setEditProduct((p) => ({
                          ...p,
                          priceIQD: Number(e.target.value),
                          basePriceIQD: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label>السعر السابق قبل التخفيض (د.ع) (يظهر مشطوباً)</label>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      dir="ltr"
                      placeholder="55000"
                      value={editProduct.compareAtPriceIQD || ""}
                      onChange={(e) =>
                        setEditProduct((p) => ({
                          ...p,
                          compareAtPriceIQD: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>
              </fieldset>

              {/* 3️⃣ الخطوة الثالثة: صور الساعة (رفع مباشر من الجهاز) */}
              <fieldset>
                <legend>3️⃣ صور الساعة (رفع مباشر من جهازك أو ملفاتك)</legend>
                
                {/* File Upload Trigger */}
                <div className="admin-file-dropzone">
                  <input
                    type="file"
                    id="admin-clock-files"
                    multiple
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    style={{ display: "none" }}
                  />
                  <label htmlFor="admin-clock-files" className="admin-file-dropzone-btn">
                    <Upload size={20} className="text-gold" />
                    <div>
                      <strong>اضغط هنا لاختيار صور الساعة من جهازك</strong>
                      <small>يمكنك اختيار صورة واحدة أو عدة صور دفعة واحدة (JPG, PNG, WebP)</small>
                    </div>
                  </label>
                </div>

                {/* Display uploaded images preview grid */}
                {(editProduct.images || []).length > 0 && (
                  <div className="admin-image-preview-grid">
                    {(editProduct.images || []).map((img, i) => (
                      <div key={img.id || i} className="admin-image-tile">
                        <img src={img.url} alt={`معاينة ${i + 1}`} />
                        <span className="admin-image-order-tag">صورة {i + 1} {i === 0 ? "★ الرئيسية" : ""}</span>
                        <button
                          type="button"
                          className="admin-image-del-btn"
                          onClick={() => removeProductImage(i)}
                          title="حذف هذه الصورة"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </fieldset>

              {/* 4️⃣ الخطوة الرابعة: الموديلات، الألوان، والمخزون */}
              <fieldset>
                <legend>4️⃣ الموديلات والألوان والكميات المتوفرة</legend>
                {(editProduct.models || []).map((m, i) => (
                  <div key={m.id || i} className="admin-model-block">
                    <div className="admin-form-row">
                      <div style={{ flex: 1 }}>
                        <label>اسم الموديل أو الحجم</label>
                        <input
                          value={m.name}
                          onChange={(e) => setModel(i, "name", e.target.value)}
                          placeholder="مثال: قطر 50 سم (المقاس الملكي)"
                        />
                      </div>
                      <div>
                        <label>المخزون المتوفر</label>
                        <input
                          type="number"
                          min={0}
                          dir="ltr"
                          value={m.stock}
                          onChange={(e) => setModel(i, "stock", Number(e.target.value))}
                          style={{ width: "6rem" }}
                        />
                      </div>
                      <button
                        type="button"
                        className="admin-icon-btn danger"
                        onClick={() => removeModel(i)}
                        style={{ marginTop: "1.4rem" }}
                        title="حذف الموديل"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <label>الألوان المتوفرة لهذا الموديل (اكتب الألوان وافصل بينها بفاصلة)</label>
                    <input
                      value={(m.colors || []).join(", ")}
                      onChange={(e) => setModelColors(i, e.target.value)}
                      placeholder="مثال: ذهبي ملكي, أسود مطفي, فضي كريستال"
                    />
                  </div>
                ))}
                <button type="button" className="admin-quiet-button" onClick={addModel} style={{ marginTop: "0.4rem" }}>
                  <Plus size={13} /> إضافة موديل أو حجم آخر
                </button>
              </fieldset>

              {/* 5️⃣ الخطوة الخامسة: الشعار والمواصفات الترويجية */}
              <fieldset>
                <legend>5️⃣ الشعار والمواصفات والوصف التسويقي</legend>
                <label>الشعار الترويجي البارز (Tagline)</label>
                <input
                  placeholder="مثال: لمسة فخامة وأناقة عصرية تحول جدار منزلك إلى تحفة فنية راقية"
                  value={editProduct.tagline || ""}
                  onChange={(e) => setEditProduct((p) => ({ ...p, tagline: e.target.value }))}
                />

                <label>الوصف التفصيلي للساعة</label>
                <textarea
                  rows={3}
                  placeholder="ساعة جدارية مصممة بعناية فائقة وتعمل بحركة الكوارتز الصامتة تماماً..."
                  value={editProduct.description || ""}
                  onChange={(e) => setEditProduct((p) => ({ ...p, description: e.target.value }))}
                />

                <label>مميزات الساعة (تظهر في قائمة المواصفات):</label>
                {(editProduct.features || []).map((f, i) => (
                  <div key={i} className="admin-form-row" style={{ alignItems: "center", marginBottom: "0.3rem" }}>
                    <input
                      value={f}
                      onChange={(e) => setFeature(i, e.target.value)}
                      placeholder={`ميزة ${i + 1}`}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="admin-icon-btn danger" onClick={() => removeFeature(i)}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <button type="button" className="admin-quiet-button" onClick={addFeature} style={{ marginTop: "0.4rem" }}>
                  <Plus size={13} /> إضافة ميزة أخرى
                </button>
              </fieldset>

              <div className="admin-modal-actions">
                <button type="button" className="admin-quiet-button" onClick={() => setShowProductModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="admin-primary" disabled={productBusy}>
                  {productBusy ? (
                    <><LoaderCircle size={15} className="spin" /> جارٍ الحفظ…</>
                  ) : (
                    <><Check size={15} /> {isEditMode ? "حفظ التعديلات" : "إضافة الساعة إلى المتجر"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
