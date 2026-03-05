const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow } = require('../database/schema');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    await getDb();
    const categories = allRows(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.in_stock = 1) as product_count,
        (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) as subcategory_count
      FROM categories c WHERE c.parent_id IS NULL ORDER BY c.sort_order
    `);
    for (const cat of categories) {
      cat.subcategories = allRows(`
        SELECT sc.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = sc.id AND p.in_stock = 1) as product_count
        FROM categories sc WHERE sc.parent_id = ? ORDER BY sc.sort_order
      `, [cat.id]);
    }
    res.json(categories);
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  try {
    await getDb();
    const category = getRow('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!category) return res.status(404).json({ error: 'التصنيف غير موجود' });

    const filters = allRows('SELECT * FROM category_filters WHERE category_id = ? ORDER BY sort_order', [category.id]);
    filters.forEach(f => { if (f.filter_options) f.filter_options = JSON.parse(f.filter_options); });

    const subcategories = allRows('SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order', [category.id]);
    const priceRange = getRow('SELECT MIN(price) as min_price, MAX(price) as max_price FROM products WHERE category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?)', [category.id, category.id]);
    const brands = allRows(`SELECT DISTINCT brand FROM products WHERE (category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?)) AND brand IS NOT NULL AND brand != '' ORDER BY brand`, [category.id, category.id]);

    res.json({ category, subcategories, filters, priceRange, brands: brands.map(b => b.brand) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
