const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow, run } = require('../database/schema');

function formatSYP(amount) {
  if (!amount) return '';
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)} مليون ل.س`;
  return `${Number(amount).toLocaleString('ar-SY')} ل.س`;
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    await getDb();
    const { category, store, featured, solar, negotiable, min_price, max_price, brand, material, color, country, search, sort = 'featured', page = 1, limit = 20 } = req.query;
    let where = ['p.in_stock = 1'], params = [];

    if (category) { where.push('(p.category_id = ? OR p.category_id IN (SELECT id FROM categories WHERE parent_id = ?))'); params.push(parseInt(category), parseInt(category)); }
    if (store) { where.push('p.store_id = ?'); params.push(parseInt(store)); }
    if (featured === '1') where.push('p.is_featured = 1');
    if (solar === '1') where.push('p.solar_compatible = 1');
    if (negotiable === '1') where.push('p.is_negotiable = 1');
    if (min_price) { where.push('p.price >= ?'); params.push(parseFloat(min_price)); }
    if (max_price) { where.push('p.price <= ?'); params.push(parseFloat(max_price)); }
    if (brand) { where.push('p.brand LIKE ?'); params.push(`%${brand}%`); }
    if (material) { where.push('p.material LIKE ?'); params.push(`%${material}%`); }
    if (color) { where.push('p.color LIKE ?'); params.push(`%${color}%`); }
    if (country) { where.push('p.origin_country LIKE ?'); params.push(`%${country}%`); }
    if (search) { where.push('(p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR p.brand LIKE ?)'); const s = `%${search}%`; params.push(s, s, s, s); }

    const sortMap = { featured:'p.is_featured DESC, p.created_at DESC', price_asc:'p.price ASC', price_desc:'p.price DESC', newest:'p.created_at DESC', popular:'p.view_count DESC', wishlist:'p.wishlist_count DESC' };
    const orderBy = sortMap[sort] || sortMap.featured;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const wc = where.join(' AND ');
    const total = (getRow(`SELECT COUNT(*) as c FROM products p WHERE ${wc}`, params) || {}).c || 0;

    const products = allRows(`
      SELECT p.*, s.name as store_name, s.slug as store_slug, s.is_verified as store_verified,
        s.neighborhood as store_neighborhood, s.whatsapp as store_whatsapp,
        s.delivery_available, s.installment_available,
        c.name as category_name, c.icon as category_icon,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM products p LEFT JOIN stores s ON s.id = p.store_id LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${wc} ORDER BY ${orderBy} LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), offset]);

    products.forEach(p => {
      p.price_formatted = formatSYP(p.price);
      if (p.old_price) p.old_price_formatted = formatSYP(p.old_price);
      if (p.price_usd) p.price_usd_formatted = `$${p.price_usd}`;
      p.discount_percent = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    });

    res.json({ products, pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)), hasMore: offset + products.length < total } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/products/wishlist/:device_id
router.get('/wishlist/:device_id', async (req, res) => {
  try {
    await getDb();
    const products = allRows(`
      SELECT p.*, s.name as store_name, s.slug as store_slug,
        (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url
      FROM wishlists w JOIN products p ON p.id = w.product_id LEFT JOIN stores s ON s.id = p.store_id
      WHERE w.device_id = ? ORDER BY w.created_at DESC
    `, [req.params.device_id]);
    products.forEach(p => { p.price_formatted = formatSYP(p.price); });
    res.json({ products });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    await getDb();
    const product = getRow(`
      SELECT p.*, s.name as store_name, s.slug as store_slug, s.phone as store_phone,
        s.whatsapp as store_whatsapp, s.address as store_address, s.neighborhood as store_neighborhood,
        s.is_verified as store_verified, s.delivery_available, s.installment_available, s.working_hours,
        c.name as category_name, c.icon as category_icon
      FROM products p LEFT JOIN stores s ON s.id = p.store_id LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?
    `, [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    run('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]);
    const images = allRows('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order', [product.id]);
    const reviews = allRows('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 10', [product.id]);
    const related = allRows(`SELECT p.*, s.name as store_name, s.slug as store_slug, (SELECT url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image_url FROM products p LEFT JOIN stores s ON s.id = p.store_id WHERE p.category_id = ? AND p.id != ? AND p.in_stock = 1 ORDER BY RANDOM() LIMIT 6`, [product.category_id, product.id]);

    product.price_formatted = formatSYP(product.price);
    if (product.old_price) product.old_price_formatted = formatSYP(product.old_price);
    product.discount_percent = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
    related.forEach(p => { p.price_formatted = formatSYP(p.price); });

    res.json({ product, images, reviews, related });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/products/:id/wishlist
router.post('/:id/wishlist', async (req, res) => {
  try {
    await getDb();
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'معرّف الجهاز مطلوب' });

    const existing = getRow('SELECT id FROM wishlists WHERE device_id = ? AND product_id = ?', [device_id, req.params.id]);
    if (existing) {
      run('DELETE FROM wishlists WHERE id = ?', [existing.id]);
      run('UPDATE products SET wishlist_count = MAX(0, wishlist_count - 1) WHERE id = ?', [req.params.id]);
      res.json({ wishlisted: false, message: 'تم الإزالة من قائمة الأمنيات' });
    } else {
      run('INSERT INTO wishlists (device_id, product_id) VALUES (?, ?)', [device_id, req.params.id]);
      run('UPDATE products SET wishlist_count = wishlist_count + 1 WHERE id = ?', [req.params.id]);
      res.json({ wishlisted: true, message: 'تم الإضافة إلى قائمة الأمنيات' });
    }
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/products/:id/share
router.post('/:id/share', async (req, res) => {
  try {
    await getDb();
    const { device_id, platform = 'whatsapp' } = req.body;
    run('INSERT INTO shares (product_id, platform, device_id) VALUES (?, ?, ?)', [req.params.id, platform, device_id]);
    run('UPDATE products SET share_count = share_count + 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
