/**
 * Share Manager - دليل الرقة
 * WhatsApp-first sharing strategy for Syrian market
 */
const Share = {
  // Share product via WhatsApp (primary channel)
  whatsappProduct(product) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/#/product/${product.id}`;
    
    const text = `🏪 *${product.name}*\n\n` +
      `💰 السعر: ${product.price_formatted || UI.formatPrice(product.price)}\n` +
      (product.old_price ? `🏷️ قبل الخصم: ${product.old_price_formatted || UI.formatPrice(product.old_price)}\n` : '') +
      (product.store_name ? `🏬 المتجر: ${product.store_name}\n` : '') +
      (product.store_neighborhood ? `📍 ${product.store_neighborhood}\n` : '') +
      `\n🔗 شاهد التفاصيل:\n${url}\n\n` +
      `📱 عبر تطبيق *دليل الرقة*`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');

    // Record share
    API.shareProduct(product.id, App.getDeviceId(), 'whatsapp').catch(() => {});
  },

  // Share store via WhatsApp
  whatsappStore(store) {
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/#/store/${store.slug}`;

    const text = `🏪 *${store.name}*\n\n` +
      `⭐ التقييم: ${store.rating}/5 (${store.rating_count} تقييم)\n` +
      `📍 ${store.address}\n` +
      `📞 ${store.phone}\n` +
      (store.delivery_available ? '🚚 توصيل متاح\n' : '') +
      (store.installment_available ? '💳 تقسيط متاح\n' : '') +
      `\n🔗 شاهد المنتجات:\n${url}\n\n` +
      `📱 عبر تطبيق *دليل الرقة*`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  },

  // Direct WhatsApp to store
  whatsappDirect(whatsappNumber, productName) {
    const cleanNum = whatsappNumber.replace(/[^0-9+]/g, '');
    const text = productName ? 
      `مرحباً، أنا مهتم بـ "${productName}" المعروض على تطبيق دليل الرقة. هل هو متوفر؟` :
      'مرحباً، أتواصل معكم عبر تطبيق دليل الرقة.';
    
    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  // Native share (fallback)
  async native(title, text, url) {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (e) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        UI.toast('📋 تم نسخ الرابط');
      } catch (e) {
        UI.toast('⚠️ تعذر نسخ الرابط');
      }
    }
  }
};
