import { D1OrderRecord } from '../types';
import { StorefrontProduct } from '../../config/products';

export class OrderRepository {
  constructor(private db: D1Database) {}

  /**
   * Finds an existing order by its Idempotency-Key.
   */
  async findByIdempotencyKey(key: string): Promise<D1OrderRecord | null> {
    const result = await this.db.prepare(`
      SELECT * FROM orders WHERE idempotency_key = ? LIMIT 1
    `).bind(key).first<D1OrderRecord>();

    return result || null;
  }

  /**
   * Inserts a new order with retry and delivery flags initialized to 0.
   */
  async createOrder(order: {
    id: string;
    idempotencyKey: string;
    customerName: string;
    phone: string;
    governorate: string;
    address: string;
    productId: string;
    modelId: string;
    colorId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    sourceUrl?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    fbclid?: string;
    fbp?: string;
    fbc?: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: number;
  }): Promise<void> {
    await this.db.prepare(`
      INSERT INTO orders (
        id,
        idempotency_key,
        customer_name,
        phone,
        governorate,
        address,
        product_id,
        model_id,
        color_id,
        quantity,
        unit_price,
        total_price,
        source_url,
        utm_source,
        utm_medium,
        utm_campaign,
        fbclid,
        fbp,
        fbc,
        ip_address,
        user_agent,
        telegram_sent,
        sheet_sent,
        meta_sent,
        retry_count,
        created_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, 0, 0, 0, 0, ?
      )
    `).bind(
      order.id,
      order.idempotencyKey,
      order.customerName,
      order.phone,
      order.governorate,
      order.address,
      order.productId,
      order.modelId,
      order.colorId,
      order.quantity,
      order.unitPrice,
      order.totalPrice,
      order.sourceUrl || null,
      order.utmSource || null,
      order.utmMedium || null,
      order.utmCampaign || null,
      order.fbclid || null,
      order.fbp || null,
      order.fbc || null,
      order.ipAddress || null,
      order.userAgent || null,
      order.createdAt
    ).run();
  }

  /**
   * Updates delivery flags (Telegram, Sheets).
   */
  async updateDeliveryStatus(id: string, updates: { telegramSent?: boolean; sheetSent?: boolean }): Promise<void> {
    const sets: string[] = [];
    const params: any[] = [];

    if (updates.telegramSent !== undefined) {
      sets.push('telegram_sent = ?');
      params.push(updates.telegramSent ? 1 : 0);
    }

    if (updates.sheetSent !== undefined) {
      sets.push('sheet_sent = ?');
      params.push(updates.sheetSent ? 1 : 0);
    }

    if (sets.length === 0) return;

    params.push(id);
    await this.db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run();
  }

  /**
   * Updates Meta CAPI status and stores API response/trace.
   */
  async updateMetaStatus(
    id: string,
    success: boolean,
    response?: any,
    error?: string
  ): Promise<void> {
    const metaSent = success ? 1 : 0;
    const responseJson = response ? JSON.stringify(response) : null;
    const errorStr = error || null;

    await this.db.prepare(`
      UPDATE orders
      SET meta_sent = ?, meta_response = ?, meta_error = ?
      WHERE id = ?
    `).bind(metaSent, responseJson, errorStr, id).run();
  }

  /**
   * Queries pending orders that failed to deliver to Telegram, Sheets, or Meta CAPI.
   * Max 6 retry attempts, created within the last 24 hours.
   */
  async getOrdersForRetry(maxAgeSeconds: number = 86400, limit: number = 25): Promise<D1OrderRecord[]> {
    const minCreatedAt = Math.floor(Date.now() / 1000) - maxAgeSeconds;

    const { results } = await this.db.prepare(`
      SELECT * FROM orders
      WHERE (telegram_sent = 0 OR sheet_sent = 0 OR meta_sent = 0)
        AND retry_count < 6
        AND created_at >= ?
      ORDER BY created_at ASC
      LIMIT ?
    `).bind(minCreatedAt, limit).all<D1OrderRecord>();

    return results || [];
  }

