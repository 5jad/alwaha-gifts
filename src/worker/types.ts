// Cloudflare Worker Environment Bindings

export interface Env {
  // D1 Database Binding
  DB: D1Database;

  // Cloudflare Static Assets Binding
  ASSETS?: {
    fetch: typeof fetch;
  };

  // Telegram Secrets
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;

  // Google Sheets Webhook Secrets
  SHEETS_WEBHOOK_URL?: string;
  SHEETS_SECRET?: string;

  // Meta Conversions API Secrets and Configuration
  META_PIXEL_ID?: string;
  META_CAPI_ACCESS_TOKEN?: string;
  META_API_VERSION?: string;
  META_CURRENCY?: string;
  USD_RATE?: string;
  META_TEST_EVENT_CODE?: string;

  // Cloudflare Turnstile Secret (Optional)
  TURNSTILE_SECRET?: string;

  // Custom Store Name
  STORE_NAME_AR?: string;

  // Admin Credentials
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

export interface D1OrderRecord {
  id: string;
  idempotency_key: string;
  customer_name: string;
  phone: string;
  governorate: string;
  address: string;
  product_id: string;
  model_id: string;
  color_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  fbclid: string | null;
  fbp: string | null;
  fbc: string | null;
  ip_address: string | null;
  user_agent: string | null;
  telegram_sent: number;
  sheet_sent: number;
  meta_sent: number;
  retry_count: number;
  last_retry_at: number | null;
  meta_response: string | null;
  meta_error: string | null;
  created_at: number;
}
