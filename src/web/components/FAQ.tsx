import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { PRODUCT } from '../../config/products';

export const FAQ: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-10 px-4 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1">
          إجابات واضحة
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-white">
          الأسئلة الأكثر شيوعاً
        </h2>
      </div>

      <div className="space-y-3">
        {PRODUCT.faq.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="bg-[#18181f] rounded-2xl border border-gray-800 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full p-4 md:p-5 text-right flex items-center justify-between gap-3 text-white font-bold text-sm md:text-base hover:bg-gray-800/40 transition-colors"
              >
                <span>{item.qAr}</span>
                <ChevronDown
                  className={`w-5 h-5 text-amber-400 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="p-4 md:p-5 pt-0 text-gray-300 text-xs md:text-sm leading-relaxed border-t border-gray-800/50 bg-black/20">
                  {item.aAr}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
