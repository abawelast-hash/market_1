/**
 * App - دليل الرقة
 * Main application entry point
 */
const App = {
  deviceId: null,
  deferredPrompt: null,

  async init() {
    console.log('🏪 تهيئة دليل المستودعات...');

    // Initialize IndexedDB
    await DalilDB.init();

    // Initialize UI
    UI.init();

    // Initialize Wishlist
    await Wishlist.init();

    // Initialize Loyalty
    await Loyalty.init();

    // Initialize Packs (Radar + LQ + P2P)
    await Packs.init();

    // Setup device ID
    this.setupDeviceId();

    // Setup router
    this.setupRoutes();
    Router.init();

    // Setup menu
    this.setupMenu();

    // Setup search
    this.setupSearch();

    // Setup dark mode
    this.setupDarkMode();

    // Setup visual search
    this.setupVisualSearch();

    // Setup PWA install
    this.setupPWAInstall();

    // Setup offline detection
    this.setupOfflineDetection();

    // Register service worker
    this.registerServiceWorker();

    // Setup sync listener
    this.setupSyncListener();

    console.log('✅ التطبيق جاهز');
  },

  setupDeviceId() {
    this.deviceId = localStorage.getItem('dalil_device_id');
    if (!this.deviceId) {
      this.deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('dalil_device_id', this.deviceId);
    }
  },

  getDeviceId() {
    return this.deviceId;
  },

  setupRoutes() {
    Router.on('/', () => Pages.home());
    Router.on('/categories', () => Pages.categories());
    Router.on('/category/:id', (params) => Pages.categoryProducts(params));
    Router.on('/stores', () => Pages.stores());
    Router.on('/store/:slug', (params) => Pages.storeDetail(params));
    Router.on('/product/:id', (params) => Pages.productDetail(params));
    Router.on('/products', (params) => Pages.productsList(params));
    Router.on('/offers', () => Pages.offers());
    Router.on('/wishlist', () => Pages.wishlist());
    Router.on('/search', (params) => Pages.searchResults(params));
    Router.on('/loyalty', () => Pages.loyalty());
    Router.on('/packs', () => Pages.packs());
    Router.on('/pack/:id', (params) => Pages.packDetail(params));
    Router.on('/p2p', () => Pages.p2pSync());
    Router.on('/about', () => Pages.about());
  },

  setupMenu() {
    const menuBtn = document.getElementById('menuBtn');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');

    const openMenu = () => {
      sideMenu.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    };

    const closeMenu = () => {
      sideMenu.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    };

    menuBtn.addEventListener('click', openMenu);
    overlay.addEventListener('click', closeMenu);

    // Close menu on link click
    document.querySelectorAll('.menu-list a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on hash change
    window.addEventListener('hashchange', closeMenu);
  },

  setupSearch() {
    const searchToggle = document.getElementById('searchToggle');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    const searchClose = document.getElementById('searchClose');
    const suggestions = document.getElementById('searchSuggestions');

    let searchTimeout;

    searchToggle.addEventListener('click', () => {
      searchBar.classList.toggle('active');
      if (searchBar.classList.contains('active')) {
        searchInput.focus();
      }
    });

    searchClose.addEventListener('click', () => {
      searchBar.classList.remove('active');
      searchInput.value = '';
      suggestions.innerHTML = '';
    });

    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const q = searchInput.value.trim();

      if (q.length < 2) {
        suggestions.innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(async () => {
        try {
          const data = await API.search(q);
          if (data.suggestions && data.suggestions.length > 0) {
            suggestions.innerHTML = data.suggestions.map(s =>
              `<span class="suggestion-item" onclick="document.getElementById('searchInput').value='${s}'; Router.navigate('/search?q=${encodeURIComponent(s)}'); document.getElementById('searchBar').classList.remove('active')">${s}</span>`
            ).join('');
          } else {
            suggestions.innerHTML = '';
          }
        } catch (e) { /* ignore */ }
      }, 300);
    });

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q.length >= 2) {
          Router.navigate(`/search?q=${encodeURIComponent(q)}`);
          searchBar.classList.remove('active');
        }
      }
    });

    // Wishlist button in header
    document.getElementById('wishlistBtn').addEventListener('click', () => {
      Router.navigate('/wishlist');
    });
  },

  setupDarkMode() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    // Restore saved preference
    const saved = localStorage.getItem('dalil_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      toggle.textContent = '☀️';
    } else if (!saved) {
      // Follow system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggle.textContent = '☀️';
      }
    }

    toggle.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('dalil_theme', 'light');
        toggle.textContent = '🌙';
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('dalil_theme', 'dark');
        toggle.textContent = '☀️';
      }
      if (navigator.vibrate) navigator.vibrate(15);
    });
  },

  setupVisualSearch() {
    const btn = document.getElementById('visualSearchBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      // Create hidden file input for camera/gallery
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', async () => {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        UI.toast('🔍 جاري البحث المرئي...');

        try {
          const data = await API.visualSearch(file);
          if (data.results && data.results.length > 0) {
            Pages.visualSearchResults(data.results);
          } else {
            UI.toast('لم يتم العثور على نتائج مطابقة');
          }
        } catch (e) {
          UI.toast('حدث خطأ في البحث المرئي');
        }
        document.body.removeChild(input);
      });

      input.click();
    });
  },

  setupSyncListener() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'sync-complete') {
          UI.toast('🔄 تمت مزامنة البيانات');
          // Refresh loyalty data
          Loyalty.init();
        }
      });
    }
  },

  setupPWAInstall() {
    const banner = document.getElementById('installBanner');
    const installBtn = document.getElementById('installBtn');
    const closeBtn = document.getElementById('installClose');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install banner after 30 seconds
      setTimeout(() => {
        if (this.deferredPrompt && !localStorage.getItem('dalil_install_dismissed')) {
          banner.style.display = 'block';
        }
      }, 30000);
    });

    installBtn.addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const result = await this.deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          UI.toast('✅ تم تثبيت التطبيق بنجاح!');
        }
        this.deferredPrompt = null;
        banner.style.display = 'none';
      }
    });

    closeBtn.addEventListener('click', () => {
      banner.style.display = 'none';
      localStorage.setItem('dalil_install_dismissed', '1');
    });
  },

  setupOfflineDetection() {
    const offlineBanner = document.getElementById('offlineBanner');

    const updateStatus = () => {
      if (!navigator.onLine) {
        offlineBanner.style.display = 'flex';
      } else {
        offlineBanner.style.display = 'none';
      }
    };

    window.addEventListener('online', () => {
      offlineBanner.style.display = 'none';
      UI.toast('🟢 تم استعادة الاتصال');
      // Flush pending sync queue
      DalilDB.flushSyncQueue().catch(() => {});
    });

    window.addEventListener('offline', () => {
      offlineBanner.style.display = 'flex';
      UI.toast('🔴 انقطع الاتصال - وضع عدم الاتصال');
    });

    updateStatus();
  },

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('📡 Service Worker مسجل:', registration.scope);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') {
              UI.toast('🔄 تم تحديث التطبيق! أعد التحميل للحصول على الإصدار الجديد');
            }
          });
        });
      } catch (error) {
        console.warn('تعذر تسجيل Service Worker:', error);
      }
    }
  }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());
