import React from 'react';
import { VolumeX, ShieldCheck, Truck, PackageCheck } from 'lucide-react';
import { PRODUCT } from '../../config/products';

export const Benefits: React.FC = () => {
  const iconMap: Record<string, React.ReactNode> = {
    'volume-x': <VolumeX className="w-8 h-8 text-amber-400" />,
    'shield-check': <ShieldCheck className="w-8 h-8 text-emerald-400" />,
    'truck': <Truck className="w-8 h-8 text-amber-400" />,
    'package-check': <PackageCheck className="w-8 h-8 text-emerald-400" />,
  };

  return (
    <section className="py-10 px-4 max-w-5xl mx-auto border-t border-b border-gray-800/80 my-4">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
          لماذا يختار العراقيون ساعات متجر الأناقة؟
        </h2>
        <p className="text-gray-400 text-sm max-w-xl mx-auto">
          نحن لا نبيعك مجرد ساعة؛ بل نقدم لك راحة بال تامة وضماناً حقيقياً يرافقك
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PRODUCT.features.map((feature, i) => (
          <div
            key={i}
            className="bg-[#18181f] p-5 rounded-2xl border border-gray-800 hover:border-amber-500/30 transition-all flex flex-col items-center text-center shadow-lg"
          >
            <div className="w-14 h-14 rounded-2xl bg-gray-800/70 flex items-center justify-center mb-4 border border-gray-700/40">
              {iconMap[feature.icon] || <ShieldCheck className="w-8 h-8 text-amber-400" />}
            </div>
            <h3 className="font-extrabold text-white text-base mb-2">
              {feature.titleAr}
            </h3>
            <p className="text-gray-400 text-xs md:text-sm leading-relaxed">
              {feature.descAr}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
