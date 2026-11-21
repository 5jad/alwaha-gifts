import React from 'react';
import { PRODUCT, ProductModel, ProductColor } from '../../config/products';
import { Check, Plus, Minus, Tag } from 'lucide-react';

interface ModelColorSelectorProps {
  selectedModel: ProductModel;
  onSelectModel: (model: ProductModel) => void;
  selectedColor: ProductColor;
  onSelectColor: (color: ProductColor) => void;
  quantity: number;
  onChangeQuantity: (qty: number) => void;
}

export const ModelColorSelector: React.FC<ModelColorSelectorProps> = ({
  selectedModel,
  onSelectModel,
  selectedColor,
  onSelectColor,
  quantity,
  onChangeQuantity,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Model Selector */}
      <div>
        <label className="block text-sm font-extrabold text-white mb-2">
          1. اختر الموديل:
          <span className="text-amber-400 mr-2 text-xs font-normal">
            ({selectedModel.nameAr})
          </span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRODUCT.models.map((model) => {
            const isSelected = selectedModel.id === model.id;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => onSelectModel(model)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-right transition-all relative ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/20'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                }`}
              >
                <img
                  src={model.image}
                  alt={model.nameAr}
                  className="w-14 h-14 object-cover rounded-xl shrink-0"
                />
                <div className="min-w-0 flex-1">
                  {model.badge && (
                    <span className="inline-block bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full mb-1">
                      {model.badge}
                    </span>
                  )}
                  <h4 className="font-bold text-xs md:text-sm text-white truncate">
                    {model.nameAr}
                  </h4>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Color Selector */}
      <div>
        <label className="block text-sm font-extrabold text-white mb-2">
          2. اختر اللون:
          <span className="text-amber-400 mr-2 text-xs font-normal">
            ({selectedColor.nameAr})
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {PRODUCT.colors.map((color) => {
            const isSelected = selectedColor.id === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => onSelectColor(color)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-right transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/20'
                    : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-full shadow-inner border border-white/20 shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                <span className="text-xs font-bold text-gray-200 truncate">
                  {color.nameAr}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Quantity Selector & Volume Discount Banner */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-extrabold text-white">
            3. حدد الكمية:
          </label>
          {quantity >= 2 && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
              <Tag className="w-3 h-3" />
              تم تطبيق خصم الكمية!
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 bg-gray-900/70 p-3 rounded-2xl border border-gray-800">
          <div className="flex items-center bg-gray-800/80 rounded-xl p-1 border border-gray-700">
            <button
              type="button"
              disabled={quantity <= 1}
              onClick={() => onChangeQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-lg bg-gray-700/60 text-white flex items-center justify-center hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-12 text-center font-black text-lg text-white">
              {quantity}
            </span>
            <button
              type="button"
              disabled={quantity >= 20}
              onClick={() => onChangeQuantity(Math.min(20, quantity + 1))}
              className="w-10 h-10 rounded-lg bg-amber-500 text-black flex items-center justify-center hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          <div className="text-xs text-gray-300">
            {quantity === 1 ? (
              <p className="text-amber-300">
                💡 <span className="font-bold underline cursor-pointer" onClick={() => onChangeQuantity(2)}>اطلب ساعتين</span> واحصل على خصم 10,000 د.ع فوراً!
              </p>
            ) : quantity === 2 ? (
              <p className="text-emerald-400 font-bold">
                🎉 وفرت 10,000 د.ع! (سعر الساعة: 30,000 د.ع بدلاً من 35,000 د.ع)
              </p>
            ) : (
              <p className="text-emerald-400 font-bold">
                🔥 وفرت {(quantity * 7000).toLocaleString()} د.ع! (سعر الساعة: 28,000 د.ع)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
