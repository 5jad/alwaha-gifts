import React from 'react';
import { Truck, ShieldCheck, Clock } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-[#121216]/95 backdrop-blur-md border-b border-gray-800">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white text-xs md:text-sm py-2 px-4 text-center font-bold tracking-wide shadow-inner flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <Truck className="w-4 h-4 animate-bounce" />
          توصيل مجاني لكافة محافظات العراق الـ 18
        </span>
        <span className="hidden sm:inline opacity-75">|</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-200" />
          الدفع عند الاستلام مع المعاينة والفحص قبل الدفع
        </span>
      </div>

      {/* Main Header Nav */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-black">
            <Clock className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-lg md:text-xl tracking-tight text-white block">
              متجر الأناقة
            </span>
            <span className="text-[11px] text-amber-400/90 font-medium block">
              ساعات حائط فاخرة وديكور عصري
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#order-section"
            className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold px-5 py-2 rounded-xl text-sm transition-all shadow-md shadow-amber-500/20 transform active:scale-95"
          >
            اطلب الآن
          </a>
        </div>
      </div>
    </header>
  );
};
