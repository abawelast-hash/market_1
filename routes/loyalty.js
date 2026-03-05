const express = require('express');
const router = express.Router();
const { getDb, allRows, getRow, run } = require('../database/schema');

// GET /api/loyalty/:device_id - Get or create loyalty account
router.get('/:device_id', async (req, res) => {
  try {
    await getDb();
    let account = getRow('SELECT * FROM loyalty_accounts WHERE device_id = ?', [req.params.device_id]);
    if (!account) {
      run('INSERT INTO loyalty_accounts (device_id, coins, total_earned, level) VALUES (?, 0, 0, 1)', [req.params.device_id]);
      account = getRow('SELECT * FROM loyalty_accounts WHERE device_id = ?', [req.params.device_id]);
    }

    const transactions = allRows('SELECT * FROM loyalty_transactions WHERE device_id = ? ORDER BY created_at DESC LIMIT 20', [req.params.device_id]);
    const todayCheckin = getRow("SELECT * FROM daily_checkins WHERE device_id = ? AND date = DATE('now')", [req.params.device_id]);

    // Level thresholds
    const levels = [
      { level: 1, name: 'زائر', min: 0, icon: '🌱' },
      { level: 2, name: 'متسوق', min: 50, icon: '🛒' },
      { level: 3, name: 'عميل مميز', min: 200, icon: '⭐' },
      { level: 4, name: 'عميل ذهبي', min: 500, icon: '👑' },
      { level: 5, name: 'سفير الرقة', min: 1000, icon: '🏆' }
    ];
    const currentLevel = levels.filter(l => account.total_earned >= l.min).pop();
    const nextLevel = levels.find(l => l.min > account.total_earned);

    res.json({
      coins: account.coins,
      total_earned: account.total_earned,
      level: currentLevel,
      next_level: nextLevel,
      streak: account.streak || 0,
      checked_in_today: !!todayCheckin,
      transactions
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/loyalty/checkin - Daily check-in
router.post('/checkin', async (req, res) => {
  try {
    await getDb();
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'معرّف الجهاز مطلوب' });

    const todayCheckin = getRow("SELECT * FROM daily_checkins WHERE device_id = ? AND date = DATE('now')", [device_id]);
    if (todayCheckin) return res.json({ success: false, message: 'تم التسجيل اليوم مسبقاً', coins_earned: 0 });

    // Calculate streak
    const yesterdayCheckin = getRow("SELECT * FROM daily_checkins WHERE device_id = ? AND date = DATE('now', '-1 day')", [device_id]);
    let account = getRow('SELECT * FROM loyalty_accounts WHERE device_id = ?', [device_id]);
    if (!account) {
      run('INSERT INTO loyalty_accounts (device_id, coins, total_earned, level, streak) VALUES (?, 0, 0, 1, 0)', [device_id]);
      account = { coins: 0, total_earned: 0, streak: 0 };
    }

    const newStreak = yesterdayCheckin ? (account.streak || 0) + 1 : 1;
    // Bonus: 1 coin base + 1 extra per 7-day streak milestone
    const coinsEarned = 1 + Math.floor(newStreak / 7);

    run("INSERT INTO daily_checkins (device_id, date, coins_earned) VALUES (?, DATE('now'), ?)", [device_id, coinsEarned]);
    run('UPDATE loyalty_accounts SET coins = coins + ?, total_earned = total_earned + ?, streak = ? WHERE device_id = ?', [coinsEarned, coinsEarned, newStreak, device_id]);
    run("INSERT INTO loyalty_transactions (device_id, type, coins, description) VALUES (?, 'daily_checkin', ?, ?)", [device_id, coinsEarned, `تسجيل يومي - سلسلة ${newStreak} يوم`]);

    res.json({ success: true, coins_earned: coinsEarned, streak: newStreak, message: `+${coinsEarned} عملة! سلسلة ${newStreak} يوم 🔥` });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/loyalty/share-reward - Reward for sharing
router.post('/share-reward', async (req, res) => {
  try {
    await getDb();
    const { device_id, product_id, platform } = req.body;
    if (!device_id) return res.status(400).json({ error: 'معرّف الجهاز مطلوب' });

    // Limit: max 5 share rewards per day
    const todayShares = getRow("SELECT COUNT(*) as c FROM loyalty_transactions WHERE device_id = ? AND type = 'share_reward' AND DATE(created_at) = DATE('now')", [device_id]);
    if (todayShares && todayShares.c >= 5) return res.json({ success: false, coins_earned: 0, message: 'وصلت الحد اليومي للمكافآت' });

    const coinsEarned = 2;
    let account = getRow('SELECT * FROM loyalty_accounts WHERE device_id = ?', [device_id]);
    if (!account) {
      run('INSERT INTO loyalty_accounts (device_id, coins, total_earned, level, streak) VALUES (?, 0, 0, 1, 0)', [device_id]);
    }

    run('UPDATE loyalty_accounts SET coins = coins + ?, total_earned = total_earned + ? WHERE device_id = ?', [coinsEarned, coinsEarned, device_id]);
    run("INSERT INTO loyalty_transactions (device_id, type, coins, description) VALUES (?, 'share_reward', ?, ?)", [device_id, coinsEarned, `مشاركة منتج #${product_id || '?'} عبر ${platform || 'whatsapp'}`]);

    res.json({ success: true, coins_earned: coinsEarned, message: `+${coinsEarned} عملة مكافأة المشاركة! 🎉` });
  } catch (e) { console.error(e); res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// POST /api/loyalty/qr-reward - Reward for QR scan
router.post('/qr-reward', async (req, res) => {
  try {
    await getDb();
    const { device_id } = req.body;
    if (!device_id) return res.status(400).json({ error: 'معرّف الجهاز مطلوب' });

    const todayScans = getRow("SELECT COUNT(*) as c FROM loyalty_transactions WHERE device_id = ? AND type = 'qr_scan_reward' AND DATE(created_at) = DATE('now')", [device_id]);
    if (todayScans && todayScans.c >= 10) return res.json({ success: false, coins_earned: 0 });

    const coinsEarned = 1;
    let account = getRow('SELECT * FROM loyalty_accounts WHERE device_id = ?', [device_id]);
    if (!account) {
      run('INSERT INTO loyalty_accounts (device_id, coins, total_earned, level, streak) VALUES (?, 0, 0, 1, 0)', [device_id]);
    }
    run('UPDATE loyalty_accounts SET coins = coins + ?, total_earned = total_earned + ? WHERE device_id = ?', [coinsEarned, coinsEarned, device_id]);
    run("INSERT INTO loyalty_transactions (device_id, type, coins, description) VALUES (?, 'qr_scan_reward', ?, 'مسح QR')", [device_id, coinsEarned]);

    res.json({ success: true, coins_earned: coinsEarned });
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// GET /api/loyalty/leaderboard - Top users
router.get('/leaderboard/top', async (req, res) => {
  try {
    await getDb();
    const leaders = allRows('SELECT device_id, total_earned, level, streak FROM loyalty_accounts ORDER BY total_earned DESC LIMIT 10');
    res.json(leaders);
  } catch (e) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
