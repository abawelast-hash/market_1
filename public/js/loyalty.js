/**
 * Loyalty / Gamification Manager - دليل الرقة (Task 4)
 * Market Coins, Daily Check-in, Social Share Rewards
 */
const Loyalty = {
  account: null,

  async init() {
    try {
      const deviceId = App.getDeviceId();
      const cached = await DalilDB.get('loyalty', deviceId);
      if (cached) this.account = cached;
    } catch (e) {
      console.warn('تعذر تحميل بيانات الولاء:', e);
    }
  },

  async getAccount() {
    const deviceId = App.getDeviceId();
    try {
      const data = await API.fetch(`/loyalty/${deviceId}`);
      this.account = data;
      // Cache locally
      await DalilDB.put('loyalty', { device_id: deviceId, ...data });
      return data;
    } catch (e) {
      // Fallback to cached
      const cached = await DalilDB.get('loyalty', deviceId);
      return cached || { coins: 0, total_earned: 0, level: { level: 1, name: 'زائر', icon: '🌱' }, streak: 0, checked_in_today: false, transactions: [] };
    }
  },

  async dailyCheckin() {
    const deviceId = App.getDeviceId();
    try {
      const result = await API.fetch('/loyalty/checkin', {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId })
      });
      if (result.success) {
        UI.toast(result.message);
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      } else {
        UI.toast(result.message || 'تم التسجيل مسبقاً');
      }
      return result;
    } catch (e) {
      // Queue for sync
      await DalilDB.queueAction({
        url: '/api/loyalty/checkin',
        method: 'POST',
        body: { device_id: deviceId },
        description: 'تسجيل يومي'
      });
      UI.toast('📡 سيتم تسجيل الدخول عند استعادة الاتصال');
      return { success: false };
    }
  },

  async rewardShare(productId, platform) {
    const deviceId = App.getDeviceId();
    try {
      const result = await API.fetch('/loyalty/share-reward', {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId, product_id: productId, platform })
      });
      if (result.success && result.coins_earned > 0) {
        UI.toast(result.message);
        if (navigator.vibrate) navigator.vibrate(30);
      }
      return result;
    } catch (e) {
      // Queue for sync
      await DalilDB.queueAction({
        url: '/api/loyalty/share-reward',
        method: 'POST',
        body: { device_id: deviceId, product_id: productId, platform },
        description: 'مكافأة مشاركة'
      });
      return { success: false };
    }
  },

  async rewardQRScan() {
    const deviceId = App.getDeviceId();
    try {
      return await API.fetch('/loyalty/qr-reward', {
        method: 'POST',
        body: JSON.stringify({ device_id: deviceId })
      });
    } catch (e) { return { success: false }; }
  },

  getCoins() {
    return this.account?.coins || 0;
  }
};
