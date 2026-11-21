import React, { useState, useRef } from 'react';
import { ProductModel, ProductColor, calculateOrderPrice, PRODUCT } from '../../config/products';
import { IRAQ_GOVERNORATES, OrderSuccessResponse } from '../../shared/types';
import { TrackingParams } from '../utils/tracking';
import { MetaPixel } from '../utils/pixel';
import { normalizeIraqiPhone } from '../../worker/validation';
import { User, Phone, MapPin, Building, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

interface OrderFormProps {
  selectedModel: ProductModel;
  selectedColor: ProductColor;
  quantity: number;
  tracking: TrackingParams;
  onSuccess: (order: OrderSuccessResponse) => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({
  selectedModel,
  selectedColor,
  quantity,
  tracking,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [governorate, setGovernorate] = useState<string>(IRAQ_GOVERNORATES[0]);
  const [address, setAddress] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hasFiredInitiateCheckout = useRef(false);

  // Recomputed price
  const pricing = calculateOrderPrice(PRODUCT.id, quantity);

  // Trigger InitiateCheckout when user first focuses any field
  const handleFieldFocus = () => {
    if (!hasFiredInitiateCheckout.current) {
      hasFiredInitiateCheckout.current = true;
      const currency = import.meta.env.VITE_META_CURRENCY || 'USD';
      const usdRate = parseFloat(import.meta.env.VITE_USD_RATE || '1310');
      const val = currency === 'IQD' ? pricing.totalPriceIQD : Number((pricing.totalPriceIQD / usdRate).toFixed(2));
      MetaPixel.initiateCheckout(Math.max(0.01, val), currency);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    // Client-side quick validation
    const errors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 3) {
      errors.name = 'يرجى إدخال اسمك الكامل (3 أحرف على الأقل)';
    }

    const phoneValidation = normalizeIraqiPhone(phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.error || 'يرجى إدخال رقم هاتف عراقي صحيح يتكون من 11 رقماً (مثال: 07701234567)';
    }

    if (!address.trim() || address.trim().length < 5) {
      errors.address = 'يرجى كتابة العنوان بشكل مفصل (المنطقة، أقرب نقطة دالة)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage(Object.values(errors)[0]);
      return;
    }

    setLoading(true);

    try {
      // Generate client-side UUID for idempotency
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'idemp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);

      const payload = {
        name: name.trim(),
        phone: phoneValidation.normalized,
        governorate,
        address: address.trim(),
        productId: PRODUCT.id,
        modelId: selectedModel.id,
        colorId: selectedColor.id,
        quantity,
        website_url_hp: honeypot,
        turnstileToken,
        sourceUrl: tracking.sourceUrl,
        utmSource: tracking.utmSource,
        utmMedium: tracking.utmMedium,
        utmCampaign: tracking.utmCampaign,
        utmContent: tracking.utmContent,
        utmTerm: tracking.utmTerm,
        fbclid: tracking.fbclid,
        fbp: tracking.fbp,
        fbc: tracking.fbc,
      };

      const response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;

      if (!response.ok || !data.success) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        throw new Error(data.error || 'تعذر إرسال الطلب، يرجى المحاولة مرة أخرى');
      }

      // Meta Pixel Purchase Event
      const currency = import.meta.env.VITE_META_CURRENCY || 'USD';
      const usdRate = parseFloat(import.meta.env.VITE_USD_RATE || '1310');
      const val = currency === 'IQD' ? data.totalIQD : Number((data.totalIQD / usdRate).toFixed(2));

      MetaPixel.purchase({
        orderId: data.orderId,
        value: Math.max(0.01, val),
        currency,
        productId: PRODUCT.id,
        quantity: data.quantity,
      });

      onSuccess(data);
    } catch (err: any) {
      console.error('[OrderForm] Submit error:', err);
      setErrorMessage(err?.message || 'حدث خطأ في الاتصال بالخادم، يرجى إعادة المحاولة.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="order-section" className="bg-[#18181f] rounded-3xl p-5 md:p-8 border border-amber-500/30 shadow-2xl">
      <div className="text-center mb-6">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1">
          الدفع عند الاستلام
        </span>
        <h3 className="text-2xl md:text-3xl font-black text-white">
          أدخل معلومات التوصيل لإتمام الطلب
        </h3>
        <p className="text-gray-400 text-xs md:text-sm mt-1">
          لن تدفع أي دينار الآن؛ الدفع نقداً عند استلام الساعة ومعاينتها أمام المندوب
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs md:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 font-bold">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot field (hidden from normal view) */}
        <input
          type="text"
          name="website_url_hp"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />

        {/* Name Field */}
        <div>
          <label className="block text-xs md:text-sm font-bold text-gray-200 mb-1.5 text-right">
            الاسم الكامل:
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={name}
              onFocus={handleFieldFocus}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: علي محمد كريم"
              className={`w-full bg-gray-900/90 text-white placeholder-gray-500 rounded-xl px-4 py-3.5 pr-11 border text-sm focus:outline-none transition-all ${
                fieldErrors.name
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-gray-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
              }`}
            />
            <User className="w-5 h-5 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.name && (
            <span className="text-red-400 text-[11px] font-medium block mt-1 text-right">
              {fieldErrors.name}
            </span>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label className="block text-xs md:text-sm font-bold text-gray-200 mb-1.5 text-right">
            رقم الهاتف (عراقي):
          </label>
          <div className="relative">
            <input
              type="tel"
              required
              dir="ltr"
              value={phone}
              onFocus={handleFieldFocus}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXXX"
              className={`w-full bg-gray-900/90 text-white placeholder-gray-500 rounded-xl px-4 py-3.5 pl-11 text-left font-mono border text-sm focus:outline-none transition-all ${
                fieldErrors.phone
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-gray-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
              }`}
            />
            <Phone className="w-5 h-5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-gray-400 text-[11px] block mt-1 text-right">
            يتكون من 11 رقماً (مثال: 07701234567 أو 07801234567)
          </span>
          {fieldErrors.phone && (
            <span className="text-red-400 text-[11px] font-medium block mt-1 text-right">
              {fieldErrors.phone}
            </span>
          )}
        </div>

        {/* Governorate Dropdown */}
        <div>
          <label className="block text-xs md:text-sm font-bold text-gray-200 mb-1.5 text-right">
            المحافظة:
          </label>
          <div className="relative">
            <select
              value={governorate}
              onFocus={handleFieldFocus}
              onChange={(e) => setGovernorate(e.target.value)}
              className="w-full bg-gray-900/90 text-white rounded-xl px-4 py-3.5 pr-11 border border-gray-700 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 appearance-none transition-all cursor-pointer"
            >
              {IRAQ_GOVERNORATES.map((gov) => (
                <option key={gov} value={gov} className="bg-gray-900 text-white py-2">
                  {gov}
                </option>
              ))}
            </select>
            <MapPin className="w-5 h-5 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Detailed Address */}
        <div>
          <label className="block text-xs md:text-sm font-bold text-gray-200 mb-1.5 text-right">
            العنوان بالتفصيل:
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={address}
              onFocus={handleFieldFocus}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="المنطقة، الشارع، أقرب نقطة دالة"
              className={`w-full bg-gray-900/90 text-white placeholder-gray-500 rounded-xl px-4 py-3.5 pr-11 border text-sm focus:outline-none transition-all ${
                fieldErrors.address
                  ? 'border-red-500 ring-1 ring-red-500'
                  : 'border-gray-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
              }`}
            />
            <Building className="w-5 h-5 text-gray-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {fieldErrors.address && (
            <span className="text-red-400 text-[11px] font-medium block mt-1 text-right">
              {fieldErrors.address}
            </span>
          )}
        </div>

        {/* Live Order Summary Box */}
        <div className="bg-black/40 rounded-2xl p-4 border border-gray-800 text-xs md:text-sm space-y-2 my-5">
          <div className="flex justify-between text-gray-300">
            <span>المنتج:</span>
            <span className="font-bold text-white">{PRODUCT.nameAr}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>الموديل المختار:</span>
            <span className="font-bold text-amber-300">{selectedModel.nameAr}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>اللون:</span>
            <span className="font-bold text-amber-300">{selectedColor.nameAr}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>الكمية:</span>
            <span className="font-bold text-white">{quantity} قطعة</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>أجور التوصيل:</span>
            <span className="font-bold text-emerald-400">مجاناً 100% لكافة محافظات العراق</span>
          </div>
          <div className="pt-2 border-t border-gray-800 flex justify-between items-center text-base">
            <span className="font-extrabold text-white">المجموع النهائي:</span>
            <div className="text-left">
              <span className="font-black text-xl md:text-2xl text-amber-400">
                {pricing.totalPriceIQD.toLocaleString()}
              </span>
              <span className="text-xs text-gray-400 mr-1">دينار عراقي</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-60 text-black font-black text-lg py-4 px-6 rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-3 transform active:scale-95 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>جاري تأكيد وتسجيل طلبك...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-6 h-6" />
              <span>تأكيد الطلب الآن - الدفع عند الاستلام</span>
            </>
          )}
        </button>

        <p className="text-center text-[11px] text-gray-400 mt-2">
          🔒 بياناتك الشخصية مشفرة ومحمية بالكامل ولن تستخدم إلا لتوصيل طلبك
        </p>
      </form>
    </div>
  );
};
