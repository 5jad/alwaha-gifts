import { describe, it, expect, beforeEach } from 'vitest';
import { SettingsRepository, ProductRepository } from '../src/worker/services/db';
import { PRODUCTS, StorefrontProduct } from '../src/config/products';

// Mock in-memory SQLite / D1 database for unit tests
class MockD1Database {
  private tables: Record<string, any[]> = {
    orders: [],
    store_settings: [],
    products: []
  };

  prepare(query: string) {
    const trimmed = query.trim();
    let boundParams: any[] = [];

    const stmt = {
      bind: (...params: any[]) => {
        boundParams = params;
        return stmt;
      },
      first: async <T = any>(): Promise<T | null> => {
        if (trimmed.includes('FROM store_settings WHERE key = ?')) {
          const key = boundParams[0];
          const row = stmt.getSettingsRow(key);
          return (row as T) || null;
        }
        return null;
      },
      all: async <T = any>(): Promise<{ results: T[] }> => {
        if (trimmed.includes('SELECT key, value FROM store_settings')) {
          return { results: this.tables.store_settings.map(s => ({ key: s.key, value: s.value })) as T[] };
        }
        if (trimmed.includes('FROM products')) {
          const onlyPublished = trimmed.includes('is_published = 1');
          const rows = onlyPublished
            ? this.tables.products.filter(p => p.is_published === 1)
            : [...this.tables.products];
          return { results: rows as T[] };
        }
        return { results: [] };
      },
      run: async () => {
        if (trimmed.includes('INSERT INTO store_settings')) {
          const [key, value, updatedAt] = boundParams;
          const idx = this.tables.store_settings.findIndex(s => s.key === key);
          if (idx >= 0) {
            this.tables.store_settings[idx] = { key, value, updated_at: updatedAt };
          } else {
            this.tables.store_settings.push({ key, value, updated_at: updatedAt });
          }
          return { success: true };
        }
        if (trimmed.includes('INSERT INTO products')) {
          const [id, isPublished, category, productName, tagline, description, priceIQD, compareAt, features, images, models, createdAt, updatedAt] = boundParams;
          const idx = this.tables.products.findIndex(p => p.id === id);
          const record = {
            id,
            is_published: isPublished,
            category,
            product_name: productName,
            tagline,
            description,
            price_iqd: priceIQD,
            compare_at_price_iqd: compareAt,
            features_json: features,
            images_json: images,
            models_json: models,
            created_at: createdAt,
            updated_at: updatedAt
          };
          if (idx >= 0) {
            this.tables.products[idx] = record;
          } else {
            this.tables.products.push(record);
          }
          return { success: true };
        }
        if (trimmed.includes('DELETE FROM products WHERE id = ?')) {
          const id = boundParams[0];
          this.tables.products = this.tables.products.filter(p => p.id !== id);
          return { success: true };
        }
        return { success: true };
      },
      getSettingsRow: (key: string) => {
        return this.tables.store_settings.find(s => s.key === key) || null;
      }
    };

    return stmt;
  }
}

describe('Admin: SettingsRepository', () => {
  let db: any;
  let settingsRepo: SettingsRepository;

  beforeEach(() => {
    db = new MockD1Database();
    settingsRepo = new SettingsRepository(db);
  });

  it('saves and retrieves Telegram chat ID and Sheets webhook settings', async () => {
    await settingsRepo.setSetting('telegram_chat_id', '-100987654321');
    await settingsRepo.setSetting('sheets_webhook_url', 'https://script.google.com/macros/s/xyz/exec');

    const chatId = await settingsRepo.getSetting('telegram_chat_id');
    expect(chatId).toBe('-100987654321');

    const all = await settingsRepo.getAllSettings();
    expect(all['telegram_chat_id']).toBe('-100987654321');
    expect(all['sheets_webhook_url']).toBe('https://script.google.com/macros/s/xyz/exec');
  });

  it('updates existing settings on conflict', async () => {
    await settingsRepo.setSetting('telegram_chat_id', '1111');
    await settingsRepo.setSetting('telegram_chat_id', '2222');

    const updated = await settingsRepo.getSetting('telegram_chat_id');
    expect(updated).toBe('2222');
  });
});

describe('Admin: ProductRepository', () => {
  let db: any;
  let productRepo: ProductRepository;

  beforeEach(() => {
    db = new MockD1Database();
    productRepo = new ProductRepository(db);
  });

  it('adds a new clock product and retrieves it', async () => {
    const newProduct: StorefrontProduct = {
      id: 'modern-crystal-clock',
      isPublished: true,
      storeName: 'متجر الأناقة',
      category: 'ساعة كريستال فاخرة',
      productName: 'ساعة الكريستال الملكية',
      nameAr: 'ساعة الكريستال الملكية',
      tagline: 'كريستال نقي مع إضاءة خافتة',
      description: 'ساعة جدارية مرصعة بالكريستال مع عقارب ذهبية صامتة تماماً',
      priceIQD: 45000,
      basePriceIQD: 45000,
      compareAtPriceIQD: 65000,
      features: ['محرك صامت 100%', 'كريستال نقي'],
      images: [{ id: 1, url: 'https://example.com/crystal.jpg', isActive: true }],
      models: [{ id: 'model-1', name: 'ذهبي كريستال', colors: ['ذهبي'], stock: 5 }]
    };

    await productRepo.saveProduct(newProduct);

    const all = await productRepo.getAllProducts(false);
    expect(all.length).toBe(1);
    expect(all[0].id).toBe('modern-crystal-clock');
    expect(all[0].productName).toBe('ساعة الكريستال الملكية');
    expect(all[0].priceIQD).toBe(45000);
    expect(all[0].features).toContain('محرك صامت 100%');
  });

  it('deletes a product by id', async () => {
    const p = { ...PRODUCTS[0], id: 'temp-clock-to-delete' };
    await productRepo.saveProduct(p);

    let all = await productRepo.getAllProducts(false);
    expect(all.length).toBe(1);

    await productRepo.deleteProduct('temp-clock-to-delete');
    all = await productRepo.getAllProducts(false);
    expect(all.length).toBe(0);
  });
});