  /**
   * Queries all orders ordered by newest first.
   */
  async getAllOrders(limit: number = 100): Promise<D1OrderRecord[]> {
    const { results } = await this.db.prepare(`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all<D1OrderRecord>();

    return results || [];
  }

  /**
   * Finds an order by its ID.
   */
  async getOrderById(id: string): Promise<D1OrderRecord | null> {
    const result = await this.db.prepare(`
      SELECT * FROM orders WHERE id = ? LIMIT 1
    `).bind(id).first<D1OrderRecord>();

    return result || null;
  }

  /**
   * Increments retry counter and records timestamp.
   */
  async incrementRetryCount(id: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.prepare(`
      UPDATE orders
      SET retry_count = retry_count + 1, last_retry_at = ?
      WHERE id = ?
    `).bind(now, id).run();
  }
}

export class SettingsRepository {
  constructor(private db: D1Database) {}

  async getSetting(key: string): Promise<string | null> {
    try {
      const res = await this.db.prepare('SELECT value FROM store_settings WHERE key = ?').bind(key).first<{ value: string }>();
      return res?.value || null;
    } catch {
      return null;
    }
  }

  async getAllSettings(): Promise<Record<string, string>> {
    try {
      const { results } = await this.db.prepare('SELECT key, value FROM store_settings').all<{ key: string; value: string }>();
      const settings: Record<string, string> = {};
      results?.forEach((r) => {
        settings[r.key] = r.value;
      });
      return settings;
    } catch {
      return {};
    }
  }

  async setSetting(key: string, value: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.prepare(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
    `).bind(key, value, now, value, now).run();
  }
}

export class ProductRepository {
  constructor(private db: D1Database) {}

  async getAllProducts(onlyPublished = false): Promise<StorefrontProduct[]> {
    try {
      const query = onlyPublished
        ? 'SELECT * FROM products WHERE is_published = 1 ORDER BY created_at ASC'
        : 'SELECT * FROM products ORDER BY created_at ASC';
      const { results } = await this.db.prepare(query).all<any>();
      if (!results || results.length === 0) return [];

      return results.map((row) => ({
        id: row.id,
        isPublished: Boolean(row.is_published),
        storeName: 'الواحة للهداية',
        category: row.category,
        productName: row.product_name,
        nameAr: row.product_name,
        tagline: row.tagline,
        description: row.description,
        priceIQD: row.price_iqd,
        basePriceIQD: row.price_iqd,
        compareAtPriceIQD: row.compare_at_price_iqd,
        features: JSON.parse(row.features_json || '[]'),
        images: JSON.parse(row.images_json || '[]'),
        models: JSON.parse(row.models_json || '[]'),
      }));
    } catch {
      return [];
    }
  }

  async saveProduct(p: StorefrontProduct): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await this.db.prepare(`
      INSERT INTO products (
        id, is_published, category, product_name, tagline, description,
        price_iqd, compare_at_price_iqd, features_json, images_json, models_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        is_published = ?, category = ?, product_name = ?, tagline = ?, description = ?,
        price_iqd = ?, compare_at_price_iqd = ?, features_json = ?, images_json = ?, models_json = ?,
        updated_at = ?
    `).bind(
      p.id, p.isPublished ? 1 : 0, p.category, p.productName, p.tagline, p.description,
      p.priceIQD, p.compareAtPriceIQD, JSON.stringify(p.features), JSON.stringify(p.images), JSON.stringify(p.models),
      now, now,
      p.isPublished ? 1 : 0, p.category, p.productName, p.tagline, p.description,
      p.priceIQD, p.compareAtPriceIQD, JSON.stringify(p.features), JSON.stringify(p.images), JSON.stringify(p.models),
      now
    ).run();
  }

  async deleteProduct(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
  }
}
