// Product configuration for the wall clock landing page
// Edit prices, images, models, and colors here without touching code.

export interface ProductModel {
  id: string;
  nameAr: string;
  badge?: string;
  image: string;
}

export interface ProductColor {
  id: string;
  nameAr: string;
  hex: string;
  border?: string;
}

export interface ProductFeature {
  titleAr: string;
  descAr: string;
  icon: string;
}

export interface ProductConfig {
  id: string;
  nameAr: string;
  taglineAr: string;
  basePriceIQD: number;
  compareAtPriceIQD: number;
  currencyAr: string;
  freeShipping: boolean;
  warrantyMonths: number;
  descriptionAr: string;
  galleryImages: {
    url: string;
    altAr: string;
    captionAr: string;
  }[];
  models: ProductModel[];
  colors: ProductColor[];
  features: ProductFeature[];
  discounts: {
    minQuantity: number;
    discountPerUnitIQD: number;
    badgeAr?: string;
  }[];
  faq: {
    qAr: string;
    aAr: string;
  }[];
}

export const PRODUCT: ProductConfig = {
  id: "royal-wall-clock-3d",
  nameAr: "ساعة الحائط الملكية الفاخرة ثلاثية الأبعاد (3D Modern Luxury)",
  taglineAr: "لمسة فخامة وأناقة عصرية تحول جدار منزلك إلى تحفة فنية راقية",
  basePriceIQD: 35000,
  compareAtPriceIQD: 55000,
  currencyAr: "د.ع",
  freeShipping: true,
  warrantyMonths: 12,
  descriptionAr: "ساعة حائط عصرية بتصميم هندسي فريد يجمع بين الخشب الطبيعي والمعدن المقاوم للصدأ مع حركة عقارب صامتة تماماً (Silent Quartz Movement) خالية من أي صوت دقات مزعجة. مثالية لغرفة المعيشة، المكاتب، والديوانيات.",
  galleryImages: [
    {
      url: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=1000&q=80",
      altAr: "ساعة الحائط الملكية الذهبية على جدار صالون عصري",
      captionAr: "تصميم ملكي راقٍ مع تفاصيل ذهبية لامعة"
    },
    {
      url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80",
      altAr: "ساعة حائط باللون الأسود الملكي",
      captionAr: "اللون الأسود المطفي مع عقارب نحاسية أنيقة"
    },
    {
      url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1000&q=80",
      altAr: "تفاصيل العقارب الصامتة والتجميع المتقن",
      captionAr: "ماكينة كوارتز فائقة الهدوء وضمان حقيقي لمدة سنة"
    },
    {
      url: "https://images.unsplash.com/photo-1585128792020-803d29415281?auto=format&fit=crop&w=1000&q=80",
      altAr: "تناسق رائع مع الأثاث والديكور الداخلي",
      captionAr: "قطر 50 سم لإطلالة واضحة وجذابة تلفت الأنظار"
    }
  ],
  models: [
    {
      id: "model-sunburst",
      nameAr: "موديل إشعاع الشمس (Sunburst Luxury)",
      badge: "الأكثر طلباً",
      image: "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "model-minimalist",
      nameAr: "موديل النورديك الدائري (Nordic Minimalist)",
      badge: "عصري هادئ",
      image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"
    },
    {
      id: "model-geometric",
      nameAr: "موديل الألماس الهندسي (Geometric Diamond)",
      badge: "تصميم حصري",
      image: "https://images.unsplash.com/photo-1585128792020-803d29415281?auto=format&fit=crop&w=600&q=80"
    }
  ],
  colors: [
    {
      id: "gold",
      nameAr: "ذهبي ملكي (Royal Gold)",
      hex: "#D4AF37",
      border: "#B38F24"
    },
    {
      id: "black",
      nameAr: "أسود مطفي كلاسيكي (Matte Black)",
      hex: "#1A1A1A",
      border: "#333333"
    },
    {
      id: "rose-gold",
      nameAr: "برونزي / روز غولد (Rose Gold)",
      hex: "#B76E79",
      border: "#9A555F"
    },
    {
      id: "silver",
      nameAr: "فضي كروم نقي (Pure Silver)",
      hex: "#C0C0C0",
      border: "#A6A6A6"
    }
  ],
  features: [
    {
      titleAr: "محرك كوارتز صامت 100%",
      descAr: "حركة عقارب انسيابية ناعمة بدون أي صوت تكتكة مزعج، لضمان هدوء تام في منزلك أو أثناء نومك.",
      icon: "volume-x"
    },
    {
      titleAr: "خامات أصلية مقاومة للصدأ",
      descAr: "هيكل متين مطلي بتقنية كهروستاتيكية تمنع بهتان الألوان وتضمن مقاومة تامة للرطوبة ومرور السنين.",
      icon: "shield-check"
    },
    {
      titleAr: "توصيل سريع ومجاني بالعراق",
      descAr: "شحن مجاني مباشر لباب بيتك في جميع المحافظات الـ 18، يصلك خلال 24 - 48 ساعة فقط.",
      icon: "truck"
    },
    {
      titleAr: "افحص وعاين قبل أن تدفع",
      descAr: "الدفع نقداً عند الاستلام. نتيح لك فتح الصندوق ومعاينة الساعة والتأكد من سلامتها وجودتها أمام المندوب قبل دفع أي دينار.",
      icon: "package-check"
    }
  ],
  discounts: [
    {
      minQuantity: 1,
      discountPerUnitIQD: 0,
      badgeAr: "السعر الأصلي"
    },
    {
      minQuantity: 2,
      discountPerUnitIQD: 5000,
      badgeAr: "وفر 10,000 د.ع عند طلب ساعتين"
    },
    {
      minQuantity: 3,
      discountPerUnitIQD: 7000,
      badgeAr: "وفر 21,000 د.ع عند طلب 3 ساعات"
    }
  ],
  faq: [
    {
      qAr: "هل الساعة تصدر أي صوت دقات أثناء الليل؟",
      aAr: "كلا إطلاقاً! الساعة مزودة بماكينة كوارتز أصلية انسيابية (Silent Continuous Sweep) تعمل بهدوء تام دون أي صوت."
    },
    {
      qAr: "هل يمكنني معاينة المنتج وفحصه قبل الدفع؟",
      aAr: "نعم بالتأكيد! سياستنا هي الشفافية التامة؛ افتح الطرد وافحص جودة الساعة وتأكد من الموديل واللون أمام المندوب قبل استلامها وتسليم المبلغ."
    },
    {
      qAr: "كم يستغرق التوصيل وما هي كلفته؟",
      aAr: "التوصيل مجاني 100% لكافة محافظات العراق دون أي مصاريف إضافية. التوصيل يستغرق 24 ساعة لبغداد و 48 ساعة لبقية المحافظات."
    },
    {
      qAr: "ماذا لو استلمت الساعة ووجدتها متضررة أو غير مطابقة؟",
      aAr: "نضمن لك استبدالاً فورياً مجانياً أو رفض الاستلام من المندوب دون دفع أي غرامة أو تكلفة شحن. كما نوفر ضمان تشغيلي لمدة سنة كاملة."
    },
    {
      qAr: "كيف يتم تركيب الساعة على الجدار؟",
      aAr: "تأتي الساعة مع مسمار تعليق فولاذي غير مرئي مخصص لجميع أنواع الجدران ولا يترك أثراً، والتركيب سهل جداً لا يستغرق أكثر من دقيقة."
    }
  ]
};

/**
 * Server recomputes total price from config to prevent client-side tampering.
 */
export function calculateOrderPrice(_productId: string, quantity: number): {
  unitPriceIQD: number;
  totalPriceIQD: number;
} {
  const basePrice = PRODUCT.basePriceIQD;
  const qty = Math.max(1, Math.min(20, Math.floor(quantity)));

  // Check volume discount
  let discountPerUnit = 0;
  for (const discount of PRODUCT.discounts) {
    if (qty >= discount.minQuantity && discount.discountPerUnitIQD > discountPerUnit) {
      discountPerUnit = discount.discountPerUnitIQD;
    }
  }

  const unitPriceIQD = Math.max(1000, basePrice - discountPerUnit);
  const totalPriceIQD = unitPriceIQD * qty;

  return {
    unitPriceIQD,
    totalPriceIQD
  };
}
