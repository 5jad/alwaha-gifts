import React from 'react';
import { ShieldCheck, Lock, Heart } from 'lucide-react';
import { PRODUCT } from '../../config/products';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0b0b0d] border-t border-gray-800/80 pt-10 pb-24 md:pb-12 px-4 text-gray-400 text-xs">
      <div className="max-w-4xl mx-auto space-y-6 text-center">
        {/* Guarantees */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-gray-300 font-semibold">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ضمان استبدال حقيقي لمدة سنة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>دفع آمن عند الاستلام مع المعاينة</span>
          </div>
        </div>

        <p className="max-w-2xl mx-auto text-gray-400 leading-relaxed">
          جميع حقوق الطبع والنشر محفوظة © {new Date().getFullYear()} {PRODUCT.nameAr}. نحن متجر عراقي متخصص بأحدث وأجود موديلات الساعات الجدارية والديكورات العصرية.
        </p>

        {/* Privacy Note with GPC notice */}
        <div className="bg-gray-900/50 border border-gray-800/60 rounded-xl p-4 max-w-xl mx-auto text-right text-[11px] leading-relaxed text-gray-400">
          <h4 className="font-bold text-gray-300 mb-1">🔒 سياسة الخصوصية وحماية بيانات الزبائن:</h4>
          <p>
            نحن نحترم خصوصيتك بالكامل. تُستخدم بياناتك الشخصية (الاسم، رقم الهاتف، العنوان) حصرياً لأغراض إيصال الطرد والتواصل معك بخصوص طلبيتك عبر مندوب الشحن. نحن لا نبيع ولا نشارك أي معلومات شخصية مع أي جهات خارجية. يحترم نظامنا إشارات حماية الخصوصية العامة (Global Privacy Control) لتقييد أي تتبع غير ضروري.
          </p>
        </div>

        <div className="pt-2 text-gray-400 flex items-center justify-center gap-1">
          <span>صنع بعناية لخدمة زبائننا الكرام في كافة محافظات العراق</span>
          <Heart className="w-3.5 h-3.5 text-red-500 fill-current inline" />
        </div>
      </div>
    </footer>
  );
};
