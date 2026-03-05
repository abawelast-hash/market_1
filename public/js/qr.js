/**
 * QR Code Manager - دليل الرقة
 * For in-store digital bridge (Phygital experience)
 */
const QR = {
  // Generate QR code using a simple API (no external library needed)
  getQRImageUrl(data, size = 200) {
    // Use Google Charts API for QR generation (works offline once cached)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&charset-target=UTF-8`;
  },

  // Generate QR for a product
  productQR(productId) {
    const url = `${window.location.origin}/#/product/${productId}`;
    return this.getQRImageUrl(url);
  },

  // Generate QR for a store
  storeQR(storeSlug) {
    const url = `${window.location.origin}/#/store/${storeSlug}`;
    return this.getQRImageUrl(url);
  },

  // Show QR modal
  showQRModal(title, qrUrl) {
    const modal = document.createElement('div');
    modal.className = 'qr-modal-overlay';
    modal.innerHTML = `
      <div class="qr-modal">
        <div class="qr-modal-header">
          <h3>${title}</h3>
          <button onclick="this.closest('.qr-modal-overlay').remove()" class="search-close">✕</button>
        </div>
        <div class="qr-container">
          <img src="${qrUrl}" alt="QR Code" loading="lazy" width="200" height="200">
          <p>امسح هذا الكود بالكاميرا<br>لفتح الصفحة على هاتفك</p>
        </div>
      </div>
    `;

    // Add styles
    modal.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;
      display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    const inner = modal.querySelector('.qr-modal');
    inner.style.cssText = `
      background:white;border-radius:16px;padding:20px;max-width:320px;width:100%;text-align:center;
    `;
    const header = modal.querySelector('.qr-modal-header');
    header.style.cssText = `
      display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }
};
