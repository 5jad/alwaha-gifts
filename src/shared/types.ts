// Shared Types between Worker Backend and Frontend

export const IRAQ_GOVERNORATES = [
  "بغداد",
  "البصرة",
  "نينوى (الموصل)",
  "أربيل",
  "النجف الأشرف",
  "كربلاء المقدسة",
  "بابل (الحلة)",
  "الأنبار",
  "ذي قار (الناصرية)",
  "كركوك",
  "ديالى",
  "ميسان (العمارة)",
  "واسط (الكوت)",
  "القادسية (الديوانية)",
  "صلاح الدين (تكريت)",
  "دهوك",
  "السليمانية",
  "المثنى (السماوة)"
] as const;

export type Governorate = typeof IRAQ_GOVERNORATES[number];

export interface OrderInput {
  name: string;
  phone: string;
  governorate: string;
  address: string;
  productId: string;
  modelId: string;
  colorId: string;
  quantity: number;
  // Honeypot field for bot detection
  website_url_hp?: string;
  // Cloudflare Turnstile token
  turnstileToken?: string;
  // Tracking parameters
  sourceUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
}

export interface OrderSuccessResponse {
  success: true;
  orderId: string;
  customerName: string;
  totalIQD: number;
  quantity: number;
  modelName: string;
  colorName: string;
  governorate: string;
  phone: string;
  message: string;
  eventId: string; // for Meta Pixel deduplication
  metaValue?: number;
  metaCurrency?: string;
}

export interface OrderErrorResponse {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export type OrderResponse = OrderSuccessResponse | OrderErrorResponse;
