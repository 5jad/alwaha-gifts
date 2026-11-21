-- D1 SQLite schema for order idempotency, retries, and rate limiting

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  idempotency_key TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  governorate TEXT NOT NULL,
  address TEXT NOT NULL,
  product_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  color_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL,
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  fbclid TEXT,
  fbp TEXT,
  fbc TEXT,
  ip_address TEXT,
  user_agent TEXT,
  telegram_sent INTEGER NOT NULL DEFAULT 0,
  sheet_sent INTEGER NOT NULL DEFAULT 0,
  meta_sent INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at INTEGER,
  meta_response TEXT,
  meta_error TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_orders_retry ON orders(created_at, retry_count) 
  WHERE telegram_sent = 0 OR sheet_sent = 0 OR meta_sent = 0;

-- Rate limiting table (8 requests per minute per IP)
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  window_minute INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_minute)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_minute);
