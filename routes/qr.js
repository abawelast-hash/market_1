const express = require('express');
const router = express.Router();
const { getDb } = require('../database/schema');

// GET /api/qr/store/:slug - Generate QR data for store
router.get('/store/:slug', (req, res) => {
  const db = getDb();
  const store = db.prepare('SELECT id, name, slug FROM stores WHERE slug = ?').get(req.params.slug);
  
  if (!store) {
    return res.status(404).json({ error: 'المتجر غير موجود' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const qrData = `${baseUrl}/#/store/${store.slug}`;

  res.json({
    qr_data: qrData,
    store_name: store.name,
    store_slug: store.slug
  });
});

// GET /api/qr/product/:id - Generate QR data for product
router.get('/product/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT id, name, slug FROM products WHERE id = ?').get(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'المنتج غير موجود' });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const qrData = `${baseUrl}/#/product/${product.id}`;

  res.json({
    qr_data: qrData,
    product_name: product.name,
    product_id: product.id
  });
});

// POST /api/qr/scan - Record QR scan
router.post('/scan', (req, res) => {
  const db = getDb();
  const { entity_type, entity_id, device_id } = req.body;

  if (!entity_type || !entity_id) {
    return res.status(400).json({ error: 'بيانات المسح غير مكتملة' });
  }

  db.prepare(`
    INSERT INTO qr_scans (entity_type, entity_id, device_id)
    VALUES (?, ?, ?)
  `).run(entity_type, entity_id, device_id);

  if (entity_type === 'product') {
    db.prepare('UPDATE products SET qr_scan_count = qr_scan_count + 1 WHERE id = ?').run(entity_id);
  }

  res.json({ success: true });
});

module.exports = router;
