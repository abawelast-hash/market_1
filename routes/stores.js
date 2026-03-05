const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow, run } = require('../database/schema');

// GET /api/stores
router.get('/', async (req, res) => {
  try {
    await getDb();
    const { neighborhood, featured, page = 1, limit = 20, sort = 'rating' } = req.query;
    let where = ['1=1'], params = [];
    if (neighborhood) { where.push('neighborhood = ?'); params.push(neighborhood); }
    if (featured === '1') where.push('is_featured = 1');

    const sortMap = { rating:'rating DESC', name:'name ASC', newest:'created_at DESC', reviews:'rating_count DESC' };
    const orderBy = sortMap[sort] || 'rating DESC';
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const total = (getRow(`SELECT COUNT(*) as c FROM stores WHERE ${where.join(' AND ')}`, params) || {}).c || 0;

    const stores = allRows(`
      SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count
      FROM stores s WHERE ${where.join(' AND ')}
      ORDER BY is_featured DESC, ${orderBy} LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    res.json({ stores, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/stores/neighborhoods
router.get('/neighborhoods', async (req, res) => {
  try {
    await getDb();
    res.json(allRows('SELECT neighborhood, COUNT(*) as store_count FROM stores GROUP BY neighborhood ORDER BY store_count DESC'));
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/stores/:slug
router.get('/:slug', async (req, res) => {
  try {
    await getDb();
    const store = getRow(`SELECT s.*, (SELECT COUNT(*) FROM products WHERE store_id = s.id AND in_stock = 1) as product_count FROM stores s WHERE s.slug = ?`, [req.params.slug]);
    if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });

    const reviews = allRows('SELECT * FROM reviews WHERE store_id = ? ORDER BY created_at DESC LIMIT 10', [store.id]);
    const products = allRows(`SELECT p.*, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url FROM products p WHERE p.store_id = ? AND p.in_stock = 1 ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 20`, [store.id]);
    const categories = allRows(`SELECT DISTINCT c.id, c.name, c.icon, COUNT(p.id) as count FROM categories c JOIN products p ON p.category_id = c.id WHERE p.store_id = ? GROUP BY c.id ORDER BY count DESC`, [store.id]);

    res.json({ store, reviews, products, categories });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
