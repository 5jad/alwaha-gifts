// Product configuration for the store
// Edit prices, clocks, models, colors, and features directly here without touching any other code.

export interface StorefrontImage {
  id: number;
  url: string;
  isActive: boolean;
  fit?: "contain" | "cover";
  scale?: number;
}

export interface StorefrontModel {
  id: string;
  name: string;
  colors: string[];
  stock: number;
}

export interface StorefrontProduct {
  id: string;
  isPublished: boolean;
  storeName: string;
  category: string;
  productName: string;
  nameAr: string; // alias
  tagline: string;
  description: string;
  priceIQD: number;
  basePriceIQD: number; // alias
  compareAtPriceIQD: number;
  features: string[];
  images: StorefrontImage[];
  models: StorefrontModel[];
}

export interface PromiseItem {
  id: string;
  icon: "truck" | "shield-check" | "clock3" | "star" | "package" | "check";
  title: string;
  subtitle: string;
}

export const DEFAULT_PROMISES: PromiseItem[] = [
  {
    id: "promise-1",
    icon: "truck",
    title: "تأكيد مباشر وتوصيل مجاني",
    subtitle: "مندوبنا يتواصل وياك ويصل لباب بيتك مجاناً"
  },
  {
    id: "promise-2",
    icon: "shield-check",
    title: "فحص ومعاينة قبل الدفع",
    subtitle: "افتح الطرد وافحص الساعة كاملة قبل تسليم المبلغ"
  },
  {
    id: "promise-3",
    icon: "clock3",
    title: "ماكينة صامتة 100%",
    subtitle: "حركة كوارتز انسيابية ناعمة بدون دقات مزعجة"
  }
];

export const STORE_CONFIG = {
  storeName: "الواحة للهداية",
  subtitle: "ساعات جدارية فاخرة",
  tagline: "ساعات جدارية بتفاصيل تختارها بعناية",
  currencyAr: "د.ع",
};

export const PRODUCTS: StorefrontProduct[] = [
  {
    id: "royal-sunburst-3d",
    isPublished: true,
    storeName: "الواحة للهداية",
    category: "ساعة جدارية ملكية",
    productName: "ساعة إشعاع الشمس الملكية (Sunburst Luxury 3D)",
    nameAr: "ساعة إشعاع الشمس الملكية (Sunburst Luxury 3D)",
    tagline: "لمسة فخامة وأناقة عصرية تحول جدار منزلك إلى تحفة فنية راقية",
    description: "ساعة جدارية بتصميم هندسي فريد مستوحى من إشعاع الشمس الذهبي، يجمع بين الفولاذ المقاوم للصدأ وحركة الكوارتز الصامتة تماماً (Silent Quartz Movement) الخالية من أي صوت دقات مزعج.",
    priceIQD: 35000,
    basePriceIQD: 35000,
    compareAtPriceIQD: 55000,
    features: [
      "محرك كوارتز صامت 100% انسيابي الحركة بدون أي صوت دقات مزعجة",
      "هيكل فولاذي فاخر مطلي كهروستاتيكياً لمقاومة الصدأ والرطوبة وتغير اللون",
      "قطر 50 سم لإطلالة لافتة وواضحة تملأ الجدار برقي",
      "توصيل سريع ومجاني لباب بيتك في كافة المحافظات العراقية الـ 18",
      "معاينة وفحص وتشغيل الساعة أمام مندوب التوصيل قبل دفع أي دينار",
      "ضمان استبدال تشغيلي حقيقي لمدة سنة كاملة"
    ],
    images: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      },
      {
        id: 2,
        url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      },
      {
        id: 3,
        url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      },
      {
        id: 4,
        url: "https://images.unsplash.com/photo-1585128792020-803d29415281?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      }
    ],
    models: [
      {
        id: "model-sunburst-gold",
        name: "موديل إشعاع الشمس الذهبي",
        colors: ["ذهبي ملكي (Royal Gold)", "أسود مطفي مع عقارب ذهبية", "روز غولد برونزي"],
        stock: 14
      },
      {
        id: "model-sunburst-black",
        name: "موديل إشعاع الشمس الأسود الفاخر",
        colors: ["أسود ملكي كامل", "أسود مع فضي نقي"],
        stock: 9
      }
    ]
  },
  {
    id: "nordic-minimalist",
    isPublished: true,
    storeName: "الواحة للهداية",
    category: "ساعة جدارية نورديك",
    productName: "ساعة النورديك الدائرية الهادئة (Nordic Minimalist)",
    nameAr: "ساعة النورديك الدائرية الهادئة (Nordic Minimalist)",
    tagline: "بساطة راقية تمنح صالتك أو مكتبك هدوءاً وجمالاً عصرياً",
    description: "تصميم اسكندنافي بسيط وأنيق يتميز بإطار دائري مصقول وأرقام محفورة بدقة متناهية مع عقارب خشبية أو معدنية رشيقة.",
    priceIQD: 32000,
    basePriceIQD: 32000,
    compareAtPriceIQD: 48000,
    features: [
      "ماكينة كوارتز فائقة الدقة والهدوء التام",
      "إطار منحوت من سبائك الألومنيوم غير اللامع",
      "زجاج عالي النقاء مضاد للانعكاس وسهل التنظيف",
      "توصيل مجاني لجميع محافظات العراق مع المعاينة قبل الدفع",
      "ضمان لمدة سنة كاملة ضد أي عطل مصنعي"
    ],
    images: [
      {
        id: 5,
        url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      },
      {
        id: 6,
        url: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      }
    ],
    models: [
      {
        id: "model-nordic-wood",
        name: "موديل النورديك الأبيض مع الخشب",
        colors: ["أبيض ناصع مع خشب طبيعي", "رمادي هادئ"],
        stock: 11
      },
      {
        id: "model-nordic-dark",
        name: "موديل النورديك الرمادي الداكن",
        colors: ["رمادي فحمي", "كحلي كلاسيكي"],
        stock: 8
      }
    ]
  },
  {
    id: "geometric-diamond",
    isPublished: true,
    storeName: "الواحة للهداية",
    category: "ساعة جدارية مودرن",
    productName: "ساعة الألماس الهندسي ثلاثية الأبعاد (Geometric 3D)",
    nameAr: "ساعة الألماس الهندسي ثلاثية الأبعاد (Geometric 3D)",
    tagline: "خطوط هندسية مبتكرة تضفي طابعاً مستقبلياً جذاباً على الجدار",
    description: "تصميم هندسي متشابك بتقنية الليزر ثلاثية الأبعاد يمنح الجدار عمقاً وظلالاً فنية رائعة مع الإضاءة المحيطة.",
    priceIQD: 38000,
    basePriceIQD: 38000,
    compareAtPriceIQD: 60000,
    features: [
      "قص ليزري دقيق وتشطيب يدوي متقن",
      "حركة عقارب انسيابية صامتة معتمدة",
      "مسمار تعليق فولاذي خفي سهل التثبيت لا يتلف الجدار",
      "شحن مجاني مع إمكانية الفحص والتجربة أمام المندوب",
      "ضمان استبدال سنة كاملة"
    ],
    images: [
      {
        id: 7,
        url: "https://images.unsplash.com/photo-1585128792020-803d29415281?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      },
      {
        id: 8,
        url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80",
        isActive: true,
        fit: "contain",
        scale: 96
      }
    ],
    models: [
      {
        id: "model-geometric-gold",
        name: "الموديل الهندسي الذهبي الفاخر",
        colors: ["ذهبي ميتاليك", "برونزي معتق"],
        stock: 12
      },
      {
        id: "model-geometric-black",
        name: "الموديل الهندسي الأسود المات",
        colors: ["أسود مطفي", "أسود مع أطراف ذهبية"],
        stock: 7
      }
    ]
  }
];

