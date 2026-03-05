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

      // Get loyalty coins
      const coins = Loyalty.getCoins();

      UI.render(`
        <!-- Bento Hero Grid -->
        <div class="bento-grid" style="padding: 12px;">
          <div class="bento-item span-2 gradient-primary" onclick="Router.navigate('/')">
            <h2 style="font-size:1.3rem;margin-bottom:6px">🏪 دليل الرقة</h2>
            <p style="font-size:0.82rem;opacity:0.9">كل ما يحتاجه منزلك في مكان واحد</p>
            <div style="display:flex;gap:16px;margin-top:10px;">
              <span><strong>${totalStores}+</strong> متجر</span>
              <span><strong>${totalProducts}+</strong> منتج</span>
              <span><strong>${categories.length}</strong> تصنيف</span>
            </div>
          </div>
          <div class="bento-item gradient-gold" onclick="Router.navigate('/loyalty')" style="cursor:pointer">
            <div style="font-size:2rem">🪙</div>
            <div style="font-size:1.4rem;font-weight:700">${coins}</div>
            <div style="font-size:0.75rem;opacity:0.8">عملاتي</div>
          </div>
          <div class="bento-item gradient-sunset" onclick="Router.navigate('/offers')" style="cursor:pointer">
            <div style="font-size:2rem">🏷️</div>
            <div style="font-size:0.85rem;font-weight:600">العروض</div>
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

        <!-- CTAs Bento -->
        <div class="bento-grid" style="padding: 12px;">
          <div class="bento-item gradient-rose" onclick="Router.navigate('/products?search=عرسان')" style="cursor:pointer">
            <div style="font-size:2rem">💍👰</div>
            <h3 style="font-size:0.9rem;margin:6px 0 4px">تجهيز العرسان</h3>
            <p style="font-size:0.75rem;opacity:0.85">باكجات كاملة</p>
          </div>
          <div class="bento-item gradient-green" onclick="Router.navigate('/category/9')" style="cursor:pointer">
            <div style="font-size:2rem">☀️🔋</div>
            <h3 style="font-size:0.9rem;margin:6px 0 4px">طاقة شمسية</h3>
            <p style="font-size:0.75rem;opacity:0.85">أنظمة سولار متكاملة</p>
          </div>
        </div>

        <!-- حقيبة التجهيز + رادار + P2P -->
        <div class="bento-grid" style="padding: 0 12px 12px;">
          <div class="bento-item span-2" onclick="Router.navigate('/packs')" style="cursor:pointer;background:linear-gradient(135deg,#0d47a1,#1976d2);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:2rem">🎒</span>
              <div>
                <h3 style="font-size:0.95rem;margin:0 0 4px">حقيبة التجهيز</h3>
                <p style="font-size:0.75rem;opacity:0.85">حمّل حزمة كاملة وقارن أوفلاين</p>
              </div>
            </div>
          </div>
          <div class="bento-item" onclick="Router.navigate('/p2p')" style="cursor:pointer;background:linear-gradient(135deg,#4a148c,#7b1fa2);">
            <div style="font-size:1.8rem">📡</div>
            <div style="font-size:0.8rem;font-weight:600;margin-top:4px">نقل P2P</div>
          </div>
          <div class="bento-item" onclick="Pages._refreshRadar()" style="cursor:pointer;background:linear-gradient(135deg,#1b5e20,#388e3c);">
            <div style="font-size:1.8rem">📡</div>
            <div style="font-size:0.8rem;font-weight:600;margin-top:4px">رادار الحي</div>
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

  // ===================== LOYALTY PAGE =====================
  async loyalty() {
    UI.showLoading();
    try {
      const deviceId = App.getDeviceId();
      const account = await Loyalty.getAccount();
      let leaderboard = [];
      try {
        leaderboard = await API.fetch('/loyalty/leaderboard/top');
      } catch (e) { /* offline */ }

      const levelEmojis = { 'زائر': '🌱', 'متسوق': '🛒', 'عميل مميز': '⭐', 'عميل ذهبي': '👑', 'سفير الرقة': '🏆' };
      const levelName = account.level?.name || 'زائر';
      const levelIcon = account.level?.icon || '🌱';
      const nextLevelAt = account.next_level ? account.next_level.min : null;
      const progress = nextLevelAt ? Math.min(100, Math.round((account.total_earned / nextLevelAt) * 100)) : 100;

      UI.render(`
        <div class="page-title-bar">
          <a href="#/" class="back-btn">→</a>
          <h2 class="page-title">🪙 عملاتي ومكافآتي</h2>
        </div>

        <!-- Loyalty Hero -->
        <div class="loyalty-hero">
          <div class="loyalty-coins-display">
            <span class="coins-amount">${account.coins}</span>
            <span class="coins-label">عملة سوقية</span>
          </div>
          <div class="loyalty-level">
            <span>${levelIcon} ${levelName}</span>
          </div>
          ${nextLevelAt ? `
            <div class="loyalty-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="progress-text">${account.total_earned}/${nextLevelAt} للمستوى التالي</span>
            </div>
          ` : '<div style="font-size:0.82rem;color:var(--text-light);margin-top:8px">🏆 أعلى مستوى!</div>'}
        </div>

        <!-- Actions -->
        <div class="loyalty-actions">
          <button class="loyalty-action-card" onclick="Pages._dailyCheckin()">
            <div class="action-icon">📅</div>
            <div class="action-title">تسجيل يومي</div>
            <div class="action-desc">+1 عملة يومياً</div>
            <div class="action-streak">🔥 سلسلة: ${account.streak || 0} يوم</div>
          </button>
          <button class="loyalty-action-card" onclick="Pages._shareForCoins()">
            <div class="action-icon">📤</div>
            <div class="action-title">شارك منتج</div>
            <div class="action-desc">+2 عملة لكل مشاركة</div>
          </button>
          <button class="loyalty-action-card" onclick="Pages._scanForCoins()">
            <div class="action-icon">📱</div>
            <div class="action-title">مسح QR</div>
            <div class="action-desc">+1 عملة لكل مسح</div>
          </button>
        </div>

        <!-- Leaderboard -->
        ${leaderboard.length > 0 ? `
          <div class="section-header">
            <h3 class="section-title">🏆 المتصدرون</h3>
          </div>
          <div class="leaderboard-list">
            ${leaderboard.map((u, i) => `
              <div class="leaderboard-item ${u.device_id === deviceId ? 'is-me' : ''}">
                <span class="lb-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1)}</span>
                <span class="lb-name">${u.device_id === deviceId ? 'أنت' : 'متسوق ' + (i+1)}</span>
                <span class="lb-coins">${u.total_earned || u.total_coins || 0} 🪙</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- How it works -->
        <div style="padding: 16px;">
          <div class="card" style="padding: 16px;">
            <h3 style="margin-bottom:10px;font-size:0.95rem">📖 كيف يعمل نظام العملات؟</h3>
            <div style="font-size:0.82rem;color:var(--text-light);line-height:1.8">
              <p>📅 <strong>تسجيل يومي:</strong> +1 عملة + مكافأة كل 7 أيام متتالية</p>
              <p>📤 <strong>مشاركة واتساب:</strong> +2 عملة (حتى 5 مشاركات/يوم)</p>
              <p>📱 <strong>مسح QR:</strong> +1 عملة (حتى 10 مسح/يوم)</p>
              <p>💰 <strong>إتمام صفقة:</strong> +5 عملات عند تأكيد الاستلام</p>
            </div>
          </div>
        </div>
      `);
    } catch (e) {
      UI.showError('تعذر تحميل صفحة المكافآت');
    }
  },

  async _dailyCheckin() {
    try {
      const result = await Loyalty.dailyCheckin();
      if (!result.success) {
        UI.toast('✅ تم التسجيل اليوم مسبقاً');
      } else {
        UI.toast(`🪙 +${result.coins_earned} عملة! سلسلة: ${result.streak} يوم 🔥`);
        // Refresh page
        Pages.loyalty();
      }
    } catch (e) {
      UI.toast('حدث خطأ في التسجيل');
    }
  },

  _shareForCoins() {
    UI.toast('📤 شارك أي منتج عبر واتساب لكسب عملات!');
    Router.navigate('/products?featured=1');
  },

  _scanForCoins() {
    UI.toast('📱 امسح QR Code في أي متجر لكسب عملات!');
  },

  // ===================== VISUAL SEARCH RESULTS =====================
  visualSearchResults(results) {
    UI.render(`
      <div class="page-title-bar">
        <a href="#/" class="back-btn">→</a>
        <h2 class="page-title">📷 نتائج البحث المرئي</h2>
      </div>

      <div class="products-grid">
        ${results.map(p => `
          <div style="position:relative">
            <div class="visual-match-badge">${Math.round(p.visual_match * 100)}% تطابق</div>
            ${UI.productCard(p)}
          </div>
        `).join('')}
      </div>

      ${results.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📷</div>
          <h3>لم يتم العثور على نتائج</h3>
          <p>جرّب صورة أوضح أو من زاوية مختلفة</p>
        </div>
      ` : ''}
    `);
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
  },

  // ===================== حقيبة التجهيز — PACKS PAGE =====================
  async packs() {
    UI.showLoading();
    try {
      const data = await Packs.getAvailablePacks();
      const packs = data.packs || [];
      const radarTime = Packs.getLastRadarTime();

      UI.render(`
        <div class="page-title-bar">
          <a href="#/" class="back-btn">→</a>
          <h2 class="page-title">🎒 حقيبة التجهيز</h2>
        </div>

        <!-- Radar Status -->
        <div class="card" style="margin: 0 12px 16px; padding: 14px; display: flex; align-items: center; gap: 12px;">
          <div style="font-size: 2rem">📡</div>
          <div style="flex: 1">
            <div style="font-weight: 600; font-size: 0.9rem;">رادار الحي</div>
            <div style="font-size: 0.78rem; color: var(--text-light);">
              ${radarTime ? 
                'آخر تحديث: ' + new Date(radarTime).toLocaleString('ar-SY', {hour:'2-digit',minute:'2-digit',day:'numeric',month:'short'}) : 
                'لم يتم المسح بعد'}
            </div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="Pages._refreshRadar()" id="radarBtn">
            ${radarTime ? '🔄 تحديث' : '📡 مسح'}
          </button>
        </div>

        <!-- Info Card -->
        <div class="card" style="margin: 0 12px 16px; padding: 14px; background: var(--gradient-primary, linear-gradient(135deg, #1a5276, #2980b9)); color: white; border-radius: 12px;">
          <h3 style="font-size: 0.95rem; margin-bottom: 6px;">📦 كيف تعمل الحقائب؟</h3>
          <p style="font-size: 0.78rem; opacity: 0.9; line-height: 1.6;">
            اختر نوع مشروعك (تجهيز منزل، عروس، مطبخ...) ثم حمّل الحقيبة بالكامل.<br>
            ستتمكن من تصفح ومقارنة المنتجات <strong>بدون إنترنت</strong> في بيتك!
          </p>
        </div>

        <!-- Packs Grid -->
        <div style="padding: 0 12px;">
          ${packs.map(pack => {
            const downloaded = Packs.isPackDownloaded(pack.id);
            const dlDate = Packs.getPackDownloadDate(pack.id);
            return `
              <div class="card" style="margin-bottom: 12px; padding: 16px; cursor: pointer;" onclick="Router.navigate('/pack/${pack.id}')">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="font-size: 2.2rem;">${pack.icon}</div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 0.95rem;">${pack.name}</div>
                    <div style="font-size: 0.78rem; color: var(--text-light); margin-top: 2px;">${pack.description}</div>
                    <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 0.75rem; color: var(--text-light);">
                      <span>📦 ${pack.product_count} منتج</span>
                      <span>🏪 ${pack.store_count} متجر</span>
                    </div>
                  </div>
                  <div style="text-align: center;">
                    ${downloaded ? `
                      <span style="font-size: 1.2rem;">✅</span>
                      <div style="font-size: 0.65rem; color: var(--text-light);">محمّل</div>
                    ` : `
                      <span style="font-size: 1.2rem;">📥</span>
                      <div style="font-size: 0.65rem; color: var(--text-light);">تحميل</div>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- P2P Quick Access -->
        <div style="padding: 12px; text-align: center;">
          <div class="card" style="padding: 16px;">
            <div style="font-size: 1.5rem; margin-bottom: 6px;">📡</div>
            <h3 style="font-size: 0.9rem; margin-bottom: 4px;">نقل محلي P2P</h3>
            <p style="font-size: 0.78rem; color: var(--text-light); margin-bottom: 10px;">
              انقل البيانات لصديق بدون إنترنت عبر WebRTC
            </p>
            <button class="btn btn-outline btn-sm" onclick="Router.navigate('/p2p')">فتح P2P</button>
          </div>
        </div>
      `);
    } catch (e) {
      UI.showError('تعذر تحميل الحقائب');
    }
  },

  async _refreshRadar() {
    const btn = document.getElementById('radarBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ المسح...'; }
    try {
      await Packs.startRadar();
      UI.toast('📡 تم تحديث رادار الحي');
      Pages.packs(); // refresh
    } catch (e) {
      UI.toast('❌ تعذر المسح');
      if (btn) { btn.disabled = false; btn.textContent = '🔄 تحديث'; }
    }
  },

  // ===================== PACK DETAIL PAGE =====================
  async packDetail({ id }) {
    UI.showLoading();
    try {
      const data = await Packs.downloadPack(id);
      const { pack, products, stores, categories, priceRange } = data;

      UI.render(`
        <div class="page-title-bar">
          <a href="#/packs" class="back-btn">→</a>
          <h2 class="page-title">${pack.icon} ${pack.name}</h2>
        </div>

        <!-- Pack Stats -->
        <div class="bento-grid" style="padding: 12px;">
          <div class="bento-item gradient-primary">
            <div style="font-size: 1.8rem;">📦</div>
            <div style="font-size: 1.3rem; font-weight: 700;">${products.length}</div>
            <div style="font-size: 0.75rem; opacity: 0.85;">منتج</div>
          </div>
          <div class="bento-item gradient-gold">
            <div style="font-size: 1.8rem;">🏪</div>
            <div style="font-size: 1.3rem; font-weight: 700;">${stores.length}</div>
            <div style="font-size: 0.75rem; opacity: 0.85;">متجر</div>
          </div>
          <div class="bento-item span-2" style="background: var(--card-bg); border: 1px solid var(--border);">
            <div style="font-size: 0.82rem; color: var(--text-light);">نطاق الأسعار</div>
            <div style="font-size: 0.95rem; font-weight: 600; margin-top: 4px;">
              ${priceRange.min_formatted} — ${priceRange.max_formatted}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-light);">متوسط: ${priceRange.avg_formatted}</div>
          </div>
        </div>

        <!-- Pack info -->
        <div style="padding: 0 12px 8px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 0.75rem; color: var(--text-light);">✅ محمّل للتصفح أوفلاين</span>
          <button class="btn btn-outline btn-sm" style="margin-right: auto; font-size: 0.72rem; padding: 4px 8px;" onclick="Pages._deletePack('${pack.id}')">🗑️ حذف</button>
        </div>

        <!-- Categories -->
        ${categories.length > 0 ? `
          <div class="categories-scroll">
            ${categories.map(c => `
              <span class="category-chip" onclick="Pages._filterPackProducts('${pack.id}', ${c.id})" style="cursor:pointer">
                <span class="cat-icon">${c.icon || '📂'}</span>
                <span class="cat-name">${c.name}</span>
                <span class="cat-count">${c.count}</span>
              </span>
            `).join('')}
          </div>
        ` : ''}

        <!-- Stores -->
        <div class="section-header">
          <h3 class="section-title">🏪 المتاجر</h3>
        </div>
        <div style="overflow-x: auto; white-space: nowrap; padding: 0 12px 12px; -webkit-overflow-scrolling: touch;">
          ${stores.map(s => `
            <a class="store-card" href="#/store/${s.slug}" style="display: inline-block; width: 280px; vertical-align: top; white-space: normal; margin-left: 8px;">
              <div class="store-card-logo">${s.name.charAt(0)}</div>
              <div class="store-card-info">
                <div class="store-card-name">${s.name} ${s.is_verified ? '<span class="verified-icon">✓</span>' : ''}</div>
                <div class="store-card-meta">📍 ${s.neighborhood || ''}</div>
                <div class="store-card-stats">
                  <span>★ ${s.rating}</span>
                  <span>📦 ${s.product_count || 0}</span>
                  ${s.delivery_available ? '<span>🚚</span>' : ''}
                </div>
              </div>
            </a>
          `).join('')}
        </div>

        <!-- Products -->
        <div class="section-header">
          <h3 class="section-title">📦 المنتجات</h3>
        </div>
        <div class="products-grid" id="packProductsGrid">
          ${products.map(p => UI.productCard(p)).join('')}
        </div>
      `);

      // Activate LQ lazy loading
      setTimeout(() => Packs.activateLazyImages(), 100);
    } catch (e) {
      UI.showError('تعذر تحميل الحقيبة');
    }
  },

  async _deletePack(packId) {
    await Packs.deletePack(packId);
    Router.navigate('/packs');
  },

  _filterPackProducts(packId, categoryId) {
    // Quick client-side filter
    const grid = document.getElementById('packProductsGrid');
    if (!grid) return;
    grid.querySelectorAll('.product-card').forEach(card => {
      // Simple show/hide, relies on re-render for accuracy
    });
    // Easier: reload with filter
    Pages.packDetail({ id: packId, filterCategory: categoryId });
  },

  // ===================== P2P LOCAL SYNC PAGE =====================
  async p2pSync() {
    UI.render(`
      <div class="page-title-bar">
        <a href="#/packs" class="back-btn">→</a>
        <h2 class="page-title">📡 نقل محلي P2P</h2>
      </div>

      <!-- How it works -->
      <div class="card" style="margin: 12px; padding: 16px; line-height: 1.8;">
        <h3 style="font-size: 0.95rem; margin-bottom: 8px;">🔗 كيف يعمل النقل المحلي؟</h3>
        <p style="font-size: 0.8rem; color: var(--text-light);">
          1. <strong>المرسل</strong> يضغط "إنشاء رابط" وينسخ الكود<br>
          2. <strong>المستقبل</strong> يلصق الكود في خانة "الانضمام"<br>
          3. يتم الاتصال مباشرة (WebRTC) بدون وسيط إنترنت<br>
          4. المرسل يضغط "إرسال البيانات" لنقل كل المنتجات والمتاجر
        </p>
      </div>

      <!-- Status -->
      <div class="card" style="margin: 0 12px 12px; padding: 14px; text-align: center;" id="p2pStatus">
        <div style="font-size: 2rem;" id="p2pStatusIcon">🔌</div>
        <div style="font-size: 0.85rem; font-weight: 600; margin-top: 4px;" id="p2pStatusText">غير متصل</div>
      </div>

      <!-- Host Mode -->
      <div class="card" style="margin: 0 12px 12px; padding: 16px;">
        <h3 style="font-size: 0.9rem; margin-bottom: 10px;">📤 الإرسال (أنت لديك البيانات)</h3>
        <button class="btn btn-primary btn-sm" onclick="Pages._p2pCreateOffer()" id="p2pOfferBtn" style="width: 100%; margin-bottom: 8px;">
          🔗 إنشاء رابط
        </button>
        <div id="p2pOfferCode" style="display: none;">
          <textarea id="p2pOfferText" readonly style="width: 100%; height: 60px; font-size: 0.7rem; border-radius: 8px; border: 1px solid var(--border); padding: 8px; resize: none; direction: ltr;"></textarea>
          <button class="btn btn-outline btn-sm" onclick="Pages._p2pCopyCode('p2pOfferText')" style="width: 100%; margin-top: 6px;">📋 نسخ الكود</button>
        </div>
        <div id="p2pAnswerInput" style="display: none; margin-top: 10px;">
          <label style="font-size: 0.8rem; color: var(--text-light);">الصق رد المستقبل هنا:</label>
          <textarea id="p2pAnswerText" style="width: 100%; height: 60px; font-size: 0.7rem; border-radius: 8px; border: 1px solid var(--border); padding: 8px; resize: none; direction: ltr;" placeholder="الصق كود الرد هنا..."></textarea>
          <button class="btn btn-primary btn-sm" onclick="Pages._p2pAcceptAnswer()" style="width: 100%; margin-top: 6px;">🔗 إتمام الاتصال</button>
        </div>
      </div>

      <!-- Join Mode -->
      <div class="card" style="margin: 0 12px 12px; padding: 16px;">
        <h3 style="font-size: 0.9rem; margin-bottom: 10px;">📥 الاستقبال (تريد الحصول على البيانات)</h3>
        <label style="font-size: 0.8rem; color: var(--text-light);">الصق كود المرسل هنا:</label>
        <textarea id="p2pJoinOfferText" style="width: 100%; height: 60px; font-size: 0.7rem; border-radius: 8px; border: 1px solid var(--border); padding: 8px; resize: none; direction: ltr;" placeholder="الصق كود الاتصال هنا..."></textarea>
        <button class="btn btn-primary btn-sm" onclick="Pages._p2pJoin()" style="width: 100%; margin-top: 6px;">
          📥 انضمام
        </button>
        <div id="p2pJoinAnswer" style="display: none; margin-top: 10px;">
          <label style="font-size: 0.8rem; color: var(--text-light);">أرسل هذا الرد للمرسل:</label>
          <textarea id="p2pJoinAnswerText" readonly style="width: 100%; height: 60px; font-size: 0.7rem; border-radius: 8px; border: 1px solid var(--border); padding: 8px; resize: none; direction: ltr;"></textarea>
          <button class="btn btn-outline btn-sm" onclick="Pages._p2pCopyCode('p2pJoinAnswerText')" style="width: 100%; margin-top: 6px;">📋 نسخ الرد</button>
        </div>
      </div>

      <!-- Send Data Button -->
      <div class="card" style="margin: 0 12px 12px; padding: 16px; text-align: center;" id="p2pSendSection" style="display: none;">
        <button class="btn btn-whatsapp" onclick="Pages._p2pSendData()" id="p2pSendBtn" disabled style="width: 100%;">
          🚀 إرسال البيانات
        </button>
        <div id="p2pProgress" style="display: none; margin-top: 10px;">
          <div style="background: var(--border); border-radius: 4px; height: 6px; overflow: hidden;">
            <div id="p2pProgressBar" style="background: var(--primary); height: 100%; width: 0%; transition: width 0.3s;"></div>
          </div>
          <div id="p2pProgressText" style="font-size: 0.75rem; color: var(--text-light); margin-top: 4px;"></div>
        </div>
      </div>

      <!-- Disconnect -->
      <div style="padding: 0 12px 20px; text-align: center;">
        <button class="btn btn-outline btn-sm" onclick="Pages._p2pDisconnect()" style="color: #e74c3c;">
          🔌 قطع الاتصال
        </button>
        ${localStorage.getItem('dalil_p2p_last') ? `
          <div style="font-size: 0.72rem; color: var(--text-light); margin-top: 8px;">
            آخر نقل: ${new Date(localStorage.getItem('dalil_p2p_last')).toLocaleString('ar-SY')}
          </div>
        ` : ''}
      </div>
    `);
  },

  async _p2pCreateOffer() {
    const btn = document.getElementById('p2pOfferBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ الإنشاء...';

    try {
      const offerCode = await Packs.p2p.createOffer();
      document.getElementById('p2pOfferText').value = offerCode;
      document.getElementById('p2pOfferCode').style.display = 'block';
      document.getElementById('p2pAnswerInput').style.display = 'block';
      btn.textContent = '✅ تم الإنشاء';
      UI.toast('📋 انسخ الكود وأرسله للمستقبل');
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '🔗 إنشاء رابط';
      UI.toast('❌ فشل الإنشاء');
    }
  },

  async _p2pAcceptAnswer() {
    const answer = document.getElementById('p2pAnswerText').value.trim();
    if (!answer) { UI.toast('الصق كود الرد أولاً'); return; }

    try {
      await Packs.p2p.acceptAnswer(answer);
      Pages._p2pUpdateStatus(true);
      document.getElementById('p2pSendBtn').disabled = false;
      UI.toast('🔗 تم الاتصال!');
    } catch (e) {
      UI.toast('❌ كود غير صالح');
    }
  },

  async _p2pJoin() {
    const offer = document.getElementById('p2pJoinOfferText').value.trim();
    if (!offer) { UI.toast('الصق كود المرسل أولاً'); return; }

    try {
      const answerCode = await Packs.p2p.acceptOffer(offer);
      document.getElementById('p2pJoinAnswerText').value = answerCode;
      document.getElementById('p2pJoinAnswer').style.display = 'block';
      UI.toast('📋 انسخ الرد وأرسله للمرسل');

      // Set up receive callback for progress
      Packs.p2p.onReceive = (info) => {
        if (info.progress) {
          const pct = Math.round(info.progress * 100);
          const bar = document.getElementById('p2pProgressBar');
          const text = document.getElementById('p2pProgressText');
          if (bar) bar.style.width = pct + '%';
          if (text) text.textContent = `${pct}% ...`;
          document.getElementById('p2pProgress').style.display = 'block';
        }
      };
    } catch (e) {
      UI.toast('❌ كود غير صالح');
    }
  },

  _p2pCopyCode(textareaId) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    textarea.select();
    document.execCommand('copy');
    UI.toast('📋 تم النسخ!');
  },

  async _p2pSendData() {
    const btn = document.getElementById('p2pSendBtn');
    btn.disabled = true;
    btn.textContent = '⏳ جارٍ الإرسال...';
    document.getElementById('p2pProgress').style.display = 'block';

    try {
      await Packs.p2p.sendData();
      btn.textContent = '✅ تم الإرسال';
    } catch (e) {
      btn.disabled = false;
      btn.textContent = '🚀 إرسال البيانات';
    }
  },

  _p2pUpdateStatus(connected) {
    const icon = document.getElementById('p2pStatusIcon');
    const text = document.getElementById('p2pStatusText');
    if (icon) icon.textContent = connected ? '🟢' : '🔌';
    if (text) text.textContent = connected ? 'متصل' : 'غير متصل';
  },

  _p2pDisconnect() {
    Packs.p2p.disconnect();
    Pages._p2pUpdateStatus(false);
    UI.toast('🔌 تم قطع الاتصال');
  }
};
