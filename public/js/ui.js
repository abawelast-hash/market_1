/**
 * UI Utilities - دليل الرقة
 */
const UI = {
  content: null,
  toastTimer: null,

  init() {
    this.content = document.getElementById('appContent');
  },

  render(html) {
    this.content.innerHTML = html;
  },

  showLoading() {
    this.content.innerHTML = `
      <div class="loading-screen">
        <div class="loader"></div>
        <p>جارٍ التحميل...</p>
      </div>`;
  },

  showError(msg = 'حدث خطأ في تحميل البيانات') {
    this.content.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <h3>عذراً</h3>
        <p>${msg}</p>
        <button class="btn btn-primary" onclick="location.reload()" style="margin-top:12px">إعادة المحاولة</button>
      </div>`;
  },

  toast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  },

  // Generate skeleton loading cards
  skeletonCards(count = 4) {
    return Array(count).fill('').map(() => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `).join('');
  },

  // Format price
  formatPrice(amount) {
    if (!amount) return '';
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)} مليون ل.س`;
    }
    return `${Number(amount).toLocaleString()} ل.س`;
  },

  // Generate star rating HTML
  stars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(empty);
  },

  // Product card HTML
  productCard(p) {
    const isWishlisted = Wishlist.has(p.id);
    const categoryIcon = p.category_icon || '📦';
    const lqSrc = (typeof Packs !== 'undefined') ? Packs.lqPlaceholder(p) : '';
    const hqSrc = p.image_url || '';

    return `
      <div class="product-card" onclick="Router.navigate('/product/${p.id}')">
        <div class="product-img">
          <div class="placeholder-img lq-placeholder" ${hqSrc ? `data-hq-src="${hqSrc}"` : ''} style="${lqSrc ? `background-image:url(${lqSrc});background-size:cover;` : ''}">${!lqSrc ? categoryIcon : ''}</div>
          ${p.discount_percent > 0 ? `<span class="product-badge">-${p.discount_percent}%</span>` : ''}
          ${p.is_featured ? '<span class="product-badge featured">مميز</span>' : ''}
          ${p.solar_compatible ? '<span class="product-badge solar">☀️ سولار</span>' : ''}
          <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" 
                  onclick="event.stopPropagation(); Wishlist.toggle(${p.id})" 
                  data-wishlist-btn="${p.id}">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-store">
            ${p.store_verified ? '<span class="verified">✓</span>' : ''}
            ${p.store_name || ''}
          </div>
          <div class="product-price-wrap">
            <span class="product-price">${p.price_formatted || UI.formatPrice(p.price)}</span>
            ${p.old_price ? `<span class="product-old-price">${p.old_price_formatted || UI.formatPrice(p.old_price)}</span>` : ''}
          </div>
          ${p.price_usd ? `<div class="product-usd">≈ $${p.price_usd.toLocaleString()}</div>` : ''}
        </div>
      </div>`;
  },

  // Store card HTML
  storeCard(s) {
    const initial = s.name.charAt(0);
    return `
      <a class="store-card" href="#/store/${s.slug}">
        <div class="store-card-logo">${initial}</div>
        <div class="store-card-info">
          <div class="store-card-name">
            ${s.is_featured ? '<span class="store-featured-badge">مميز</span>' : ''}
            ${s.name}
            ${s.is_verified ? '<span class="verified-icon">✓</span>' : ''}
          </div>
          <div class="store-card-meta">📍 ${s.neighborhood} | ${s.address || ''}</div>
          <div class="store-card-stats">
            <span class="store-card-stat"><span class="star">★</span> ${s.rating} (${s.rating_count})</span>
            <span class="store-card-stat">📦 ${s.product_count || 0} منتج</span>
            ${s.delivery_available ? '<span class="store-card-stat">🚚 توصيل</span>' : ''}
          </div>
        </div>
      </a>`;
  },

  // Category chip HTML
  categoryChip(c) {
    return `
      <a class="category-chip" href="#/category/${c.id}">
        <span class="cat-icon">${c.icon || '📂'}</span>
        <span class="cat-name">${c.name}</span>
        <span class="cat-count">${c.product_count || 0}</span>
      </a>`;
  },

  // Infinite scroll observer
  setupInfiniteScroll(callback) {
    const sentinel = document.getElementById('scrollSentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, { rootMargin: '200px' });

    observer.observe(sentinel);
    return observer;
  }
};
