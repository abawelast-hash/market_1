const express = require('express');
const router = express.Router();
const { getDb } = require('../database/schema');

// GET /api/stores - قائمة المتاجر
router.get('/', (req, res) => {
  const db = getDb();
  const { neighborhood, featured, page = 1, limit = 20, sort = 'rating' } = req.query;
  
  let where = ['1=1'];
  let params = [];

  if (neighborhood) {
    where.push('neighborhood = ?');
    params.push(neighborhood);
  }
  if (featured === '1') {
    where.push('is_featured = 1');
  }

  const sortMap = {
    rating: 'rating DESC',
    name: 'name ASC',
    newest: 'created_at DESC',
    reviews: 'rating_count DESC'
  };
  const orderBy = sortMap[sort] || 'rating DESC';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM stores WHERE ${where.join(' AND ')}`).get(...params).c;
  
  const stores = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
    FROM stores s
    WHERE ${where.join(' AND ')}
    ORDER BY is_featured DESC, ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({
    stores,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// GET /api/stores/neighborhoods - قائمة الأحياء
router.get('/neighborhoods', (req, res) => {
  const db = getDb();
  const neighborhoods = db.prepare(`
    SELECT neighborhood, COUNT(*) as store_count
    FROM stores
    GROUP BY neighborhood
    ORDER BY store_count DESC
  `).all();
  res.json(neighborhoods);
});

// GET /api/stores/:slug - تفاصيل المتجر
router.get('/:slug', (req, res) => {
  const db = getDb();
  const store = db.prepare(`
    SELECT s.*, 
      (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
    FROM stores s WHERE s.slug = ?
  `).get(req.params.slug);

  if (!store) {
    return res.status(404).json({ error: 'المتجر غير موجود' });
  }

  // Get store reviews
  const reviews = db.prepare(`
    SELECT * FROM reviews WHERE store_id = ? ORDER BY created_at DESC LIMIT 10
  `).all(store.id);

  // Get store products (first page)
  const products = db.prepare(`
    SELECT p.*, 
      (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
    FROM products p WHERE p.store_id = ? AND p.in_stock = 1
    ORDER BY p.is_featured DESC, p.created_at DESC
    LIMIT 20
  `).all(store.id);

  // Get product categories for this store
  const categories = db.prepare(`
    SELECT DISTINCT c.id, c.name, c.icon, COUNT(p.id) as count
    FROM categories c
    JOIN products p ON p.category_id = c.id
    WHERE p.store_id = ?
    GROUP BY c.id
    ORDER BY count DESC
  `).all(store.id);

  res.json({ store, reviews, products, categories });
});

module.exports = router;
