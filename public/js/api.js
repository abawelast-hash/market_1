/**
 * API Client - دليل الرقة
 * Handles API calls with offline fallback
 */
const API = {
  BASE: '/api',

  async fetch(endpoint, options = {}) {
    const url = `${this.BASE}${endpoint}`;
    const cacheKey = `api:${url}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Cache GET responses in IndexedDB
      if (!options.method || options.method === 'GET') {
        DalilDB.setCache(cacheKey, data, 30 * 60 * 1000); // 30 min cache
      }

      return data;
    } catch (error) {
      console.warn('فشل الاتصال بالخادم:', error.message);

      // Try offline cache
      if (!options.method || options.method === 'GET') {
        const cached = await DalilDB.getCache(cacheKey);
        if (cached) {
          console.log('📦 تحميل من التخزين المحلي');
          return cached;
        }
      }

      throw error;
    }
  },

  // === Stores ===
  async getStores(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.fetch(`/stores?${query}`);
  },

  async getStore(slug) {
    return this.fetch(`/stores/${slug}`);
  },

  async getNeighborhoods() {
    return this.fetch('/stores/neighborhoods');
  },

  // === Products ===
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.fetch(`/products?${query}`);
  },

  async getProduct(id) {
    return this.fetch(`/products/${id}`);
  },

  async toggleWishlist(productId, deviceId) {
    return this.fetch(`/products/${productId}/wishlist`, {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId })
    });
  },

  async shareProduct(productId, deviceId, platform = 'whatsapp') {
    return this.fetch(`/products/${productId}/share`, {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, platform })
    });
  },

  async getWishlistProducts(deviceId) {
    return this.fetch(`/products/wishlist/${deviceId}`);
  },

  // === Categories ===
  async getCategories() {
    return this.fetch('/categories');
  },

  async getCategory(id) {
    return this.fetch(`/categories/${id}`);
  },

  // === Search ===
  async search(query, page = 1) {
    return this.fetch(`/search?q=${encodeURIComponent(query)}&page=${page}`);
  },

  // === QR ===
  async getQR(type, id) {
    return this.fetch(`/qr/${type}/${id}`);
  },

  async recordQRScan(entityType, entityId, deviceId) {
    return this.fetch('/qr/scan', {
      method: 'POST',
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, device_id: deviceId })
    });
  },

  // === Stats ===
  async getStats() {
    return this.fetch('/stats/overview');
  }
};
