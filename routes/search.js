const express = require('express');
const router = express.Router();
const { getDb } = require('../database/schema');

// GET /api/search?q=... - البحث الشامل
router.get('/', (req, res) => {
  const db = getDb();
  const { q, page = 1, limit = 20 } = req.query;

  if (!q || q.length < 2) {
    return res.json({ products: [], stores: [], suggestions: [] });
  }

  const searchTerm = `%${q}%`;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Search products
  const products = db.prepare(`
    SELECT p.*, s.name as store_name, s.slug as store_slug, s.is_verified as store_verified,
      c.name as category_name, c.icon as category_icon,
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
    FROM products p
    LEFT JOIN stores s ON s.id = p.store_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.in_stock = 1 AND (
      p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR 
      p.brand LIKE ? OR p.material LIKE ?
    )
    ORDER BY p.is_featured DESC, p.view_count DESC
    LIMIT ? OFFSET ?
  `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), offset);

  // Search stores
  const stores = db.prepare(`
    SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
    FROM stores s
    WHERE s.name LIKE ? OR s.description LIKE ? OR s.neighborhood LIKE ?
    ORDER BY s.is_featured DESC, s.rating DESC
    LIMIT 5
  `).all(searchTerm, searchTerm, searchTerm);

  // Format prices
  products.forEach(p => {
    if (p.price >= 1000000) {
      p.price_formatted = `${(p.price / 1000000).toFixed(1)} مليون ل.س`;
    } else {
      p.price_formatted = `${p.price.toLocaleString('ar-SY')} ل.س`;
    }
  });

  // Search suggestions (popular tags/terms)
  const suggestions = db.prepare(`
    SELECT DISTINCT tags FROM products 
    WHERE tags LIKE ? AND in_stock = 1 
    LIMIT 5
  `).all(searchTerm);

  const tagSet = new Set();
  suggestions.forEach(s => {
    if (s.tags) {
      s.tags.split(',').forEach(t => {
        if (t.trim().includes(q)) tagSet.add(t.trim());
      });
    }
  });

  res.json({
    products,
    stores,
    suggestions: [...tagSet].slice(0, 8),
    total: products.length
  });
});

module.exports = router;