// Single product default reference (for single-product mode or backwards compatibility)
export const PRODUCT = PRODUCTS[0];

export function formatIQD(value: number | null): string {
  if (value === null || value === undefined) return "يُضاف السعر من لوحة الإدارة";
  return `${new Intl.NumberFormat("ar-IQ", { maximumFractionDigits: 0 }).format(value)} د.ع`;
}

/**
 * Computes price based on product, unit price, or product ID, with volume discounts.
 * (Save 10,000 IQD on 2 clocks, save 21,000+ IQD on 3+ clocks).
 */
export function calculateOrderPrice(
  productOrIdOrPrice: string | StorefrontProduct | number,
  quantity: number,
  catalog: StorefrontProduct[] = PRODUCTS
): {
  unitPriceIQD: number;
  totalPriceIQD: number;
} {
  let basePrice = 35000;
  if (typeof productOrIdOrPrice === "number") {
    basePrice = productOrIdOrPrice;
  } else if (typeof productOrIdOrPrice === "object" && productOrIdOrPrice !== null) {
    basePrice = productOrIdOrPrice.priceIQD || 35000;
  } else if (typeof productOrIdOrPrice === "string") {
    const matchedProduct = catalog.find((p) => p.id === productOrIdOrPrice) || PRODUCTS.find((p) => p.id === productOrIdOrPrice) || PRODUCT;
    basePrice = matchedProduct.priceIQD || 35000;
  }

  const qty = Math.max(1, Math.min(20, Math.floor(quantity)));

  // Volume discounts:
  let discountPerUnit = 0;
  if (qty === 2) {
    discountPerUnit = 5000; // 10,000 IQD discount on 2 units
  } else if (qty >= 3) {
    discountPerUnit = 7000; // 21,000+ IQD discount on 3+ units
  }

  const unitPriceIQD = Math.max(1000, basePrice - discountPerUnit);
  const totalPriceIQD = unitPriceIQD * qty;

  return {
    unitPriceIQD,
    totalPriceIQD
  };
}
