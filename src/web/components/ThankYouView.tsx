import React from 'react';
import { CheckCircle, Truck, RotateCcw } from 'lucide-react';
import { OrderSuccessResponse } from '../../shared/types';

interface ThankYouViewProps {
  order: OrderSuccessResponse;
  onReset: () => void;
}

export const ThankYouView: React.FC<ThankYouViewProps> = ({ order, onReset }) => {
  return (
    <section className="py-12 px-4 max-w-2xl mx-auto text-center animate-fade-in">
      <div className="bg-[#18181f] rounded-3xl p-6 md:p-8 border border-emerald-500/30 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500" />

        {/* Success Icon */}
        <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>

        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
          شكراً لك، تم استلام طلبك بنجاح!
        </h2>
        <p className="text-gray-300 text-sm md:text-base mb-6 leading-relaxed">
          أهلاً بك يا <span className="font-bold text-amber-400">{order.customerName}</span>. تم تسجيل طلبك وسيقوم مندوب خدمة العملاء بالاتصال بك قريباً لتأكيد موعد التوصيل.
        </p>

        {/* Order Details Receipt Card */}
        <div className="bg-black/40 rounded-2xl p-4 md:p-5 text-right border border-gray-800 space-y-3 mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <span className="text-xs text-gray-400">رقم الطلب (Order ID):</span>
            <span className="font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded text-sm">
              {order.orderId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>الموديل واللون:</span>
            <span className="font-bold text-white">
              {order.modelName} ({order.colorName})
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>الكمية المطلوبة:</span>
            <span className="font-bold text-white">{order.quantity} قطعة</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>المحافظة:</span>
            <span className="font-bold text-white">{order.governorate}</span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-300">
            <span>رقم الهاتف للتواصل:</span>
            <span className="font-bold font-mono text-white" dir="ltr">
              {order.phone}
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-800">
            <span className="font-bold text-sm text-gray-200">المجموع المطلوب عند الاستلام:</span>
            <span className="font-black text-xl text-emerald-400">
              {order.totalIQD.toLocaleString()} د.ع
            </span>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-8 text-right text-xs md:text-sm text-amber-200/90 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Truck className="w-4 h-4 shrink-0" />
            <span>ملاحظات التوصيل:</span>
          </div>
          <p>• التوصيل مجاني بالكامل بدون أي أجور إضافية.</p>
          <p>• يستغرق التوصيل 24 ساعة لبغداد و 48 ساعة لكافة المحافظات العراقية.</p>
          <p>• يرجى إبقاء الهاتف مفتوحاً للرد على مندوب شركة الشحن.</p>
          <p>• يحق لك فحص ومعاينة الساعة وتشغيلها قبل تسليم المبلغ للمندوب.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-bold py-3 px-6 rounded-xl border border-gray-700 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>طلب منتج إضافي</span>
          </button>
        </div>
      </div>
    </section>
  );
};
