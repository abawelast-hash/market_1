/**
 * IndexedDB Wrapper - دليل الرقة
 * Offline-first data storage for Syrian internet conditions
 */
const DalilDB = {
  DB_NAME: 'dalil-raqqa-db',
  DB_VERSION: 1,
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Cache stores for offline access
        if (!db.objectStoreNames.contains('stores')) {
          const storeOS = db.createObjectStore('stores', { keyPath: 'id' });
          storeOS.createIndex('slug', 'slug', { unique: true });
          storeOS.createIndex('featured', 'is_featured');
        }

        // Cache products
        if (!db.objectStoreNames.contains('products')) {
          const prodOS = db.createObjectStore('products', { keyPath: 'id' });
          prodOS.createIndex('store_id', 'store_id');
          prodOS.createIndex('category_id', 'category_id');
          prodOS.createIndex('featured', 'is_featured');
        }

        // Cache categories
        if (!db.objectStoreNames.contains('categories')) {
          db.createObjectStore('categories', { keyPath: 'id' });
        }

        // Local wishlist
        if (!db.objectStoreNames.contains('wishlist')) {
          const wishOS = db.createObjectStore('wishlist', { keyPath: 'product_id' });
          wishOS.createIndex('added_at', 'added_at');
        }

        // Pending actions (for offline sync)
        if (!db.objectStoreNames.contains('pending_actions')) {
          db.createObjectStore('pending_actions', { keyPath: 'id', autoIncrement: true });
        }

        // General cache
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('خطأ في فتح قاعدة البيانات:', e.target.error);
        reject(e.target.error);
      };
    });
  },

  async put(storeName, data) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      if (Array.isArray(data)) {
        data.forEach(item => store.put(item));
      } else {
        store.put(data);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async get(storeName, key) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async getAll(storeName) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async delete(storeName, key) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async count(storeName) {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  },

  async setCache(key, data, ttl = 3600000) {
    await this.put('cache', {
      key,
      data,
      expires: Date.now() + ttl
    });
  },

  async getCache(key) {
    const cached = await this.get('cache', key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    return null;
  }
};
