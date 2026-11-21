import React from 'react';
import { Star, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { PRODUCT } from '../../config/products';

interface HeroProps {
  onOrderClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOrderClick }) => {
  return (
    <section className="relative overflow-hidden pt-6 pb-10 px-4 md:px-8 border-b border-gray-800/60 bg-gradient-to-b from-[#18181f] to-[#121216]">
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        {/* Social Proof & Rating Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-1.5 mb-5 text-amber-300 text-xs md:text-sm font-semibold shadow-sm">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-current" />
            ))}
          </div>
          <span>تقييم 4.9 من 5 (أكثر من 1,280 زبون في العراق)</span>
          <Sparkles className="w-4 h-4 text-amber-400" />
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 tracking-tight">
          ساعة الحائط الملكية ثلاثية الأبعاد
          <span className="block mt-2 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            فخامة عصرية تدوم لسنوات
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-300 text-base md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
          {PRODUCT.taglineAr}. ماكينة كوارتز صامتة 100% بدون أي صوت دقات، مصنوعة من سبائك معدنية مقاومة للصدأ مع ضمان حقيقي لمدة سنة.
        </p>

        {/* Price & Discount Spotlight */}
        <div className="inline-flex items-center gap-3 bg-gray-900/80 border border-amber-500/40 rounded-2xl p-3 md:p-4 mb-8 shadow-xl">
          <div className="text-right">
            <span className="text-xs text-gray-400 line-through block">
              {PRODUCT.compareAtPriceIQD.toLocaleString()} د.ع
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl md:text-3xl font-black text-amber-400">
                {PRODUCT.basePriceIQD.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-gray-300">دينار عراقي</span>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-700" />
          <div className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center">
            <span>وفر 20,000 د.ع</span>
            <span className="text-[10px] text-emerald-300">+ شحن مجاني</span>
          </div>
        </div>

        {/* Trust Points */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto mb-8 text-xs md:text-sm text-gray-300">
          <div className="flex items-center justify-center gap-1.5 bg-gray-800/40 rounded-lg py-2 px-3 border border-gray-700/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ماكينة صامتة تماماً</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 bg-gray-800/40 rounded-lg py-2 px-3 border border-gray-700/50">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>معاينة قبل الدفع</span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 bg-gray-800/40 rounded-lg py-2 px-3 border border-gray-700/50">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ضمان استبدال سنة</span>
          </div>
        </div>

        {/* Primary Call to Action */}
        <div>
          <button
            onClick={onOrderClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-lg md:text-xl px-10 py-4 rounded-2xl shadow-xl shadow-amber-500/30 transform active:scale-95 transition-all animate-pulse-subtle"
          >
            <span>اطلب الآن - الدفع عند الاستلام</span>
          </button>
          <span className="block mt-2.5 text-xs text-gray-400">
            ⚡ العرض ساري حتى نفاد الكمية المخصصة لهذا الأسبوع
          </span>
        </div>
      </div>
    </section>
  );
};
