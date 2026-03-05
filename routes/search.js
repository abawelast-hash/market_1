const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow } = require('../database/schema');

// GET /api/search?q=...
router.get('/', async (req, res) => {
  try {
    await getDb();
    const { q, page = 1, limit = 20 } = req.query;
    if (!q || q.length < 2) return res.json({ products: [], stores: [], suggestions: [] });

    const st = `%${q}%`;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const products = allRows(`
      SELECT p.*, s.name as store_name, s.slug as store_slug, s.is_verified as store_verified,
        c.name as category_name, c.icon as category_icon,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p LEFT JOIN stores s ON s.id = p.store_id LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.in_stock = 1 AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR p.brand LIKE ? OR p.material LIKE ?)
      ORDER BY p.is_featured DESC, p.view_count DESC LIMIT ? OFFSET ?
    `, [st, st, st, st, st, parseInt(limit), offset]);

    const stores = allRows(`
      SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
      FROM stores s WHERE s.name LIKE ? OR s.description LIKE ? OR s.neighborhood LIKE ?
      ORDER BY s.is_featured DESC, s.rating DESC LIMIT 5
    `, [st, st, st]);

    products.forEach(p => {
      p.price_formatted = p.price >= 1000000 ? `${(p.price / 1000000).toFixed(1)} مليون ل.س` : `${Number(p.price).toLocaleString('ar-SY')} ل.س`;
      p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    });

    const tagRows = allRows('SELECT DISTINCT tags FROM products WHERE tags LIKE ? AND in_stock = 1 LIMIT 5', [st]);
    const tagSet = new Set();
    tagRows.forEach(s => { if (s.tags) s.tags.split(',').forEach(t => { if (t.trim().includes(q)) tagSet.add(t.trim()); }); });

    res.json({ products, stores, suggestions: [...tagSet].slice(0, 8), total: products.length });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/search/visual?q=... - Visual Search mock (Task 5)
// In production, this would accept an image blob and use a vector search service
router.get('/visual', async (req, res) => {
  try {
    await getDb();
    const { q } = req.query;
    if (!q) return res.json({ products: [], message: 'أرسل صورة أو وصف للبحث' });

    // Mock: search by description keywords extracted from "visual" query
    const st = `%${q}%`;
    const products = allRows(`
      SELECT p.*, s.name as store_name, s.slug as store_slug, s.is_verified as store_verified,
        c.name as category_name, c.icon as category_icon
      FROM products p LEFT JOIN stores s ON s.id = p.store_id LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.in_stock = 1 AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR p.color LIKE ? OR p.material LIKE ?)
      ORDER BY p.view_count DESC LIMIT 10
    `, [st, st, st, st, st]);

    products.forEach(p => {
      p.price_formatted = p.price >= 1000000 ? `${(p.price / 1000000).toFixed(1)} مليون ل.س` : `${Number(p.price).toLocaleString('ar-SY')} ل.س`;
      p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
      p.visual_match = Math.floor(Math.random() * 30) + 70; // Mock similarity score 70-99%
    });

    res.json({ products, method: 'visual', message: `تم العثور على ${products.length} نتيجة مشابهة` });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
