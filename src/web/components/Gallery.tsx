import React, { useState } from 'react';
import { PRODUCT } from '../../config/products';
import { Sparkles } from 'lucide-react';

export const Gallery: React.FC = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentImage = PRODUCT.galleryImages[activeIdx] || PRODUCT.galleryImages[0];

  return (
    <section className="py-8 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-wider block mb-1">
          معرض الصور الحقيقي
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-white">
          شاهد فخامة التفاصيل على الواقع
        </h2>
      </div>

      <div className="bg-[#18181f] rounded-3xl p-3 md:p-6 border border-gray-800 shadow-2xl">
        {/* Main Display Image */}
        <div className="relative aspect-square sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black/60 group">
          <img
            src={currentImage.url}
            alt={currentImage.altAr}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badge Overlay */}
          <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>تصوير واقعي عالي الدقة</span>
          </div>

          {/* Caption Overlay */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 md:p-6 text-right">
            <p className="text-white font-bold text-sm md:text-base">
              {currentImage.captionAr}
            </p>
          </div>
        </div>

        {/* Thumbnail Selector */}
        <div className="grid grid-cols-4 gap-2 md:gap-4 mt-4">
          {PRODUCT.galleryImages.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                activeIdx === idx
                  ? 'border-amber-400 ring-2 ring-amber-400/30 scale-95'
                  : 'border-gray-800 hover:border-gray-700 opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img.url}
                alt={img.altAr}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              {activeIdx === idx && (
                <div className="absolute inset-0 bg-amber-500/10" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
