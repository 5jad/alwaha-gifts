import React from 'react';
import { ShoppingBag, Truck } from 'lucide-react';

interface StickyBuyButtonProps {
  totalPriceIQD: number;
  onOrderClick: () => void;
}

export const StickyBuyButton: React.FC<StickyBuyButtonProps> = ({
  totalPriceIQD,
  onOrderClick,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#121216]/95 backdrop-blur-lg border-t border-gray-800 p-3 shadow-2xl safe-area-bottom">
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="text-right">
          <span className="text-[10px] text-gray-400 block flex items-center gap-1">
            <Truck className="w-3 h-3 text-emerald-400" />
            شحن مجاني لكافة المحافظات
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-amber-400">
              {totalPriceIQD.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-gray-300">د.ع</span>
          </div>
        </div>

        <button
          onClick={onOrderClick}
          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 active:from-amber-600 active:to-amber-700 text-black font-black text-base py-3 px-5 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
        >
          <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
          <span>اطلب الآن - دفع عند الاستلام</span>
        </button>
      </div>
    </div>
  );
};
