/**
 * QR Code Manager - دليل الرقة
 * For in-store digital bridge (Phygital experience)
 * Includes Transaction QR & Escrow (Task 3)
 */
const QR = {
  getQRImageUrl(data, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&charset-target=UTF-8`;
  },

  productQR(productId) {
    const url = `${window.location.origin}/#/product/${productId}`;
    return this.getQRImageUrl(url);
  },

  storeQR(storeSlug) {
    const url = `${window.location.origin}/#/store/${storeSlug}`;
    return this.getQRImageUrl(url);
  },

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

    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;`;
    const inner = modal.querySelector('.qr-modal');
    inner.style.cssText = `background:var(--bg-card, white);border-radius:16px;padding:20px;max-width:320px;width:100%;text-align:center;color:var(--text, #333);`;
    const header = modal.querySelector('.qr-modal-header');
    header.style.cssText = `display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;`;

    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
    // Haptic
    if (navigator.vibrate) navigator.vibrate(20);
  },

  // === Task 3: Transaction QR ===
  async createTransactionQR(productId, amount, productName) {
    try {
      const result = await API.createTransaction(productId, amount);
      if (result.success) {
        const qrUrl = this.getQRImageUrl(result.qr_data, 250);
        this.showTransactionModal(result.tx_code, qrUrl, amount, productName);
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
        return result;
      }
    } catch (e) {
      UI.toast('⚠️ تعذر إنشاء معاملة الدفع');
      return null;
    }
  },

  showTransactionModal(txCode, qrUrl, amount, productName) {
    const modal = document.createElement('div');
    modal.className = 'qr-modal-overlay';
    modal.innerHTML = `
      <div style="background:var(--bg-card, white);border-radius:16px;padding:20px;max-width:360px;width:100%;text-align:center;color:var(--text, #333);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3>🔐 معاملة دفع آمنة</h3>
          <button onclick="this.closest('.qr-modal-overlay').remove()" class="search-close">✕</button>
        </div>
        <div class="escrow-status">
          <div class="status-icon">🛡️</div>
          <div class="status-text">${productName}</div>
          <div class="status-amount">${UI.formatPrice(amount)}</div>
          <p style="font-size:0.78rem;color:var(--text-light);margin:8px 0">كود المعاملة: <strong>${txCode}</strong></p>
        </div>
        <div class="qr-container">
          <img src="${qrUrl}" alt="Transaction QR" width="200" height="200" style="margin:0 auto">
          <p style="font-size:0.78rem;margin-top:8px;">البائع يمسح هذا الكود للتحقق</p>
        </div>
        <button class="btn btn-success btn-block" style="margin-top:12px" onclick="QR.releasePayment('${txCode}', this)">
          ✅ تأكيد استلام البضاعة وتحرير الدفع
        </button>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:8px">
          لن يتم تحرير المبلغ حتى تؤكد استلام البضاعة
        </p>
      </div>
    `;
    modal.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px;`;
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    document.body.appendChild(modal);
  },

  async releasePayment(txCode, btn) {
    if (btn) btn.disabled = true;
    try {
      const result = await API.releasePayment(txCode);
      if (result.success) {
        UI.toast(`✅ ${result.message}`);
        if (result.coins_earned > 0) {
          setTimeout(() => UI.toast(`🪙 +${result.coins_earned} عملة مكافأة!`), 1500);
        }
        if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);
        // Close modal
        const modal = btn?.closest('.qr-modal-overlay');
        if (modal) setTimeout(() => modal.remove(), 2000);
      }
    } catch (e) {
      UI.toast('⚠️ تعذر تأكيد الدفع');
      if (btn) btn.disabled = false;
    }
  }
};
