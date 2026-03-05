const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow, run } = require('../database/schema');

function formatSYP(amount) {
  if (!amount) return '';
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} مليون ل.س`;
  return `${Number(amount).toLocaleString('ar-SY')} ل.س`;
}

// ═══════════════════════════════════════════════════════
// ① حقيبة التجهيز — Project-Based Packs
// ═══════════════════════════════════════════════════════

// Pack definitions with category mappings
const PACKS = [
  {
    id: 'new-home',
    name: 'تجهيز منزل جديد',
    name_en: 'New Home Setup',
    icon: '🏠',
    description: 'كل ما تحتاجه لتأسيس منزل جديد بالكامل',
    keywords: ['أثاث', 'مطبخ', 'حمام', 'إضاءة', 'مفروشات', 'ديكور', 'ستائر'],
    categories: [] // will be filled dynamically
  },
  {
    id: 'bride',
    name: 'تجهيز العروس',
    name_en: 'Bridal Package',
    icon: '👰💍',
    description: 'جهاز العروس الكامل — أثاث غرف نوم، مطبخ، وأدوات منزلية',
    keywords: ['عرسان', 'عروسة', 'غرفة نوم', 'مفروشات', 'صالون', 'أدوات مطبخ'],
    categories: []
  },
  {
    id: 'kitchen',
    name: 'تجهيز المطبخ',
    name_en: 'Kitchen Setup',
    icon: '🍳',
    description: 'أجهزة كهربائية وأدوات مطبخ متكاملة',
    keywords: ['مطبخ', 'طناجر', 'برّاد', 'غسالة', 'أدوات مطبخ', 'كهربائي'],
    categories: []
  },
  {
    id: 'solar',
    name: 'نظام طاقة شمسية',
    name_en: 'Solar System',
    icon: '☀️🔋',
    description: 'أنظمة سولار ومنتجات موفرة للطاقة',
    keywords: ['سولار', 'طاقة شمسية', 'بطارية', 'إنفرتر', 'لوح شمسي'],
    categories: []
  },
  {
    id: 'renovation',
    name: 'تجديد وديكور',
    name_en: 'Renovation & Decor',
    icon: '🖼️🎨',
    description: 'لمسات تجديد — سجاد، إضاءة، ديكور، وإكسسوارات',
    keywords: ['ديكور', 'سجاد', 'إضاءة', 'ستائر', 'مرايا', 'إكسسوارات'],
    categories: []
  }
];

// GET /api/packs — list all available packs with product counts
router.get('/', async (req, res) => {
  try {
    await getDb();
    const packsWithCounts = PACKS.map(pack => {
      // Count products matching this pack's keywords
      const likeClauses = pack.keywords.map(() => '(p.name LIKE ? OR p.tags LIKE ? OR p.description LIKE ?)');
      const params = [];
      pack.keywords.forEach(kw => { params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`); });

      const row = getRow(`SELECT COUNT(DISTINCT p.id) as c FROM products p WHERE p.in_stock = 1 AND (${likeClauses.join(' OR ')})`, params);
      const storeRow = getRow(`SELECT COUNT(DISTINCT p.store_id) as c FROM products p WHERE p.in_stock = 1 AND (${likeClauses.join(' OR ')})`, params);

      return {
        id: pack.id,
        name: pack.name,
        name_en: pack.name_en,
        icon: pack.icon,
        description: pack.description,
        product_count: row?.c || 0,
        store_count: storeRow?.c || 0
      };
    });

    res.json({ packs: packsWithCounts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/packs/:packId — download full pack data for offline use
router.get('/:packId', async (req, res) => {
  try {
    await getDb();
    const pack = PACKS.find(p => p.id === req.params.packId);
    if (!pack) return res.status(404).json({ error: 'الحقيبة غير موجودة' });

    // Build search conditions from keywords
    const likeClauses = pack.keywords.map(() => '(p.name LIKE ? OR p.tags LIKE ? OR p.description LIKE ?)');
    const params = [];
    pack.keywords.forEach(kw => { params.push(`%${kw}%`, `%${kw}%`, `%${kw}%`); });

    // Fetch all matching products with store info
    const products = allRows(`
      SELECT DISTINCT p.*, s.name as store_name, s.slug as store_slug, 
        s.is_verified as store_verified, s.neighborhood as store_neighborhood,
        s.whatsapp as store_whatsapp, s.phone as store_phone,
        s.delivery_available, s.installment_available,
        c.name as category_name, c.icon as category_icon,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p 
      LEFT JOIN stores s ON s.id = p.store_id 
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.in_stock = 1 AND (${likeClauses.join(' OR ')})
      ORDER BY p.is_featured DESC, p.view_count DESC
    `, params);

    products.forEach(p => {
      p.price_formatted = formatSYP(p.price);
      if (p.old_price) p.old_price_formatted = formatSYP(p.old_price);
      p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    });

    // Fetch related stores
    const storeIds = [...new Set(products.map(p => p.store_id))];
    let stores = [];
    if (storeIds.length > 0) {
      const placeholders = storeIds.map(() => '?').join(',');
      stores = allRows(`
        SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
        FROM stores s WHERE s.id IN (${placeholders})
        ORDER BY s.is_featured DESC, s.rating DESC
      `, storeIds);
    }

    // Related categories
    const categories = allRows(`
      SELECT DISTINCT c.id, c.name, c.icon, COUNT(p2.id) as count
      FROM categories c 
      JOIN products p2 ON p2.category_id = c.id 
      WHERE p2.id IN (SELECT DISTINCT p.id FROM products p WHERE p.in_stock = 1 AND (${likeClauses.join(' OR ')}))
      GROUP BY c.id ORDER BY count DESC
    `, params);

    // Price range for this pack
    const priceRange = getRow(`
      SELECT MIN(p.price) as min_price, MAX(p.price) as max_price, AVG(p.price) as avg_price
      FROM products p WHERE p.in_stock = 1 AND (${likeClauses.join(' OR ')})  
    `, params);

    res.json({
      pack: { ...pack, categories: undefined, keywords: undefined },
      products,
      stores,
      categories,
      priceRange: {
        min: priceRange?.min_price || 0,
        max: priceRange?.max_price || 0,
        avg: Math.round(priceRange?.avg_price || 0),
        min_formatted: formatSYP(priceRange?.min_price),
        max_formatted: formatSYP(priceRange?.max_price),
        avg_formatted: formatSYP(priceRange?.avg_price)
      },
      downloaded_at: new Date().toISOString(),
      _offline: true // flag: this data is designed for offline use
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});


// ═══════════════════════════════════════════════════════
// ② رادار الحي — Neighborhood Geo-Caching
// ═══════════════════════════════════════════════════════

// GET /api/packs/radar/nearby?lat=&lng=&radius=5
router.get('/radar/nearby', async (req, res) => {
  try {
    await getDb();
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      // Fallback: return all stores grouped by neighborhood
      const neighborhoods = allRows(`
        SELECT neighborhood, COUNT(*) as store_count,
          AVG(latitude) as avg_lat, AVG(longitude) as avg_lng
        FROM stores WHERE neighborhood IS NOT NULL 
        GROUP BY neighborhood ORDER BY store_count DESC
      `);

      const stores = allRows(`
        SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
        FROM stores s ORDER BY s.is_featured DESC, s.rating DESC LIMIT 50
      `);

      const products = allRows(`
        SELECT p.*, s.name as store_name, s.slug as store_slug,
          s.is_verified as store_verified, s.neighborhood as store_neighborhood,
          c.name as category_name, c.icon as category_icon
        FROM products p 
        LEFT JOIN stores s ON s.id = p.store_id 
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.in_stock = 1 ORDER BY p.is_featured DESC LIMIT 100
      `);

      products.forEach(p => {
        p.price_formatted = formatSYP(p.price);
        if (p.old_price) p.old_price_formatted = formatSYP(p.old_price);
        p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
      });

      return res.json({
        mode: 'neighborhood',
        neighborhoods,
        stores,
        products,
        cached_at: new Date().toISOString()
      });
    }

    // Haversine-based proximity (SQLite doesn't have native geo, so calculate in JS)
    const allStores = allRows(`
      SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
      FROM stores s WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL
    `);

    const R = 6371; // Earth's radius in km
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const maxR = parseFloat(radius);

    const nearbyStores = allStores
      .map(s => {
        const dLat = (s.latitude - userLat) * Math.PI / 180;
        const dLng = (s.longitude - userLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 + Math.cos(userLat * Math.PI / 180) * Math.cos(s.latitude * Math.PI / 180) * Math.sin(dLng/2) ** 2;
        s.distance_km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        s.distance_formatted = s.distance_km < 1 ? 
          `${Math.round(s.distance_km * 1000)} متر` : 
          `${s.distance_km.toFixed(1)} كم`;
        return s;
      })
      .filter(s => s.distance_km <= maxR)
      .sort((a, b) => a.distance_km - b.distance_km);

    // Get products from nearby stores
    const nearbyIds = nearbyStores.map(s => s.id);
    let nearbyProducts = [];
    if (nearbyIds.length > 0) {
      const ph = nearbyIds.map(() => '?').join(',');
      nearbyProducts = allRows(`
        SELECT p.*, s.name as store_name, s.slug as store_slug,
          s.is_verified as store_verified, s.neighborhood as store_neighborhood,
          c.name as category_name, c.icon as category_icon
        FROM products p 
        LEFT JOIN stores s ON s.id = p.store_id 
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.store_id IN (${ph}) AND p.in_stock = 1
        ORDER BY p.is_featured DESC, p.view_count DESC
      `, nearbyIds);

      nearbyProducts.forEach(p => {
        p.price_formatted = formatSYP(p.price);
        if (p.old_price) p.old_price_formatted = formatSYP(p.old_price);
        p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
      });
    }

    // If no geo-tagged stores, fallback to neighborhood-based
    if (nearbyStores.length === 0) {
      const allStoresFallback = allRows(`
        SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
        FROM stores s ORDER BY s.is_featured DESC, s.rating DESC LIMIT 20
      `);
      const fallbackProducts = allRows(`
        SELECT p.*, s.name as store_name, s.slug as store_slug,
          s.is_verified as store_verified, s.neighborhood as store_neighborhood,
          c.name as category_name, c.icon as category_icon
        FROM products p LEFT JOIN stores s ON s.id = p.store_id LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.in_stock = 1 ORDER BY p.is_featured DESC LIMIT 50
      `);
      fallbackProducts.forEach(p => {
        p.price_formatted = formatSYP(p.price);
        if (p.old_price) p.old_price_formatted = formatSYP(p.old_price);
        p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
      });

      return res.json({
        mode: 'fallback',
        stores: allStoresFallback,
        products: fallbackProducts,
        message: 'لا توجد متاجر قريبة بإحداثيات — يتم عرض كل المتاجر',
        cached_at: new Date().toISOString()
      });
    }

    res.json({
      mode: 'geo',
      radius: maxR,
      user_location: { lat: userLat, lng: userLng },
      stores: nearbyStores,
      products: nearbyProducts,
      cached_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});


// ═══════════════════════════════════════════════════════
// ④ النقل المحلي — P2P Local Sync (Manifest)
// ═══════════════════════════════════════════════════════

// GET /api/packs/p2p/manifest — get a lightweight manifest of all data
router.get('/p2p/manifest', async (req, res) => {
  try {
    await getDb();
    const { since } = req.query; // ISO date — only return data updated after this

    let whereClause = '1=1';
    const params = [];
    if (since) {
      whereClause = 'p.updated_at > ?';
      params.push(since);
    }

    const stats = getRow(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM stores) as stores,
        (SELECT COUNT(*) FROM products WHERE in_stock = 1) as products
    `);

    const categories = allRows('SELECT * FROM categories ORDER BY sort_order');
    
    const stores = allRows(`
      SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
      FROM stores s ORDER BY s.is_featured DESC, s.rating DESC
    `);

    const products = allRows(`
      SELECT p.*, s.name as store_name, s.slug as store_slug,
        s.is_verified as store_verified, s.neighborhood as store_neighborhood,
        s.whatsapp as store_whatsapp,
        c.name as category_name, c.icon as category_icon
      FROM products p 
      LEFT JOIN stores s ON s.id = p.store_id 
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.in_stock = 1 AND ${whereClause}
      ORDER BY p.id
    `, params);

    products.forEach(p => {
      p.price_formatted = formatSYP(p.price);
      if (p.old_price) p.old_price_formatted = formatSYP(p.old_price);
      p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    });

    res.json({
      version: Date.now(),
      stats,
      categories,
      stores,
      products,
      generated_at: new Date().toISOString()
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
