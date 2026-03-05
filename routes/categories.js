const express = require('express');
const router = express.Router();
const { getDb } = require('../database/schema');

// GET /api/categories - جميع التصنيفات
router.get('/', (req, res) => {
  const db = getDb();
  
  const categories = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.in_stock = 1) as product_count,
      (SELECT COUNT(*) FROM categories sc WHERE sc.parent_id = c.id) as subcategory_count
    FROM categories c
    WHERE c.parent_id IS NULL
    ORDER BY c.sort_order
  `).all();

  // Get subcategories for each
  for (const cat of categories) {
    cat.subcategories = db.prepare(`
      SELECT sc.*, 
        (SELECT COUNT(*) FROM products p WHERE p.category_id = sc.id AND p.in_stock = 1) as product_count
      FROM categories sc
      WHERE sc.parent_id = ?
      ORDER BY sc.sort_order
    `).all(cat.id);
  }

  res.json(categories);
});

// GET /api/categories/:id - تفاصيل التصنيف مع الفلاتر
router.get('/:id', (req, res) => {
  const db = getDb();
  
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) {
    return res.status(404).json({ error: 'التصنيف غير موجود' });
  }

  // Get filters for this category
  const filters = db.prepare(`
    SELECT * FROM category_filters WHERE category_id = ? ORDER BY sort_order
  `).all(category.id);

  // Parse filter options
  filters.forEach(f => {
    if (f.filter_options) {
      f.filter_options = JSON.parse(f.filter_options);
    }
  });

  // Get subcategories
  const subcategories = db.prepare(`
    SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order
  `).all(category.id);

  // Get price range for this category
  const priceRange = db.prepare(`
    SELECT MIN(price) as min_price, MAX(price) as max_price
    FROM products 
    WHERE category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?)
  `).get(category.id, category.id);

  // Get available brands
  const brands = db.prepare(`
    SELECT DISTINCT brand FROM products 
    WHERE (category_id = ? OR category_id IN (SELECT id FROM categories WHERE parent_id = ?))
    AND brand IS NOT NULL AND brand != ''
    ORDER BY brand
  `).all(category.id, category.id);

  res.json({
    category,
    subcategories,
    filters,
    priceRange,
    brands: brands.map(b => b.brand)
  });
});

module.exports = router;
