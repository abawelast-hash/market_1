/**
 * Phygital Pack System — دليل الرقة
 * ═══════════════════════════════════
 * ① حقيبة التجهيز  (Project-Based Packs)      — Background Sync + IndexedDB
 * ② رادار الحي      (Neighborhood Geo-Caching) — Geolocation + Silent Cache
 * ③ البصمة البصرية  (LQ-Placeholders)          — Lazy image loading + LQIP
 * ④ النقل المحلي    (P2P Local Sync)           — WebRTC data channel
 */
const Packs = {
  // ═══════════════════════════════════════════════════════
  // ① حقيبة التجهيز — Project-Based Packs
  // ═══════════════════════════════════════════════════════

  async getAvailablePacks() {
    return API.fetch('/packs');
  },

  async downloadPack(packId) {
    try {
      UI.toast('📦 جارٍ تحميل الحقيبة...');
      const data = await API.fetch(`/packs/${packId}`);

      // Store in IndexedDB for offline
      await DalilDB.put('cache', {
        key: `pack:${packId}`,
        data: data,
        expires: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      });

      // Also cache individual products and stores
      if (data.products) await DalilDB.put('products', data.products);
      if (data.stores) await DalilDB.put('stores', data.stores);

      // Track download
      const downloaded = JSON.parse(localStorage.getItem('dalil_packs') || '[]');
      if (!downloaded.includes(packId)) {
        downloaded.push(packId);
        localStorage.setItem('dalil_packs', JSON.stringify(downloaded));
      }
      localStorage.setItem(`dalil_pack_${packId}_at`, new Date().toISOString());

      UI.toast(`✅ تم تحميل ${data.products.length} منتج للتصفح أوفلاين`);
      return data;
    } catch (e) {
      // Try offline cache
      const cached = await DalilDB.getCache(`pack:${packId}`);
      if (cached) {
        UI.toast('📦 تم التحميل من التخزين المحلي');
        return cached;
      }
      UI.toast('❌ تعذر تحميل الحقيبة');
      throw e;
    }
  },

  isPackDownloaded(packId) {
    const downloaded = JSON.parse(localStorage.getItem('dalil_packs') || '[]');
    return downloaded.includes(packId);
  },

  getPackDownloadDate(packId) {
    return localStorage.getItem(`dalil_pack_${packId}_at`);
  },

  async getOfflinePack(packId) {
    return DalilDB.getCache(`pack:${packId}`);
  },

  async deletePack(packId) {
    await DalilDB.delete('cache', `pack:${packId}`);
    const downloaded = JSON.parse(localStorage.getItem('dalil_packs') || '[]');
    localStorage.setItem('dalil_packs', JSON.stringify(downloaded.filter(id => id !== packId)));
    localStorage.removeItem(`dalil_pack_${packId}_at`);
    UI.toast('🗑️ تم حذف الحقيبة');
  },


  // ═══════════════════════════════════════════════════════
  // ② رادار الحي — Neighborhood Geo-Caching
  // ═══════════════════════════════════════════════════════

  radarActive: false,

  async startRadar() {
    if (this.radarActive) return;
    this.radarActive = true;

    // Try getting location
    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000 // 5 min cache
          });
        });

        const { latitude, longitude } = pos.coords;
        localStorage.setItem('dalil_last_lat', latitude);
        localStorage.setItem('dalil_last_lng', longitude);
        await this._cacheNearby(latitude, longitude);
      } catch (e) {
        console.warn('📡 تعذر تحديد الموقع:', e.message);
        // Fallback: cache by neighborhood
        await this._cacheByNeighborhood();
      }
    } else {
      await this._cacheByNeighborhood();
    }

    this.radarActive = false;
  },

  async _cacheNearby(lat, lng, radius = 5) {
    try {
      const data = await API.fetch(`/packs/radar/nearby?lat=${lat}&lng=${lng}&radius=${radius}`);
      
      // Silently cache everything
      await DalilDB.put('cache', {
        key: 'radar:nearby',
        data: data,
        expires: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
      });

      if (data.stores) await DalilDB.put('stores', data.stores);
      if (data.products) await DalilDB.put('products', data.products);

      localStorage.setItem('dalil_radar_at', new Date().toISOString());
      console.log(`📡 رادار الحي: خُزّنت ${data.stores?.length || 0} متجر و ${data.products?.length || 0} منتج`);
    } catch (e) {
      console.warn('📡 تعذر تخزين بيانات الحي');
    }
  },

  async _cacheByNeighborhood() {
    try {
      const data = await API.fetch('/packs/radar/nearby');
      await DalilDB.put('cache', {
        key: 'radar:nearby',
        data: data,
        expires: Date.now() + (2 * 60 * 60 * 1000)
      });
      if (data.stores) await DalilDB.put('stores', data.stores);
      if (data.products) await DalilDB.put('products', data.products);
      console.log('📡 رادار الحي: خُزّنت البيانات بنمط الأحياء');
    } catch (e) {
      console.warn('📡 تعذر تخزين بيانات الأحياء');
    }
  },

  getLastRadarTime() {
    return localStorage.getItem('dalil_radar_at');
  },


  // ═══════════════════════════════════════════════════════
  // ③ البصمة البصرية — LQ-Placeholders (LQIP)
  // ═══════════════════════════════════════════════════════

  /**
   * Generate a tiny SVG placeholder for a product based on its category
   * ~300 bytes vs ~50KB for a real image = 99.4% savings
   */
  lqPlaceholder(product) {
    const colors = {
      'أثاث منزلي': { bg: '#8B7355', fg: '#D2B48C', icon: '🪑' },
      'أجهزة كهربائية': { bg: '#4A6FA5', fg: '#87CEEB', icon: '📺' },
      'أدوات مطبخ': { bg: '#CD5C5C', fg: '#FFB6B9', icon: '🍳' },
      'مفروشات': { bg: '#9370DB', fg: '#E6E6FA', icon: '🛏️' },
      'إضاءة': { bg: '#DAA520', fg: '#FFFACD', icon: '💡' },
      'حمامات': { bg: '#5F9EA0', fg: '#E0FFFF', icon: '🚿' },
      'ديكور': { bg: '#BC8F8F', fg: '#FFE4E1', icon: '🖼️' },
      'سجاد': { bg: '#8B0000', fg: '#FFDAB9', icon: '🟫' },
      'طاقة شمسية': { bg: '#FF8C00', fg: '#FFF8DC', icon: '☀️' },
      'أدوات تنظيف': { bg: '#2E8B57', fg: '#98FB98', icon: '🧹' }
    };

    const catName = product.category_name || '';
    const scheme = colors[catName] || { bg: '#667788', fg: '#dde3ea', icon: '📦' };
    const icon = product.category_icon || scheme.icon;

    // Return a data URI SVG placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${scheme.bg}"/>
        <stop offset="100%" style="stop-color:${scheme.fg}"/>
      </linearGradient></defs>
      <rect fill="url(#g)" width="300" height="300" rx="16"/>
      <text x="150" y="140" text-anchor="middle" font-size="64">${icon}</text>
      <text x="150" y="200" text-anchor="middle" font-family="Tajawal,sans-serif" font-size="14" fill="white" opacity="0.7">${catName || 'منتج'}</text>
    </svg>`;

    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  },

  /**
   * Create a blurry CSS placeholder (even lighter — pure CSS, 0 bytes transferred)
   */
  lqBlurCSS(product) {
    const hues = {
      'أثاث منزلي': 30, 'أجهزة كهربائية': 210, 'أدوات مطبخ': 0,
      'مفروشات': 270, 'إضاءة': 45, 'حمامات': 180,
      'ديكور': 340, 'سجاد': 0, 'طاقة شمسية': 35, 'أدوات تنظيف': 140
    };
    const hue = hues[product.category_name] || 200;
    return `background: linear-gradient(135deg, hsl(${hue},40%,35%), hsl(${hue},30%,65%)); filter: blur(0px);`;
  },

  /**
   * Observe viewport and lazy-load high-quality images on demand 
   */
  _observer: null,

  initLazyLoad() {
    if (this._observer) return;

    this._observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const src = el.dataset.hqSrc;
          if (src) {
            const img = new Image();
            img.onload = () => {
              el.style.backgroundImage = `url(${src})`;
              el.style.filter = 'none';
              el.classList.add('lq-loaded');
            };
            img.src = src;
            this._observer.unobserve(el);
          }
        }
      });
    }, { rootMargin: '100px' });
  },

  observeImage(element) {
    if (!this._observer) this.initLazyLoad();
    this._observer.observe(element);
  },

  /** Activate lazy loading for all .lq-placeholder elements on the page */
  activateLazyImages() {
    if (!this._observer) this.initLazyLoad();
    document.querySelectorAll('.lq-placeholder[data-hq-src]').forEach(el => {
      this._observer.observe(el);
    });
  },


  // ═══════════════════════════════════════════════════════
  // ④ النقل المحلي — P2P Local Sync via WebRTC
  // ═══════════════════════════════════════════════════════

  p2p: {
    pc: null,       // RTCPeerConnection
    dc: null,       // RTCDataChannel
    isHost: false,
    connected: false,
    onReceive: null,
    chunks: [],
    totalExpected: 0,

    /** Generate signaling data for manual exchange (no signaling server needed) */
    async createOffer() {
      this.isHost = true;
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.dc = this.pc.createDataChannel('dalil-sync', { ordered: true });
      this._setupDataChannel(this.dc);

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      // Wait for ICE gathering
      await new Promise(resolve => {
        if (this.pc.iceGatheringState === 'complete') return resolve();
        this.pc.addEventListener('icegatheringstatechange', () => {
          if (this.pc.iceGatheringState === 'complete') resolve();
        });
        // Timeout after 5s
        setTimeout(resolve, 5000);
      });

      return btoa(JSON.stringify(this.pc.localDescription));
    },

    async acceptOffer(offerB64) {
      this.isHost = false;
      this.pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.pc.addEventListener('datachannel', (e) => {
        this.dc = e.channel;
        this._setupDataChannel(this.dc);
      });

      const offer = JSON.parse(atob(offerB64));
      await this.pc.setRemoteDescription(offer);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      await new Promise(resolve => {
        if (this.pc.iceGatheringState === 'complete') return resolve();
        this.pc.addEventListener('icegatheringstatechange', () => {
          if (this.pc.iceGatheringState === 'complete') resolve();
        });
        setTimeout(resolve, 5000);
      });

      return btoa(JSON.stringify(this.pc.localDescription));
    },

    async acceptAnswer(answerB64) {
      const answer = JSON.parse(atob(answerB64));
      await this.pc.setRemoteDescription(answer);
    },

    _setupDataChannel(dc) {
      dc.binaryType = 'arraybuffer';

      dc.onopen = () => {
        this.connected = true;
        UI.toast('🔗 تم الاتصال P2P بنجاح!');
      };

      dc.onclose = () => {
        this.connected = false;
      };

      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);

          if (msg.type === 'meta') {
            // Metadata: how many chunks to expect
            this.totalExpected = msg.total;
            this.chunks = [];
            UI.toast(`📥 استقبال ${msg.total} حزمة بيانات...`);
          } else if (msg.type === 'chunk') {
            this.chunks.push(msg.data);
            // Update progress
            if (this.onReceive) {
              this.onReceive({ progress: this.chunks.length / this.totalExpected });
            }
          } else if (msg.type === 'done') {
            // Reassemble data
            const fullData = JSON.parse(this.chunks.join(''));
            this._importData(fullData);
          }
        } catch (err) {
          console.error('P2P parse error:', err);
        }
      };
    },

    /** Send all local data to peer */
    async sendData() {
      if (!this.dc || this.dc.readyState !== 'open') {
        UI.toast('❌ لا يوجد اتصال P2P');
        return;
      }

      try {
        // Gather all cached data
        const categories = await DalilDB.getAll('categories');
        const stores = await DalilDB.getAll('stores');
        const products = await DalilDB.getAll('products');

        const payload = JSON.stringify({
          type: 'dalil-sync',
          version: Date.now(),
          categories,
          stores,
          products
        });

        // Split into 16KB chunks (WebRTC limit)
        const CHUNK_SIZE = 16000;
        const totalChunks = Math.ceil(payload.length / CHUNK_SIZE);

        // Send metadata
        this.dc.send(JSON.stringify({ type: 'meta', total: totalChunks }));

        // Send chunks with small delay to avoid buffer overflow
        for (let i = 0; i < totalChunks; i++) {
          const chunk = payload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          this.dc.send(JSON.stringify({ type: 'chunk', index: i, data: chunk }));
          // Throttle to prevent buffer overflow
          if (this.dc.bufferedAmount > 64000) {
            await new Promise(r => setTimeout(r, 50));
          }
        }

        this.dc.send(JSON.stringify({ type: 'done' }));
        UI.toast(`📤 تم إرسال ${products.length} منتج و ${stores.length} متجر`);
      } catch (e) {
        UI.toast('❌ فشل إرسال البيانات');
        console.error(e);
      }
    },

    /** Import received data into local IndexedDB */
    async _importData(data) {
      if (data.type !== 'dalil-sync') return;

      let imported = 0;
      if (data.categories?.length) {
        await DalilDB.put('categories', data.categories);
        imported += data.categories.length;
      }
      if (data.stores?.length) {
        await DalilDB.put('stores', data.stores);
        imported += data.stores.length;
      }
      if (data.products?.length) {
        await DalilDB.put('products', data.products);
        imported += data.products.length;
      }

      localStorage.setItem('dalil_p2p_last', new Date().toISOString());
      UI.toast(`✅ تم استيراد ${imported} عنصر عبر P2P!`);

      // Refresh current page
      if (typeof Router !== 'undefined') {
        Router.handleRoute();
      }
    },

    disconnect() {
      if (this.dc) this.dc.close();
      if (this.pc) this.pc.close();
      this.pc = null;
      this.dc = null;
      this.connected = false;
    }
  },


  // ═══════════════════════════════════════════════════════
  // Init — auto-activate radar + lazy loading
  // ═══════════════════════════════════════════════════════

  async init() {
    // Initialize lazy-load observer
    this.initLazyLoad();

    // Start radar silently on online
    if (navigator.onLine) {
      // Delay to not block app init
      setTimeout(() => this.startRadar(), 3000);
    }

    // Re-run radar when coming back online
    window.addEventListener('online', () => {
      setTimeout(() => this.startRadar(), 2000);
    });

    console.log('📦 نظام الحقائب والرادار جاهز');
  }
};
