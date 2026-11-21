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
} from "lucide-react";
import { formatIQD, PRODUCTS, STORE_CONFIG, type StorefrontProduct, type StorefrontModel } from "../../config/products";
import { type D1OrderRecord } from "../../worker/types";

type Notice = { type: "success" | "error"; message: string };
type Tab = "orders" | "products" | "settings";

// ─── Blank product template ─────────────────────────────────────────────────
const blankProduct = (): Partial<StorefrontProduct> => ({
  id: "",
  isPublished: true,
  category: "ساعة جدارية",
  productName: "",
  tagline: "",
  description: "",
  priceIQD: 35000,
  compareAtPriceIQD: 55000,
  features: [""],
  images: [{ id: 1, url: "", isActive: true, fit: "contain", scale: 96 }],
  models: [{ id: "model-1", name: "", colors: [""], stock: 10 }],
});

// ─── Helper ──────────────────────────────────────────────────────────────────
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`order-status ${ok ? "order-status-confirmed" : "order-status-delivery_failed"}`}
    >
      {ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />} {label}: {ok ? "✓" : "✗"}
    </span>
  );
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

  // Switch tab and lazy-load products
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

  // ── Product form helpers ──────────────────────────────────────────────────
  function setFeature(i: number, val: string) {
    const f = [...(editProduct.features || [])];
    f[i] = val;
    setEditProduct((p) => ({ ...p, features: f }));
  }
  function addFeature()       { setEditProduct((p) => ({ ...p, features: [...(p.features || []), ""] })); }
  function removeFeature(i: number) {
    const f = [...(editProduct.features || [])];
    f.splice(i, 1);
    setEditProduct((p) => ({ ...p, features: f }));
  }

  function setImageUrl(i: number, url: string) {
    const imgs = [...(editProduct.images || [])];
    imgs[i] = { ...imgs[i], url };
    setEditProduct((p) => ({ ...p, images: imgs }));
  }
  function addImage() {
    const imgs = editProduct.images || [];
    setEditProduct((p) => ({ ...p, images: [...imgs, { id: imgs.length + 1, url: "", isActive: true, fit: "contain", scale: 96 }] }));
  }
  function removeImage(i: number) {
    const imgs = [...(editProduct.images || [])];
    imgs.splice(i, 1);
    setEditProduct((p) => ({ ...p, images: imgs }));
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
    setEditProduct((p) => ({ ...p, models: [...ms, { id: `model-${ms.length + 1}`, name: "", colors: [""], stock: 10 }] }));
  }
  function removeModel(i: number) {
    const ms = [...(editProduct.models || [])];
    ms.splice(i, 1);
    setEditProduct((p) => ({ ...p, models: ms }));
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
            سجّل الدخول لمتابعة الطلبات وإدارة المنتجات وإعدادات الربط.
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
                style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#78756e" }}
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
          <button type="button" onClick={() => setNotice(null)} style={{ marginRight: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit" }}>
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
          <a className="admin-store-link" href="/">معاينة المتجر ↗</a>
          <button className="admin-logout" onClick={logout}>
            <LogOut size={14} /> <span className="hide-xs">خروج</span>
          </button>
        </div>
      </header>

      {/* ── KPI Cards ── */}
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
            <Package size={15} /> المنتجات
          </button>
          <button
            role="tab"
            aria-selected={tab === "settings"}
            className={`admin-tab${tab === "settings" ? " active" : ""}`}
            onClick={() => switchTab("settings")}
          >
            <Settings size={15} /> إعدادات الربط
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
                        <div><span>العنوان</span><strong>{order.address}</strong></div>
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
                          <span>Idempotency Key</span>
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
              <p className="eyebrow">كتالوج المنتجات</p>
              <h2>الساعات المتوفرة ({products.length})</h2>
            </div>
            <button className="admin-primary" type="button" onClick={openAddProduct}>
              <Plus size={15} /> إضافة ساعة جديدة
            </button>
          </div>

          {!productsLoaded ? (
            <div className="order-history-state"><LoaderCircle size={20} className="spin" /> جارٍ التحميل…</div>
          ) : products.length === 0 ? (
            <div className="order-history-state">لا توجد منتجات.</div>
          ) : (
            <div className="admin-products-grid">
              {products.map((p) => (
                <div key={p.id} className={`admin-product-card${p.isPublished ? "" : " unpublished"}`}>
                  <div className="admin-product-img">
                    {p.images?.[0]?.url
                      ? <img src={p.images[0].url} alt="" loading="lazy" />
                      : <Clock3 size={28} style={{ color: "#a38c61" }} />
                    }
                  </div>
                  <div className="admin-product-body">
                    <div className="admin-product-top">
                      <h3>{p.productName}</h3>
                      <span className={`admin-product-badge${p.isPublished ? " published" : " draft"}`}>
                        {p.isPublished ? "منشور" : "مسودة"}
                      </span>
                    </div>
                    <p className="admin-product-cat">{p.category}</p>
                    <p className="admin-product-desc">{p.description?.slice(0, 90)}{(p.description?.length || 0) > 90 ? "…" : ""}</p>
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
              <p className="eyebrow">إعدادات الربط</p>
              <h2>Telegram · Google Sheets · Meta</h2>
            </div>
          </div>

          <div className="admin-settings-grid">
            {/* Telegram */}
            <div className="admin-settings-card">
              <div className="admin-settings-card-header">
                <Send size={17} className="text-gold" />
                <h3>Telegram Bot</h3>
                <span className={`admin-product-badge ${tgBotReady ? "published" : "draft"}`}>
                  {tgBotReady ? "متصل" : "غير مضبوط"}
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: "0.82rem" }}>
                معرف المحادثة (Chat ID) اختياري — إذا تُرك فارغاً، يُستخدم <code>TELEGRAM_CHAT_ID</code> من env.
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
                    {tgTestBusy ? <><LoaderCircle size={14} className="spin" /> جارٍ…</> : <><Send size={14} /> اختبار</>}
                  </button>
                </div>
              </form>
            </div>

            {/* Google Sheets */}
            <div className="admin-settings-card">
              <div className="admin-settings-card-header">
                <Check size={17} className="text-gold" />
                <h3>Google Sheets Webhook</h3>
                <span className={`admin-product-badge ${settings.sheets_webhook_url ? "published" : "draft"}`}>
                  {settings.sheets_webhook_url ? "مضبوط" : "غير مضبوط"}
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: "0.82rem" }}>
                رابط ويب آب Google Apps Script الذي يستقبل الطلبات ويكتبها في الشيت.
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
                  {settingsBusy ? <><LoaderCircle size={15} className="spin" /> حفظ…</> : <><Check size={15} /> حفظ الإعدادات</>}
                </button>
              </form>
            </div>

            {/* Meta Status */}
            <div className="admin-settings-card">
              <div className="admin-settings-card-header">
                <ShieldCheck size={17} className="text-gold" />
                <h3>Meta Pixel & CAPI</h3>
                <span className={`admin-product-badge ${metaInfo?.capiConfigured ? "published" : "draft"}`}>
                  {metaInfo?.capiConfigured ? "جاهز" : "يحتاج إعداد"}
                </span>
              </div>
              <p className="admin-muted" style={{ fontSize: "0.82rem", marginBottom: "0.75rem" }}>
                تُضبط هذه القيم عبر متغيرات البيئة (<code>wrangler secret put</code>) ولا يمكن تغييرها من هنا.
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
        </section>
      )}

      <p className="admin-footer-note">
        مسجّل الدخول باسم <strong>{username}</strong> • {STORE_CONFIG.storeName} • يعمل بكفاءة عبر Cloudflare Workers & D1
      </p>

      {/* ════════════════════════════════════
          PRODUCT MODAL
      ════════════════════════════════════ */}
      {showProductModal && (
        <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowProductModal(false)}>
          <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="admin-modal-header">
              <h2 id="modal-title">{isEditMode ? "تعديل المنتج" : "إضافة ساعة جديدة"}</h2>
              <button type="button" onClick={() => setShowProductModal(false)} className="admin-modal-close" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveProduct} className="admin-modal-form">
              {/* Basic Info */}
              <fieldset>
                <legend>المعلومات الأساسية</legend>
                <div className="admin-form-row">
                  <div>
                    <label>معرف المنتج (ID) *</label>
                    <input
                      required
                      dir="ltr"
                      placeholder="royal-sunburst-3d"
                      value={editProduct.id || ""}
                      onChange={(e) => setEditProduct((p) => ({ ...p, id: e.target.value }))}
                      disabled={isEditMode}
                    />
                  </div>
                  <div>
                    <label>الفئة</label>
                    <input
                      placeholder="ساعة جدارية ملكية"
                      value={editProduct.category || ""}
                      onChange={(e) => setEditProduct((p) => ({ ...p, category: e.target.value }))}
                    />
                  </div>
                </div>
                <label>اسم المنتج (عربي) *</label>
                <input
                  required
                  placeholder="ساعة إشعاع الشمس الملكية"
                  value={editProduct.productName || ""}
                  onChange={(e) => setEditProduct((p) => ({ ...p, productName: e.target.value }))}
                />
                <label>الشعار المختصر (Tagline)</label>
                <input
                  placeholder="لمسة فخامة وأناقة عصرية…"
                  value={editProduct.tagline || ""}
                  onChange={(e) => setEditProduct((p) => ({ ...p, tagline: e.target.value }))}
                />
                <label>الوصف التفصيلي</label>
                <textarea
                  rows={3}
                  value={editProduct.description || ""}
                  onChange={(e) => setEditProduct((p) => ({ ...p, description: e.target.value }))}
                />
              </fieldset>

              {/* Pricing */}
              <fieldset>
                <legend>التسعير</legend>
                <div className="admin-form-row">
                  <div>
                    <label>السعر (د.ع) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      dir="ltr"
                      value={editProduct.priceIQD || ""}
                      onChange={(e) => setEditProduct((p) => ({ ...p, priceIQD: Number(e.target.value), basePriceIQD: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <label>السعر قبل التخفيض (د.ع)</label>
                    <input
                      type="number"
                      min={0}
                      dir="ltr"
                      value={editProduct.compareAtPriceIQD || ""}
                      onChange={(e) => setEditProduct((p) => ({ ...p, compareAtPriceIQD: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={editProduct.isPublished !== false}
                    onChange={(e) => setEditProduct((p) => ({ ...p, isPublished: e.target.checked }))}
                  />
                  منشور (يظهر في المتجر)
                </label>
              </fieldset>

              {/* Images */}
              <fieldset>
                <legend>صور المنتج</legend>
                {(editProduct.images || []).map((img, i) => (
                  <div key={i} className="admin-form-row" style={{ alignItems: "center" }}>
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://…"
                      value={img.url}
                      onChange={(e) => setImageUrl(i, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {img.url && <img src={img.url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 2 }} />}
                    <button type="button" className="admin-icon-btn danger" onClick={() => removeImage(i)}><X size={13} /></button>
                  </div>
                ))}
                <button type="button" className="admin-quiet-button" onClick={addImage} style={{ marginTop: "0.4rem" }}>
                  <Plus size={13} /> إضافة صورة
                </button>
              </fieldset>

              {/* Features */}
              <fieldset>
                <legend>المميزات (قائمة)</legend>
                {(editProduct.features || []).map((f, i) => (
                  <div key={i} className="admin-form-row" style={{ alignItems: "center" }}>
                    <input
                      value={f}
                      onChange={(e) => setFeature(i, e.target.value)}
                      placeholder={`ميزة ${i + 1}`}
                      style={{ flex: 1 }}
                    />
                    <button type="button" className="admin-icon-btn danger" onClick={() => removeFeature(i)}><X size={13} /></button>
                  </div>
                ))}
                <button type="button" className="admin-quiet-button" onClick={addFeature} style={{ marginTop: "0.4rem" }}>
                  <Plus size={13} /> إضافة ميزة
                </button>
              </fieldset>

              {/* Models */}
              <fieldset>
                <legend>الموديلات وألوانها</legend>
                {(editProduct.models || []).map((m, i) => (
                  <div key={i} className="admin-model-block">
                    <div className="admin-form-row">
                      <div style={{ flex: 1 }}>
                        <label>اسم الموديل</label>
                        <input
                          value={m.name}
                          onChange={(e) => setModel(i, "name", e.target.value)}
                          placeholder="موديل الذهبي الملكي"
                        />
                      </div>
                      <div>
                        <label>المخزون</label>
                        <input
                          type="number"
                          min={0}
                          dir="ltr"
                          value={m.stock}
                          onChange={(e) => setModel(i, "stock", Number(e.target.value))}
                          style={{ width: "5rem" }}
                        />
                      </div>
                      <button type="button" className="admin-icon-btn danger" onClick={() => removeModel(i)} style={{ marginTop: "1.4rem" }}><X size={13} /></button>
                    </div>
                    <label>الألوان (مفصولة بفاصلة)</label>
                    <input
                      value={(m.colors || []).join(", ")}
                      onChange={(e) => setModelColors(i, e.target.value)}
                      placeholder="ذهبي ملكي, أسود مطفي, روز غولد"
                    />
                  </div>
                ))}
                <button type="button" className="admin-quiet-button" onClick={addModel} style={{ marginTop: "0.4rem" }}>
                  <Plus size={13} /> إضافة موديل
                </button>
              </fieldset>

              <div className="admin-modal-actions">
                <button type="button" className="admin-quiet-button" onClick={() => setShowProductModal(false)}>
                  إلغاء
                </button>
                <button type="submit" className="admin-primary" disabled={productBusy}>
                  {productBusy
                    ? <><LoaderCircle size={15} className="spin" /> جارٍ الحفظ…</>
                    : <><Check size={15} /> {isEditMode ? "حفظ التعديلات" : "إضافة المنتج"}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
