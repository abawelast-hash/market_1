const express = require('express');
const router = express.Router();
const { getDb } = require('../database/schema');

// GET /api/stats/overview - إحصائيات عامة
router.get('/overview', (req, res) => {
  const db = getDb();

  const stats = {
    total_stores: db.prepare('SELECT COUNT(*) as c FROM stores').get().c,
    verified_stores: db.prepare('SELECT COUNT(*) as c FROM stores WHERE is_verified = 1').get().c,
    total_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE in_stock = 1').get().c,
    total_categories: db.prepare('SELECT COUNT(*) as c FROM categories WHERE parent_id IS NULL').get().c,
    total_reviews: db.prepare('SELECT COUNT(*) as c FROM reviews').get().c,
    total_wishlists: db.prepare('SELECT COUNT(*) as c FROM wishlists').get().c,
    total_qr_scans: db.prepare('SELECT COUNT(*) as c FROM qr_scans').get().c,
    featured_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE is_featured = 1').get().c,
    avg_rating: db.prepare('SELECT AVG(rating) as avg FROM stores WHERE rating > 0').get().avg || 0,
  };

  // Top stores by rating
  stats.top_stores = db.prepare(`
    SELECT name, slug, rating, rating_count, neighborhood
    FROM stores ORDER BY rating DESC, rating_count DESC LIMIT 5
  `).all();

  // Most viewed products
  stats.popular_products = db.prepare(`
    SELECT p.name, p.id, p.view_count, s.name as store_name
    FROM products p JOIN stores s ON s.id = p.store_id
    ORDER BY p.view_count DESC LIMIT 5
  `).all();

  // Products by category
  stats.by_category = db.prepare(`
    SELECT c.name, c.icon, COUNT(p.id) as count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    WHERE c.parent_id IS NULL
    GROUP BY c.id
    ORDER BY count DESC
  `).all();

  res.json(stats);
});

// GET /api/stats/store/:id - إحصائيات المتجر (للتاجر)
router.get('/store/:id', (req, res) => {
  const db = getDb();
  const storeId = req.params.id;

  const stats = {
    total_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE store_id = ? AND in_stock = 1').get(storeId).c,
    total_views: db.prepare('SELECT SUM(view_count) as s FROM products WHERE store_id = ?').get(storeId).s || 0,
    total_wishlists: db.prepare('SELECT SUM(wishlist_count) as s FROM products WHERE store_id = ?').get(storeId).s || 0,
    total_shares: db.prepare('SELECT SUM(share_count) as s FROM products WHERE store_id = ?').get(storeId).s || 0,
    total_qr_scans: db.prepare(`
      SELECT COUNT(*) as c FROM qr_scans 
      WHERE (entity_type = 'store' AND entity_id = ?) OR 
            (entity_type = 'product' AND entity_id IN (SELECT id FROM products WHERE store_id = ?))
    `).get(storeId, storeId).c,
  };

  // Most popular products
  stats.top_products = db.prepare(`
    SELECT name, id, view_count, wishlist_count, share_count, qr_scan_count
    FROM products WHERE store_id = ?
    ORDER BY view_count DESC LIMIT 10
  `).all(storeId);

  res.json(stats);
});

module.exports = router;
