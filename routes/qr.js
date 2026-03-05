const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow, run } = require('../database/schema');

// GET /api/qr/store/:slug
router.get('/store/:slug', async (req, res) => {
  try {
    await getDb();
    const store = getRow('SELECT id, name, slug FROM stores WHERE slug = ?', [req.params.slug]);
    if (!store) return res.status(404).json({ error: 'المتجر غير موجود' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ qr_data: `${baseUrl}/#/store/${store.slug}`, store_name: store.name, store_slug: store.slug });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/qr/product/:id
router.get('/product/:id', async (req, res) => {
  try {
    await getDb();
    const product = getRow('SELECT id, name, slug FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({ qr_data: `${baseUrl}/#/product/${product.id}`, product_name: product.name, product_id: product.id });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/qr/scan
router.post('/scan', async (req, res) => {
  try {
    await getDb();
    const { entity_type, entity_id, device_id } = req.body;
    if (!entity_type || !entity_id) return res.status(400).json({ error: 'بيانات المسح غير مكتملة' });

    run('INSERT INTO qr_scans (entity_type, entity_id, device_id) VALUES (?, ?, ?)', [entity_type, entity_id, device_id]);
    if (entity_type === 'product') run('UPDATE products SET qr_scan_count = qr_scan_count + 1 WHERE id = ?', [entity_id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// === Task 3: Transaction QR & Escrow ===

// POST /api/qr/transaction - Generate a Transaction QR for escrow
router.post('/transaction', async (req, res) => {
  try {
    await getDb();
    const { product_id, buyer_device_id, amount } = req.body;
    if (!product_id || !buyer_device_id || !amount) return res.status(400).json({ error: 'بيانات ناقصة' });

    const product = getRow('SELECT id, name, store_id FROM products WHERE id = ?', [product_id]);
    if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });

    const txCode = 'TX_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6).toUpperCase();
    run(`INSERT INTO escrow_transactions (tx_code, product_id, store_id, buyer_device_id, amount, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`, [txCode, product_id, product.store_id, buyer_device_id, amount]);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const qrData = `${baseUrl}/api/qr/verify/${txCode}`;

    res.json({ success: true, tx_code: txCode, qr_data: qrData, amount, product_name: product.name });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/qr/verify/:txCode - Verify transaction QR
router.get('/verify/:txCode', async (req, res) => {
  try {
    await getDb();
    const tx = getRow(`SELECT et.*, p.name as product_name, s.name as store_name
      FROM escrow_transactions et
      LEFT JOIN products p ON p.id = et.product_id
      LEFT JOIN stores s ON s.id = et.store_id
      WHERE et.tx_code = ?`, [req.params.txCode]);

    if (!tx) return res.status(404).json({ error: 'المعاملة غير موجودة' });
    res.json({ tx_code: tx.tx_code, product_name: tx.product_name, store_name: tx.store_name, amount: tx.amount, status: tx.status, created_at: tx.created_at });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/qr/release/:txCode - Release escrow payment
router.post('/release/:txCode', async (req, res) => {
  try {
    await getDb();
    const { buyer_device_id } = req.body;
    const tx = getRow('SELECT * FROM escrow_transactions WHERE tx_code = ? AND buyer_device_id = ?', [req.params.txCode, buyer_device_id]);

    if (!tx) return res.status(404).json({ error: 'المعاملة غير موجودة أو غير مصرح' });
    if (tx.status === 'released') return res.json({ success: true, message: 'تم الدفع مسبقاً' });
    if (tx.status === 'cancelled') return res.status(400).json({ error: 'المعاملة ملغية' });

    run("UPDATE escrow_transactions SET status = 'released', released_at = CURRENT_TIMESTAMP WHERE tx_code = ?", [req.params.txCode]);

    // Award loyalty coins for completed transaction
    const coinsEarned = Math.floor(tx.amount / 100000); // 1 coin per 100k SYP
    if (coinsEarned > 0) {
      const account = getRow('SELECT * FROM loyalty_accounts WHERE device_id = ?', [buyer_device_id]);
      if (account) {
        run('UPDATE loyalty_accounts SET coins = coins + ?, total_earned = total_earned + ? WHERE device_id = ?', [coinsEarned, coinsEarned, buyer_device_id]);
      } else {
        run('INSERT INTO loyalty_accounts (device_id, coins, total_earned) VALUES (?, ?, ?)', [buyer_device_id, coinsEarned, coinsEarned]);
      }
      run("INSERT INTO loyalty_transactions (device_id, type, coins, description) VALUES (?, 'earn_purchase', ?, ?)", [buyer_device_id, coinsEarned, `شراء: ${tx.tx_code}`]);
    }

    res.json({ success: true, message: 'تم تأكيد الدفع بنجاح', coins_earned: coinsEarned });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
