const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow, run } = require('../database/schema');

// GET /api/stats/overview
router.get('/overview', async (req, res) => {
  try {
    await getDb();
    const stats = {
      total_stores: (getRow('SELECT COUNT(*) as c FROM stores') || {}).c || 0,
      verified_stores: (getRow('SELECT COUNT(*) as c FROM stores WHERE is_verified = 1') || {}).c || 0,
      total_products: (getRow('SELECT COUNT(*) as c FROM products WHERE in_stock = 1') || {}).c || 0,
      total_categories: (getRow('SELECT COUNT(*) as c FROM categories WHERE parent_id IS NULL') || {}).c || 0,
      total_reviews: (getRow('SELECT COUNT(*) as c FROM reviews') || {}).c || 0,
      total_wishlists: (getRow('SELECT COUNT(*) as c FROM wishlists') || {}).c || 0,
      total_qr_scans: (getRow('SELECT COUNT(*) as c FROM qr_scans') || {}).c || 0,
      featured_products: (getRow('SELECT COUNT(*) as c FROM products WHERE is_featured = 1') || {}).c || 0,
      avg_rating: (getRow('SELECT AVG(rating) as avg FROM stores WHERE rating > 0') || {}).avg || 0,
    };
    stats.top_stores = allRows('SELECT name, slug, rating, rating_count, neighborhood FROM stores ORDER BY rating DESC, rating_count DESC LIMIT 5');
    stats.popular_products = allRows('SELECT p.name, p.id, p.view_count, s.name as store_name FROM products p JOIN stores s ON s.id = p.store_id ORDER BY p.view_count DESC LIMIT 5');
    stats.by_category = allRows('SELECT c.name, c.icon, COUNT(p.id) as count FROM categories c LEFT JOIN products p ON p.category_id = c.id WHERE c.parent_id IS NULL GROUP BY c.id ORDER BY count DESC');
    res.json(stats);
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/stats/store/:id
router.get('/store/:id', async (req, res) => {
  try {
    await getDb();
    const sid = req.params.id;
    const stats = {
      total_products: (getRow('SELECT COUNT(*) as c FROM products WHERE store_id = ? AND in_stock = 1', [sid]) || {}).c || 0,
      total_views: (getRow('SELECT SUM(view_count) as s FROM products WHERE store_id = ?', [sid]) || {}).s || 0,
      total_wishlists: (getRow('SELECT SUM(wishlist_count) as s FROM products WHERE store_id = ?', [sid]) || {}).s || 0,
      total_shares: (getRow('SELECT SUM(share_count) as s FROM products WHERE store_id = ?', [sid]) || {}).s || 0,
      total_qr_scans: (getRow(`SELECT COUNT(*) as c FROM qr_scans WHERE (entity_type = 'store' AND entity_id = ?) OR (entity_type = 'product' AND entity_id IN (SELECT id FROM products WHERE store_id = ?))`, [sid, sid]) || {}).c || 0,
    };
    stats.top_products = allRows('SELECT name, id, view_count, wishlist_count, share_count, qr_scan_count FROM products WHERE store_id = ? ORDER BY view_count DESC LIMIT 10', [sid]);
    res.json(stats);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
