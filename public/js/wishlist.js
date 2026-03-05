/**
 * Wishlist Manager - دليل الرقة
 */
const Wishlist = {
  items: new Set(),

  async init() {
    try {
      const items = await DalilDB.getAll('wishlist');
      items.forEach(item => this.items.add(item.product_id));
      this.updateBadge();
    } catch (e) {
      console.warn('تعذر تحميل قائمة الأمنيات:', e);
    }
  },

  has(productId) {
    return this.items.has(productId);
  },

  async toggle(productId) {
    const deviceId = App.getDeviceId();

    if (this.items.has(productId)) {
      // Remove
      this.items.delete(productId);
      await DalilDB.delete('wishlist', productId);
      UI.toast('❌ تم الإزالة من قائمة الأمنيات');
    } else {
      // Add
      this.items.add(productId);
      await DalilDB.put('wishlist', { product_id: productId, added_at: Date.now() });
      UI.toast('❤️ تم الإضافة إلى قائمة الأمنيات');
    }

    // Update UI
    this.updateBadge();
    this.updateButtons(productId);

    // Sync with server (non-blocking)
    API.toggleWishlist(productId, deviceId).catch(() => {});
  },

  updateBadge() {
    const badge = document.getElementById('wishlistBadge');
    if (badge) {
      const count = this.items.size;
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  },

  updateButtons(productId) {
    const isActive = this.items.has(productId);
    document.querySelectorAll(`[data-wishlist-btn="${productId}"]`).forEach(btn => {
      btn.classList.toggle('active', isActive);
    });
  },

  getAll() {
    return [...this.items];
  }
};
