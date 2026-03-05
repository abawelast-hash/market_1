/**
 * Pages - دليل الرقة
 * All page renderers
 */
const Pages = {
  // ===================== HOME PAGE =====================
  async home() {
    UI.showLoading();
    try {
      const [categoriesData, productsData, storesData] = await Promise.all([
        API.getCategories(),
        API.getProducts({ featured: '1', limit: 8 }),
        API.getStores({ featured: '1', limit: 5 })
      ]);

      // Cache for offline
      if (categoriesData) DalilDB.put('categories', categoriesData);

      const categories = categoriesData || [];
      const products = productsData?.products || [];
      const stores = storesData?.stores || [];
      const totalProducts = productsData?.pagination?.total || 0;
      const totalStores = storesData?.pagination?.total || 0;

      UI.render(`
        <!-- Hero Banner -->
        <div class="hero-banner">
          <h2 class="hero-title">🏪 دليل المستودعات والأسواق المنزلية</h2>
          <p class="hero-subtitle">كل ما يحتاجه منزلك في مكان واحد - مدينة الرقة</p>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="stat-num">${totalStores}+</span>
              <span class="stat-label">متجر موثق</span>
            </div>
            <div class="hero-stat">
              <span class="stat-num">${totalProducts}+</span>
              <span class="stat-label">منتج</span>
            </div>
            <div class="hero-stat">
              <span class="stat-num">${categories.length}</span>
              <span class="stat-label">تصنيف</span>
            </div>
          </div>
        </div>

        <!-- Categories -->
        <div class="section-header">
          <h3 class="section-title">📂 التصنيفات</h3>
          <a href="#/categories" class="section-link">عرض الكل ←</a>
        </div>
        <div class="categories-scroll">
          ${categories.map(c => UI.categoryChip(c)).join('')}
        </div>

        <!-- Featured Products -->
        <div class="section-header">
          <h3 class="section-title">⭐ منتجات مميزة</h3>
          <a href="#/products?featured=1" class="section-link">عرض الكل ←</a>
        </div>
        <div class="products-grid">
          ${products.map(p => UI.productCard(p)).join('')}
        </div>

        <!-- Featured Stores -->
        <div class="section-header">
          <h3 class="section-title">🏪 متاجر مميزة</h3>
          <a href="#/stores" class="section-link">عرض الكل ←</a>
        </div>
        <div>
          ${stores.map(s => UI.storeCard(s)).join('')}
        </div>

        <!-- Bridal Package CTA -->
        <div style="padding: 16px 12px;">
          <div class="card" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #ffecd2, #fcb69f); border: none;">
            <div style="font-size: 2rem; margin-bottom: 8px;">💍👰</div>
            <h3 style="margin-bottom: 6px; color: #c0392b;">تجهيز العرسان</h3>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">
              اكتشفي باكجات التجهيز الكاملة - أثاث، أجهزة، أدوات منزلية
            </p>
            <a href="#/products?search=عرسان" class="btn btn-secondary btn-sm">اكتشفي العروض</a>
          </div>
        </div>

        <!-- Solar CTA -->
        <div style="padding: 0 12px 16px;">
          <div class="card" style="padding: 20px; text-align: center; background: linear-gradient(135deg, #d4efdf, #a9dfbf); border: none;">
            <div style="font-size: 2rem; margin-bottom: 8px;">☀️🔋</div>
            <h3 style="margin-bottom: 6px; color: #1e8449;">حلول الطاقة الشمسية</h3>
            <p style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">
              ودّع انقطاع الكهرباء - أنظمة سولار متكاملة مع التركيب
            </p>
            <a href="#/category/9" class="btn btn-success btn-sm">تصفح الأنظمة</a>
          </div>
        </div>
      `);
    } catch (e) {
      UI.showError('تعذر تحميل الصفحة الرئيسية. تحقق من الاتصال بالإنترنت.');
    }
  },

  // ===================== CATEGORIES PAGE =====================
  async categories() {
    UI.showLoading();
    try {
      const categories = await API.getCategories();

      UI.render(`
        <div class="page-title-bar">
          <h2 class="page-title">📂 التصنيفات</h2>
        </div>
        <div class="categories-grid">
          ${categories.map(c => `
            <a class="category-card" href="#/category/${c.id}">
              <div class="cat-icon">${c.icon || '📂'}</div>
              <div class="cat-name">${c.name}</div>
              <div class="cat-count">${c.product_count || 0} منتج</div>
              ${c.description ? `<div class="cat-desc">${c.description}</div>` : ''}
            </a>
          `).join('')}
        </div>
      `);
    } catch (e) {
      UI.showError();
    }
  },

  // ===================== CATEGORY PRODUCTS PAGE =====================
  async categoryProducts({ id, query = {} }) {
    UI.showLoading();
    try {
      const [catData, productsData] = await Promise.all([
        API.getCategory(id),
        API.getProducts({ category: id, sort: query.sort || 'featured', page: 1 })
      ]);

      const { category, subcategories, filters, priceRange, brands } = catData;
      const { products, pagination } = productsData;

      let currentPage = 1;
      let loading = false;
      let allProducts = [...products];

      UI.render(`
        <div class="page-title-bar">
          <a href="#/categories" class="back-btn">→</a>
          <h2 class="page-title">${category.icon || ''} ${category.name}</h2>
        </div>

        ${subcategories.length > 0 ? `
          <div class="categories-scroll">
            <a class="category-chip" href="#/category/${category.id}" style="border: 2px solid var(--primary)">
              <span class="cat-icon">📋</span>
              <span class="cat-name">الكل</span>
            </a>
            ${subcategories.map(sc => `
              <a class="category-chip" href="#/category/${sc.id}">
                <span class="cat-icon">${sc.icon || '📂'}</span>
                <span class="cat-name">${sc.name}</span>
              </a>
            `).join('')}
          </div>
        ` : ''}

        <!-- Filters -->
        <div class="filters-bar">
          <select class="sort-select" id="sortSelect" onchange="Pages._sortCategory(${id})">
            <option value="featured" ${query.sort === 'featured' ? 'selected' : ''}>الأكثر تميزاً</option>
            <option value="price_asc" ${query.sort === 'price_asc' ? 'selected' : ''}>السعر: الأقل</option>
            <option value="price_desc" ${query.sort === 'price_desc' ? 'selected' : ''}>السعر: الأعلى</option>
            <option value="newest" ${query.sort === 'newest' ? 'selected' : ''}>الأحدث</option>
            <option value="popular" ${query.sort === 'popular' ? 'selected' : ''}>الأكثر مشاهدة</option>
          </select>
          ${filters.map(f => {
            if (f.filter_type === 'boolean') {
              return `<label class="filter-chip" onclick="this.classList.toggle('active')">
                <input type="checkbox" style="display:none" data-filter="${f.filter_name_en}">
                ${f.filter_name}
              </label>`;
            }
            return '';
          }).join('')}
        </div>

        <div class="products-grid" id="productsGrid">
          ${products.map(p => UI.productCard(p)).join('')}
        </div>

        ${products.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>لا توجد منتجات</h3>
            <p>لم يتم العثور على منتجات في هذا التصنيف حالياً</p>
          </div>
        ` : ''}

        ${pagination.hasMore ? '<div id="scrollSentinel" style="height:20px"></div>' : ''}
        <div id="loadingMore" style="display:none;text-align:center;padding:20px">
          <div class="loader"></div>
        </div>
      `);

      // Setup infinite scroll
      if (pagination.hasMore) {
        UI.setupInfiniteScroll(async () => {
          if (loading) return;
          loading = true;
          currentPage++;
          document.getElementById('loadingMore').style.display = 'block';

          try {
            const more = await API.getProducts({ category: id, sort: query.sort || 'featured', page: currentPage });
            const grid = document.getElementById('productsGrid');
            grid.insertAdjacentHTML('beforeend', more.products.map(p => UI.productCard(p)).join(''));
            if (!more.pagination.hasMore) {
              const sentinel = document.getElementById('scrollSentinel');
              if (sentinel) sentinel.remove();
            }
          } catch (e) {
            currentPage--;
          }
          loading = false;
          document.getElementById('loadingMore').style.display = 'none';
        });
      }
    } catch (e) {
      UI.showError();
    }
  },

  _sortCategory(categoryId) {
    const sort = document.getElementById('sortSelect')?.value || 'featured';
    Router.navigate(`/category/${categoryId}?sort=${sort}`);
  },

  // ===================== STORES PAGE =====================
  async stores() {
    UI.showLoading();
    try {
      const [storesData, neighborhoods] = await Promise.all([
        API.getStores({ limit: 50 }),
        API.getNeighborhoods()
      ]);

      const stores = storesData?.stores || [];

      UI.render(`
        <div class="page-title-bar">
          <h2 class="page-title">🏪 المتاجر والمستودعات</h2>
        </div>

        <div class="filters-bar">
          <select class="sort-select" id="neighborhoodFilter" onchange="Pages._filterStores()">
            <option value="">كل الأحياء</option>
            ${(neighborhoods || []).map(n => 
              `<option value="${n.neighborhood}">${n.neighborhood} (${n.store_count})</option>`
            ).join('')}
          </select>
          <select class="sort-select" id="storeSort" onchange="Pages._filterStores()">
            <option value="rating">الأعلى تقييماً</option>
            <option value="name">الاسم</option>
            <option value="reviews">الأكثر تقييماً</option>
            <option value="newest">الأحدث</option>
          </select>
        </div>

        <div id="storesList">
          ${stores.map(s => UI.storeCard(s)).join('')}
        </div>

        ${stores.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🏪</div>
            <h3>لا توجد متاجر</h3>
          </div>
        ` : ''}
      `);
    } catch (e) {
      UI.showError();
    }
  },

  async _filterStores() {
    const neighborhood = document.getElementById('neighborhoodFilter').value;
    const sort = document.getElementById('storeSort').value;
    const params = { sort, limit: 50 };
    if (neighborhood) params.neighborhood = neighborhood;

    try {
      const data = await API.getStores(params);
      document.getElementById('storesList').innerHTML = 
        (data.stores || []).map(s => UI.storeCard(s)).join('') ||
        '<div class="empty-state"><div class="empty-icon">🏪</div><h3>لا توجد نتائج</h3></div>';
    } catch (e) {
      UI.toast('⚠️ تعذر تحديث النتائج');
    }
  },

  // ===================== STORE DETAIL PAGE =====================
  async storeDetail({ slug }) {
    UI.showLoading();
    try {
      const data = await API.getStore(slug);
      const { store, reviews, products, categories } = data;

      UI.render(`
        <!-- Store Header -->
        <div class="store-header-banner">
          <h2>
            ${store.name}
            ${store.is_verified ? '<span style="font-size:0.8rem">✓ موثق</span>' : ''}
          </h2>
          <p class="desc">${store.description}</p>
          <div style="display:flex;justify-content:center;gap:16px;margin-top:12px">
            <span>⭐ ${store.rating}/5</span>
            <span>💬 ${store.rating_count} تقييم</span>
            <span>📦 ${store.product_count} منتج</span>
          </div>
        </div>

        <!-- Store Info -->
        <div class="store-info-grid">
          <div class="store-info-item" onclick="window.open('tel:${store.phone}')">
            <span class="info-icon">📞</span>
            <div>
              <span class="info-label">الهاتف</span>
              <span>${store.phone}</span>
            </div>
          </div>
          <div class="store-info-item" onclick="Share.whatsappDirect('${store.whatsapp}')">
            <span class="info-icon">💬</span>
            <div>
              <span class="info-label">واتساب</span>
              <span>تواصل الآن</span>
            </div>
          </div>
          <div class="store-info-item">
            <span class="info-icon">📍</span>
            <div>
              <span class="info-label">العنوان</span>
              <span>${store.neighborhood}</span>
            </div>
          </div>
          <div class="store-info-item">
            <span class="info-icon">🕐</span>
            <div>
              <span class="info-label">الدوام</span>
              <span style="font-size:0.72rem">${store.working_hours || '-'}</span>
            </div>
          </div>
        </div>

        <!-- Tags -->
        <div style="padding: 8px 16px; display:flex; gap:6px; flex-wrap:wrap">
          ${store.delivery_available ? '<span class="tag delivery">🚚 توصيل متاح</span>' : ''}
          ${store.installment_available ? '<span class="tag installment">💳 تقسيط متاح</span>' : ''}
          ${store.is_verified ? '<span class="tag" style="background:#d4edda;color:#155724">✓ متجر موثق ميدانياً</span>' : ''}
        </div>

        <!-- Action Buttons -->
        <div style="padding: 8px 16px; display:flex; gap:8px;">
          <button class="btn btn-whatsapp btn-sm" onclick='Share.whatsappStore(${JSON.stringify({slug:store.slug,name:store.name,rating:store.rating,rating_count:store.rating_count,address:store.address,phone:store.phone,delivery_available:store.delivery_available,installment_available:store.installment_available})})'>
            📤 مشاركة عبر واتساب
          </button>
          <button class="btn btn-outline btn-sm" onclick="QR.showQRModal('${store.name}', QR.storeQR('${store.slug}'))">
            📱 QR Code
          </button>
        </div>

        <!-- Store Categories -->
        ${categories.length > 0 ? `
          <div class="section-header">
            <h3 class="section-title">أقسام المتجر</h3>
          </div>
          <div class="categories-scroll">
            ${categories.map(c => `
              <a class="category-chip" href="#/products?store=${store.id}&category=${c.id}">
                <span class="cat-icon">${c.icon || '📂'}</span>
                <span class="cat-name">${c.name}</span>
                <span class="cat-count">${c.count}</span>
              </a>
            `).join('')}
          </div>
        ` : ''}

        <!-- Products -->
        <div class="section-header">
          <h3 class="section-title">📦 المنتجات</h3>
        </div>
        <div class="products-grid">
          ${products.map(p => UI.productCard(p)).join('')}
        </div>

        ${products.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>لا توجد منتجات حالياً</h3>
          </div>
        ` : ''}

        <!-- Reviews -->
        ${reviews.length > 0 ? `
          <div class="section-header">
            <h3 class="section-title">💬 التقييمات</h3>
          </div>
          <div class="card" style="margin: 0 12px 16px;">
            ${reviews.map(r => `
              <div class="review-card">
                <div class="review-header">
                  <span class="review-name">
                    ${r.reviewer_name}
                    ${r.is_verified ? '<span class="verified">✓</span>' : ''}
                  </span>
                  <span class="review-stars">${UI.stars(r.rating)}</span>
                </div>
                <p class="review-text">${r.comment}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `);
    } catch (e) {
      UI.showError('تعذر تحميل بيانات المتجر');
    }
  },

  // ===================== PRODUCT DETAIL PAGE =====================
  async productDetail({ id }) {
    UI.showLoading();
    try {
      const data = await API.getProduct(id);
      const { product, images, reviews, related } = data;
      const isWishlisted = Wishlist.has(product.id);
      const categoryIcon = product.category_icon || '📦';

      UI.render(`
        <div class="product-detail">
          <!-- Back button -->
          <div class="page-title-bar">
            <a href="javascript:history.back()" class="back-btn">→</a>
            <h2 class="page-title" style="font-size:0.95rem">${product.category_name || ''}</h2>
          </div>

          <!-- Gallery -->
          <div class="product-gallery">
            <div class="placeholder-img" style="font-size:6rem">${categoryIcon}</div>
          </div>

          <!-- Info -->
          <div class="product-detail-info">
            <h1 class="product-detail-name">${product.name}</h1>

            <!-- Price -->
            <div class="product-detail-price">
              <span class="current">${product.price_formatted || UI.formatPrice(product.price)}</span>
              ${product.old_price ? `<span class="old">${product.old_price_formatted || UI.formatPrice(product.old_price)}</span>` : ''}
              ${product.discount_percent > 0 ? `<span class="discount">-${product.discount_percent}% خصم</span>` : ''}
              ${product.price_usd ? `<span class="usd">≈ $${product.price_usd.toLocaleString()}</span>` : ''}
            </div>

            <!-- Tags -->
            <div class="product-tags">
              ${product.is_negotiable ? '<span class="tag negotiable">💬 قابل للتفاوض</span>' : ''}
              ${product.solar_compatible ? '<span class="tag solar">☀️ متوافق مع السولار</span>' : ''}
              ${product.delivery_available ? '<span class="tag delivery">🚚 توصيل متاح</span>' : ''}
              ${product.installment_available ? '<span class="tag installment">💳 تقسيط</span>' : ''}
              ${product.in_stock ? '<span class="tag" style="background:#d4edda;color:#155724">✓ متوفر</span>' : '<span class="tag" style="background:#f8d7da;color:#721c24">✕ نفذت الكمية</span>'}
            </div>

            <!-- Description -->
            <p class="product-desc">${product.description}</p>

            <!-- Specifications -->
            <div class="section-header" style="padding: 0; margin-bottom: 8px;">
              <h3 class="section-title">📋 المواصفات</h3>
            </div>
            <table class="specs-table">
              ${product.brand ? `<tr><td>الماركة</td><td>${product.brand}</td></tr>` : ''}
              ${product.origin_country ? `<tr><td>بلد المنشأ</td><td>${product.origin_country}</td></tr>` : ''}
              ${product.material ? `<tr><td>المادة</td><td>${product.material}</td></tr>` : ''}
              ${product.dimensions ? `<tr><td>الأبعاد</td><td>${product.dimensions}</td></tr>` : ''}
              ${product.color ? `<tr><td>اللون</td><td>${product.color}</td></tr>` : ''}
              ${product.weight ? `<tr><td>الوزن</td><td>${product.weight}</td></tr>` : ''}
              ${product.energy_rating ? `<tr><td>تصنيف الطاقة</td><td>${product.energy_rating}</td></tr>` : ''}
              ${product.warranty ? `<tr><td>الكفالة</td><td>${product.warranty}</td></tr>` : ''}
              ${product.stock_quantity ? `<tr><td>الكمية المتوفرة</td><td>${product.stock_quantity} قطعة</td></tr>` : ''}
            </table>

            <!-- Store Info -->
            <div class="section-header" style="padding: 0; margin: 16px 0 8px;">
              <h3 class="section-title">🏪 المتجر</h3>
            </div>
            <a class="store-card" href="#/store/${product.store_slug}" style="margin:0">
              <div class="store-card-logo">${product.store_name?.charAt(0) || '🏪'}</div>
              <div class="store-card-info">
                <div class="store-card-name">
                  ${product.store_name}
                  ${product.store_verified ? '<span class="verified-icon">✓</span>' : ''}
                </div>
                <div class="store-card-meta">📍 ${product.store_neighborhood} | ${product.store_address || ''}</div>
                <div class="store-card-meta">🕐 ${product.working_hours || ''}</div>
              </div>
            </a>

            <!-- Reviews -->
            ${reviews.length > 0 ? `
              <div class="section-header" style="padding: 0; margin: 16px 0 8px;">
                <h3 class="section-title">💬 التقييمات</h3>
              </div>
              ${reviews.map(r => `
                <div class="review-card" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
                  <div class="review-header">
                    <span class="review-name">${r.reviewer_name}</span>
                    <span class="review-stars">${UI.stars(r.rating)}</span>
                  </div>
                  <p class="review-text">${r.comment}</p>
                </div>
              `).join('')}
            ` : ''}

            <!-- Related Products -->
            ${related.length > 0 ? `
              <div class="section-header" style="padding: 0; margin: 20px 0 8px;">
                <h3 class="section-title">🔄 منتجات مشابهة</h3>
              </div>
              <div class="products-scroll" style="padding: 8px 0 16px; margin: 0 -16px; padding-left: 16px; padding-right: 16px;">
                ${related.map(p => UI.productCard(p)).join('')}
              </div>
            ` : ''}

            <!-- QR Section -->
            <div style="text-align:center; margin: 20px 0; padding: 16px; background: var(--bg); border-radius: var(--radius);">
              <p style="font-size:0.82rem; color: var(--text-light); margin-bottom:8px">📱 امسح الكود لحفظ هذا المنتج</p>
              <button class="btn btn-outline btn-sm" onclick="QR.showQRModal('${product.name}', QR.productQR(${product.id}))">
                عرض QR Code
              </button>
            </div>
          </div>

          <!-- Fixed Action Bar -->
          <div class="product-actions">
            <button class="btn btn-whatsapp" style="flex:1" 
                    onclick='Share.whatsappDirect("${product.store_whatsapp}", "${product.name}")'>
              💬 واتساب المتجر
            </button>
            <button class="btn btn-primary" style="flex:1"
                    onclick='Share.whatsappProduct(${JSON.stringify({id:product.id,name:product.name,price_formatted:product.price_formatted,old_price_formatted:product.old_price_formatted,old_price:product.old_price,price:product.price,store_name:product.store_name,store_neighborhood:product.store_neighborhood})})'>
              📤 مشاركة
            </button>
            <button class="btn ${isWishlisted ? 'btn-secondary' : 'btn-outline'} btn-icon" 
                    onclick="Wishlist.toggle(${product.id}); Pages.productDetail({id:${product.id}})"
                    data-wishlist-btn="${product.id}">
              ❤️
            </button>
          </div>
        </div>
      `);
    } catch (e) {
      UI.showError('تعذر تحميل تفاصيل المنتج');
    }
  },

  // ===================== PRODUCTS LIST PAGE =====================
  async productsList({ query = {} }) {
    UI.showLoading();
    try {
      const params = { ...query, page: 1, limit: 20 };
      const data = await API.getProducts(params);
      const { products, pagination } = data;

      let currentPage = 1;
      let loading = false;

      const title = query.search ? `نتائج البحث: "${query.search}"` :
                    query.featured ? 'منتجات مميزة' :
                    'جميع المنتجات';

      UI.render(`
        <div class="page-title-bar">
          <a href="javascript:history.back()" class="back-btn">→</a>
          <h2 class="page-title">${title}</h2>
          <span style="font-size:0.8rem;color:var(--text-light)">${pagination.total} منتج</span>
        </div>

        <div class="filters-bar">
          <select class="sort-select" id="sortSelect" onchange="Pages._sortProducts()">
            <option value="featured">مميز</option>
            <option value="price_asc">السعر ↑</option>
            <option value="price_desc">السعر ↓</option>
            <option value="newest">الأحدث</option>
            <option value="popular">الأكثر مشاهدة</option>
          </select>
        </div>

        <div class="products-grid" id="productsGrid">
          ${products.map(p => UI.productCard(p)).join('')}
        </div>

        ${products.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>لا توجد نتائج</h3>
            <p>جرّب تغيير كلمات البحث أو الفلاتر</p>
          </div>
        ` : ''}

        ${pagination.hasMore ? '<div id="scrollSentinel" style="height:20px"></div>' : ''}
        <div id="loadingMore" style="display:none;text-align:center;padding:20px">
          <div class="loader"></div>
        </div>
      `);

      // Infinite scroll
      if (pagination.hasMore) {
        UI.setupInfiniteScroll(async () => {
          if (loading) return;
          loading = true;
          currentPage++;
          document.getElementById('loadingMore').style.display = 'block';
          try {
            const more = await API.getProducts({ ...params, page: currentPage });
            const grid = document.getElementById('productsGrid');
            grid.insertAdjacentHTML('beforeend', more.products.map(p => UI.productCard(p)).join(''));
            if (!more.pagination.hasMore) {
              const sentinel = document.getElementById('scrollSentinel');
              if (sentinel) sentinel.remove();
            }
          } catch (e) { currentPage--; }
          loading = false;
          document.getElementById('loadingMore').style.display = 'none';
        });
      }
    } catch (e) {
      UI.showError();
    }
  },

  _sortProducts() {
    const sort = document.getElementById('sortSelect')?.value;
    const hash = window.location.hash;
    const base = hash.split('?')[0];
    const params = new URLSearchParams(hash.split('?')[1] || '');
    params.set('sort', sort);
    window.location.hash = `${base}?${params.toString()}`;
  },

  // ===================== OFFERS PAGE =====================
  async offers() {
    UI.showLoading();
    try {
      const data = await API.getProducts({ sort: 'price_asc', limit: 40 });
      // Filter products with discounts
      const offers = (data.products || []).filter(p => p.old_price && p.old_price > p.price);

      UI.render(`
        <div class="page-title-bar">
          <h2 class="page-title">🏷️ العروض والتخفيضات</h2>
        </div>

        ${offers.length > 0 ? `
          <div class="products-grid">
            ${offers.map(p => `
              <div class="offer-product-card">
                <div class="discount-ribbon">-${p.discount_percent}%</div>
                ${UI.productCard(p)}
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">🏷️</div>
            <h3>لا توجد عروض حالياً</h3>
            <p>تابعنا لمعرفة أحدث العروض والتخفيضات</p>
          </div>
        `}
      `);
    } catch (e) {
      UI.showError();
    }
  },

  // ===================== WISHLIST PAGE =====================
  async wishlist() {
    UI.showLoading();
    try {
      const wishlistIds = Wishlist.getAll();

      if (wishlistIds.length === 0) {
        UI.render(`
          <div class="page-title-bar">
            <h2 class="page-title">❤️ قائمة الأمنيات</h2>
          </div>
          <div class="empty-state">
            <div class="empty-icon">💔</div>
            <h3>قائمة الأمنيات فارغة</h3>
            <p>اضغط على ❤️ بجانب أي منتج لإضافته هنا</p>
            <a href="#/" class="btn btn-primary" style="margin-top:12px">تصفح المنتجات</a>
          </div>
        `);
        return;
      }

      // Fetch wishlisted products
      const deviceId = App.getDeviceId();
      let products = [];

      try {
        const data = await API.getWishlistProducts(deviceId);
        products = data.products || [];
      } catch (e) {
        // Fallback: just show IDs
      }

      // If server didn't return results, fetch individually from cache
      if (products.length === 0) {
        for (const id of wishlistIds) {
          try {
            const data = await API.getProduct(id);
            if (data.product) {
              products.push(data.product);
            }
          } catch (e) { /* skip */ }
        }
      }

      UI.render(`
        <div class="page-title-bar">
          <h2 class="page-title">❤️ قائمة الأمنيات (${products.length})</h2>
        </div>
        <div class="products-grid">
          ${products.map(p => UI.productCard(p)).join('')}
        </div>

        <div style="padding: 16px; text-align: center;">
          <button class="btn btn-whatsapp btn-sm" onclick="Pages._shareWishlist(${JSON.stringify(products.map(p => ({name:p.name, price_formatted: p.price_formatted || ''})))})">
            📤 شارك قائمتك عبر واتساب
          </button>
        </div>
      `);
    } catch (e) {
      UI.showError();
    }
  },

  _shareWishlist(products) {
    const items = products.map((p, i) => `${i+1}. ${p.name} - ${p.price_formatted}`).join('\n');
    const text = `❤️ *قائمة أمنياتي - دليل الرقة*\n\n${items}\n\n📱 حمّل التطبيق: ${window.location.origin}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  // ===================== SEARCH RESULTS =====================
  async searchResults({ query }) {
    UI.showLoading();
    try {
      const data = await API.search(query.q);
      const { products, stores, suggestions } = data;

      UI.render(`
        <div class="page-title-bar">
          <a href="#/" class="back-btn">→</a>
          <h2 class="page-title">🔍 "${query.q}"</h2>
        </div>

        ${suggestions.length > 0 ? `
          <div class="categories-scroll" style="padding-top:0">
            ${suggestions.map(s => `
              <span class="category-chip" onclick="Router.navigate('/search?q=${encodeURIComponent(s)}')" style="cursor:pointer">
                <span class="cat-name">${s}</span>
              </span>
            `).join('')}
          </div>
        ` : ''}

        ${stores.length > 0 ? `
          <div class="section-header">
            <h3 class="section-title">🏪 متاجر</h3>
          </div>
          ${stores.map(s => UI.storeCard(s)).join('')}
        ` : ''}

        ${products.length > 0 ? `
          <div class="section-header">
            <h3 class="section-title">📦 منتجات (${products.length})</h3>
          </div>
          <div class="products-grid">
            ${products.map(p => UI.productCard(p)).join('')}
          </div>
        ` : ''}

        ${products.length === 0 && stores.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🔍</div>
            <h3>لا توجد نتائج لـ "${query.q}"</h3>
            <p>جرّب كلمات بحث مختلفة مثل: أثاث، برّاد، سولار، صحون</p>
          </div>
        ` : ''}
      `);
    } catch (e) {
      UI.showError();
    }
  },

  // ===================== ABOUT PAGE =====================
  about() {
    UI.render(`
      <div class="about-page">
        <div style="text-align:center; margin-bottom: 24px;">
          <div style="font-size: 3rem;">🏪</div>
          <h2 style="margin-bottom: 4px;">دليل المستودعات والأسواق المنزلية</h2>
          <p style="color: var(--text-light); font-size: 0.85rem;">مدينة الرقة - الإصدار 1.0.0</p>
        </div>

        <p>
          منصة رقمية متخصصة تربط المستهلك بمستودعات وأسواق الأدوات المنزلية والأثاث 
          في مدينة الرقة. نوفر لك كاتالوج حي يتم تحديثه ميدانياً من قبل فريقنا المتخصص.
        </p>

        <div class="about-feature">
          <span class="feature-icon">📸</span>
          <div>
            <div class="feature-title">توثيق ميداني</div>
            <div class="feature-desc">صور احترافية ملتقطة من داخل المستودعات - لا صور إنترنت مضللة</div>
          </div>
        </div>

        <div class="about-feature">
          <span class="feature-icon">💰</span>
          <div>
            <div class="feature-title">أسعار حقيقية ومحدّثة</div>
            <div class="feature-desc">أسعار يتم التحقق منها دورياً - لا "السعر خاص" أو أرقام قديمة</div>
          </div>
        </div>

        <div class="about-feature">
          <span class="feature-icon">📱</span>
          <div>
            <div class="feature-title">يعمل بدون إنترنت</div>
            <div class="feature-desc">بعد التحميل الأول، يمكنك تصفح المنتجات حتى أثناء انقطاع الشبكة</div>
          </div>
        </div>

        <div class="about-feature">
          <span class="feature-icon">📤</span>
          <div>
            <div class="feature-title">مشاركة سهلة</div>
            <div class="feature-desc">شاركي أي منتج مع العائلة والصديقات عبر واتساب بضغطة واحدة</div>
          </div>
        </div>

        <div class="about-feature">
          <span class="feature-icon">📱</span>
          <div>
            <div class="feature-title">QR Code ذكي</div>
            <div class="feature-desc">امسح كود المنتج داخل المتجر لحفظه في قائمة أمنياتك</div>
          </div>
        </div>

        <div class="about-feature">
          <span class="feature-icon">🔍</span>
          <div>
            <div class="feature-title">فلاتر متقدمة</div>
            <div class="feature-desc">ابحث حسب نوع الخشب، تصنيف الطاقة، التوافق مع السولار، وأكثر</div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 24px; padding: 20px; background: var(--bg); border-radius: var(--radius);">
          <p style="font-size: 0.85rem; color: var(--text-light); margin-bottom: 8px;">
            هل أنت صاحب مستودع أو متجر؟
          </p>
          <p style="font-size: 0.9rem; font-weight: 600; margin-bottom: 12px;">
            انضم إلى دليل الرقة واعرض منتجاتك لآلاف المتسوقين
          </p>
          <button class="btn btn-whatsapp btn-sm" onclick="Share.whatsappDirect('+963932100000', 'أريد الانضمام كمتجر في دليل الرقة')">
            تواصل معنا
          </button>
        </div>

        <div style="text-align:center; margin-top: 20px; font-size: 0.75rem; color: var(--text-muted);">
          <p>© 2025 دليل المستودعات والأسواق المنزلية</p>
          <p>مدينة الرقة، سوريا</p>
        </div>
      </div>
    `);
  }
};
