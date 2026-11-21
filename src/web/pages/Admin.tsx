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
  DollarSign,
  Package,
} from "lucide-react";
import { formatIQD, PRODUCTS, STORE_CONFIG } from "../../config/products";
import { D1OrderRecord } from "../../worker/types";

type Notice = { type: "success" | "error"; message: string };

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string>("");

  const [orders, setOrders] = useState<D1OrderRecord[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenueIQD, setTotalRevenueIQD] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const [notice, setNotice] = useState<Notice | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<string>("");
  const [telegramBotConfigured, setTelegramBotConfigured] = useState(false);
  const [sendingTelegramTest, setSendingTelegramTest] = useState(false);

  const [metaInfo, setMetaInfo] = useState<any>(null);

  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";

    const savedToken = localStorage.getItem("az_admin_token");
    if (savedToken) {
      setToken(savedToken);
      checkSession(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function checkSession(authToken: string) {
    try {
      const res = await fetch("/api/admin/session", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json() as any;
      if (data.authenticated) {
        setAuthenticated(true);
        if (data.username) setUsername(data.username);
        void loadDashboardData(authToken);
      } else {
        localStorage.removeItem("az_admin_token");
        setAuthenticated(false);
      }
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboardData(authToken: string) {
    setBusy(true);
    try {
      const [ordersRes, tgRes, metaRes] = await Promise.all([
        fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch("/api/admin/telegram-status", { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch("/api/admin/meta-status", { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      if (ordersRes.ok) {
        const data = await ordersRes.json() as any;
        setOrders(data.orders || []);
        setTotalOrders(data.totalOrders || 0);
        setTotalRevenueIQD(data.totalRevenueIQD || 0);
      }

      if (tgRes.ok) {
        const tgData = await tgRes.json() as any;
        setTelegramBotConfigured(tgData.botConfigured);
        setTelegramStatus(tgData.message);
      }

      if (metaRes.ok) {
        const metaData = await metaRes.json() as any;
        setMetaInfo(metaData);
      }
    } catch (err: any) {
      setNotice({ type: "error", message: err?.message || "تعذر تحميل بيانات اللوحة." });
    } finally {
      setBusy(false);
    }
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json() as any;

      if (!response.ok || !data.success) {
        throw new Error(data.error || "بيانات الدخول غير صحيحة.");
      }

      setToken(data.token);
      localStorage.setItem("az_admin_token", data.token);
      setAuthenticated(true);
      setPassword("");
      void loadDashboardData(data.token);
    } catch (err: any) {
      setNotice({ type: "error", message: err?.message || "تعذر تسجيل الدخول." });
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    localStorage.removeItem("az_admin_token");
    setAuthenticated(false);
    setToken("");
    setOrders([]);
  }

  async function retryOrder(orderId: string) {
    setRetryingId(orderId);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشلت إعادة الإرسال.");
      }

      setNotice({ type: "success", message: `تمت إعادة إرسال الطلب ${orderId} بنجاح.` });
      // Refresh orders
      void loadDashboardData(token);
    } catch (err: any) {
      setNotice({ type: "error", message: err?.message || "حدث خطأ أثناء المحاولة." });
    } finally {
      setRetryingId(null);
    }
  }

  async function sendTelegramTest() {
    setSendingTelegramTest(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/telegram-test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل إرسال رسالة الاختبار.");
      }
      setNotice({ type: "success", message: data.message });
    } catch (err: any) {
      setNotice({ type: "error", message: err?.message || "خطأ في الاتصال بالتلغرام." });
    } finally {
      setSendingTelegramTest(false);
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.phone.includes(q) ||
      o.governorate.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q)
    );
  });

  return (
    <main className="admin-page">
      <header className="admin-header">
        <a className="admin-brand" href="/" aria-label="العودة للمتجر">
          <span className="brand-mark">
            <Clock3 size={20} />
          </span>
          <span>
            <strong>{STORE_CONFIG.storeName}</strong>
            <small>لوحة إدارة الطلبات والمتجر</small>
          </span>
        </a>
        <a className="admin-store-link" href="/">
          معاينة المتجر ↗
        </a>
      </header>

      {loading ? (
        <div className="admin-loading">
          <LoaderCircle className="spin" size={24} /> جارٍ التحقق من الجلسة…
        </div>
      ) : !authenticated ? (
        <section className="admin-login-card">
          <p className="eyebrow">دخول الإدارة</p>
          <h1>تسجيل الدخول</h1>
          <p className="admin-muted">
            سجّل الدخول لمتابعة طلبات الزبائن، والتحقق من الربط مع Telegram و Google Sheets و Meta CAPI.
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
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              placeholder="اكتب كلمة المرور"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="admin-primary" type="submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle size={18} className="spin" /> جارٍ التحقق…
                </>
              ) : (
                "دخول لوحة الإدارة"
              )}
            </button>
          </form>
          {notice && <div className={`admin-notice ${notice.type}`} role="status">{notice.message}</div>}
          <p className="admin-security">
            <ShieldCheck size={15} /> الجلسة مشفرة ومحمية بـ Cloudflare Workers.
          </p>
        </section>
      ) : (
        <section className="admin-shell">
          <div className="admin-title-row">
            <div>
              <p className="eyebrow">لوحة التحكم</p>
              <h1>إدارة الطلبات والربط السحابي</h1>
              <p className="admin-muted">
                مرحباً بك يا <strong>{username}</strong>. هنا يمكنك استعراض كافة الطلبات المخزنة في D1 والتحقق من وصولها.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="admin-logout"
                onClick={() => void loadDashboardData(token)}
                disabled={busy}
                title="تحديث البيانات"
              >
                <RefreshCw size={15} className={busy ? "spin" : ""} /> تحديث
              </button>
              <button className="admin-logout" onClick={logout} disabled={busy}>
                <LogOut size={15} /> خروج
              </button>
            </div>
          </div>

          {notice && (
            <div className={`admin-notice ${notice.type} mb-6`} role="status">
              {notice.type === "success" && <Check size={17} />}
              {notice.message}
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#fbf9f5] border border-[#e5e0d7] p-5 rounded-sm">
              <div className="flex items-center gap-2 text-[#78756e] text-xs font-semibold mb-2">
                <Package size={16} className="text-[#ae8b4d]" />
                <span>إجمالي الطلبات المسجلة</span>
              </div>
              <strong className="text-2xl font-bold text-[#27251f]">{totalOrders} طلب</strong>
            </div>

            <div className="bg-[#fbf9f5] border border-[#e5e0d7] p-5 rounded-sm">
              <div className="flex items-center gap-2 text-[#78756e] text-xs font-semibold mb-2">
                <DollarSign size={16} className="text-[#ae8b4d]" />
                <span>إجمالي المبيعات (D1)</span>
              </div>
              <strong className="text-2xl font-bold text-[#ae8b4d]">
                {formatIQD(totalRevenueIQD)}
              </strong>
            </div>

            <div className="bg-[#fbf9f5] border border-[#e5e0d7] p-5 rounded-sm">
              <div className="flex items-center gap-2 text-[#78756e] text-xs font-semibold mb-2">
                <Truck size={16} className="text-[#ae8b4d]" />
                <span>التوصيل والشحن</span>
              </div>
              <strong className="text-lg font-bold text-[#31533b]">
                مجاني لجميع المحافظات الـ 18
              </strong>
            </div>
          </div>

          {/* Integration Status: Telegram & Meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Telegram Panel */}
            <div className="bg-[#efebe3] border border-[#e1dbcf] p-5">
              <div className="flex items-start gap-3 mb-3">
                <Send size={18} className="text-[#ae8b4d] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm block mb-1">ربط Telegram Bot</strong>
                  <p className="text-xs text-[#78756e] leading-relaxed m-0">{telegramStatus}</p>
                </div>
              </div>
              <button
                className="admin-primary text-xs py-2 px-4"
                type="button"
                onClick={sendTelegramTest}
                disabled={sendingTelegramTest || !telegramBotConfigured}
              >
                {sendingTelegramTest ? (
                  <>
                    <LoaderCircle size={15} className="spin" /> جارٍ الإرسال…
                  </>
                ) : (
                  <>
                    <Send size={15} /> إرسال رسالة فحص تجريبية
                  </>
                )}
              </button>
            </div>

            {/* Meta CAPI Panel */}
            <div className="bg-[#efebe3] border border-[#e1dbcf] p-5">
              <div className="flex items-start gap-3 mb-3">
                <ShieldCheck size={18} className="text-[#ae8b4d] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-sm block mb-1">Meta Pixel & Conversions API (CAPI)</strong>
                  <p className="text-xs text-[#78756e] leading-relaxed m-0">
                    {metaInfo?.capiConfigured
                      ? `جاهز ومضبوط | العملة: ${metaInfo.currency} (سعر الصرف: ${metaInfo.usdRate} د.ع)`
                      : "يرجى تعيين META_PIXEL_ID و META_CAPI_ACCESS_TOKEN"}
                  </p>
                  {metaInfo?.testEventCode && (
                    <small className="text-[11px] text-[#ae8b4d] block mt-1">
                      رمز الاختبار النشط: <code>{metaInfo.testEventCode}</code>
                    </small>
                  )}
                </div>
              </div>
              <span className="text-xs font-semibold text-[#3b5c37] bg-[#e7f0e1] px-2.5 py-1 inline-block">
                إلغاء التكرار (Deduplication) مفعّل بـ event_id
              </span>
            </div>
          </div>

          {/* Orders History Panel */}
          <section className="order-history-panel mb-8">
            <div className="order-history-heading">
              <div>
                <p className="eyebrow">سجل العمليات</p>
                <h2>طلبات الزبائن ({filteredOrders.length})</h2>
              </div>
              <div className="order-history-actions">
                <a
                  href={`/api/admin/orders/export`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="admin-quiet-button"
                  title="تحميل جدول إكسل بصيغة CSV المتوافقة مع العربية"
                >
                  <Download size={15} /> تصدير CSV للإكسل
                </a>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="ابحث برقم الطلب، اسم العميل، الهاتف، أو المحافظة…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-[#e2ded5] bg-[#fffefa] text-sm p-3 pr-10 focus:outline-none focus:border-[#ae8b4d]"
              />
              <Search size={18} className="text-[#78756e] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="order-history-state">
                {orders.length === 0
                  ? "لا توجد طلبات مسجلة بعد في قاعدة بيانات D1."
                  : "لا توجد نتائج تطابق بحثك."}
              </div>
            ) : (
              <div className="order-history-list">
                {filteredOrders.map((order) => {
                  const dateStr = new Date(order.created_at * 1000).toLocaleString("ar-IQ", {
                    timeZone: "Asia/Baghdad",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });

                  const isRetrying = retryingId === order.id;

                  return (
                    <details className="order-history-card" key={order.id}>
                      <summary>
                        <div className="order-card-main">
                          <strong>{order.id} — {order.customer_name}</strong>
                          <span>{order.governorate} • {order.phone}</span>
                        </div>
                        <div className="order-card-total">{formatIQD(order.total_price)}</div>
                        <div className="order-card-date">{dateStr}</div>
                        <div className="flex gap-1.5 flex-wrap">
                          <span
                            className={`order-status ${
                              order.telegram_sent ? "order-status-confirmed" : "order-status-delivery_failed"
                            }`}
                          >
                            تلغرام: {order.telegram_sent ? "✓" : "✗"}
                          </span>
                          <span
                            className={`order-status ${
                              order.sheet_sent ? "order-status-confirmed" : "order-status-delivery_failed"
                            }`}
                          >
                            شيتس: {order.sheet_sent ? "✓" : "✗"}
                          </span>
                          <span
                            className={`order-status ${
                              order.meta_sent ? "order-status-confirmed" : "order-status-delivery_failed"
                            }`}
                          >
                            ميتا: {order.meta_sent ? "✓" : "✗"}
                          </span>
                        </div>
                      </summary>

                      <div className="order-history-details">
                        <div>
                          <span>العنوان بالتفصيل</span>
                          <strong>{order.address}</strong>
                        </div>
                        <div>
                          <span>المنتج والموديل واللون</span>
                          <strong>
                            {order.product_id} | موديل: {order.model_id} ({order.color_id})
                          </strong>
                        </div>
                        <div>
                          <span>الكمية وسعر المفرد</span>
                          <strong>
                            {order.quantity} قطعة × {formatIQD(order.unit_price)}
                          </strong>
                        </div>
                        <div>
                          <span>معرف عدم التكرار (Idempotency Key)</span>
                          <code className="text-[11px] text-[#78756e] font-mono break-all" dir="ltr">
                            {order.idempotency_key}
                          </code>
                        </div>
                        <div>
                          <span>مصدر الزيارة (UTM / Tracking)</span>
                          <span className="text-xs text-[#544e42]">
                            {order.utm_source ? `Source: ${order.utm_source}` : "مباشر"}
                            {order.utm_campaign ? ` | Campaign: ${order.utm_campaign}` : ""}
                            {order.fbclid ? ` | fbclid: متوفر` : ""}
                          </span>
                        </div>
                        <div>
                          <span>إعادة الإرسال يدويًا</span>
                          <button
                            type="button"
                            onClick={() => retryOrder(order.id)}
                            disabled={isRetrying}
                            className="admin-quiet-button text-xs py-1 px-3 mt-1"
                          >
                            {isRetrying ? (
                              <>
                                <LoaderCircle size={14} className="spin" /> جاري الإرسال…
                              </>
                            ) : (
                              <>
                                <RefreshCw size={14} /> إعادة إرسال القنوات الآن
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>

          {/* Product Catalog Reference */}
          <section className="admin-panel mb-8">
            <div className="admin-panel-heading">
              <div>
                <span className="admin-step">01</span>
                <h2>كتالوج الساعات المتوفرة في المتجر ({PRODUCTS.length})</h2>
              </div>
              <span>يمكنك تعديل الأسعار والموديلات من src/config/products.ts</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {PRODUCTS.map((p) => (
                <div key={p.id} className="border border-[#e5e0d7] bg-[#fbf9f5] p-4 flex flex-col gap-3">
                  <div className="aspect-[4/3] bg-[#eeebe4] overflow-hidden flex items-center justify-center">
                    {p.images[0] ? (
                      <img src={p.images[0].url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Clock3 size={32} className="text-[#a38c61]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#27251f] mb-1">{p.productName}</h3>
                    <p className="text-xs text-[#78756e] line-clamp-2 mb-2">{p.description}</p>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#e5e0d7]">
                      <span className="text-[#78756e]">السعر:</span>
                      <strong className="text-sm font-bold text-[#ae8b4d]">{formatIQD(p.priceIQD)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <p className="admin-footer-note">
            مسجّل الدخول باسم {username}. النظام يعمل بكفاءة عبر Cloudflare Workers و D1 الموزعة.
          </p>
        </section>
      )}
    </main>
  );
}
