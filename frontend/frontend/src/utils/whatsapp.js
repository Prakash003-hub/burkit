// Builds a wa.me deep link in Tamil with exact requested format and Google Maps Direction URL (Origin -> Destination).
export function buildWhatsAppMessage(product, buyer, buyerLoc) {
  const buyerName = buyer?.name || 'வாங்குபவர்';
  const buyerMobile = buyer?.mobile || '';
  const productName = product?.productName || 'பொருள்';

  // Construct Google Maps Direction URL (Buyer Location -> Seller/Product Destination)
  let locationUrl = '';
  if (buyerLoc && buyerLoc.lat && buyerLoc.lng && product?.latitude && product?.longitude) {
    locationUrl = `https://www.google.com/maps/dir/?api=1&origin=${buyerLoc.lat},${buyerLoc.lng}&destination=${product.latitude},${product.longitude}`;
  } else if (buyerLoc && buyerLoc.lat && buyerLoc.lng) {
    locationUrl = `https://www.google.com/maps?q=${buyerLoc.lat},${buyerLoc.lng}`;
  } else if (buyer?.district) {
    locationUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((buyer.area ? `${buyer.area}, ` : '') + buyer.district)}`;
  } else {
    locationUrl = 'இடம் தரப்படவில்லை';
  }

  let deliveryStr = '';
  if (product?.deliveryAvailable === 'Yes') {
    deliveryStr = `🚚 டெலிவரி: வசதி உண்டு (₹${product.deliveryFeePerKm || 0}/km)\n`;
  }

  return `வணக்கம்! 😊\n\n` +
    `"${productName}" வாங்கலாம்னு இருக்கேன். இந்த பொருள் இன்னும் available-ஆ இருக்கா?\n\n` +
    `இருந்தா ஒரு reply பண்ணுங்க.\n\n` +
    `👤 பெயர்: ${buyerName}\n` +
    `📱 Mobile: ${buyerMobile}\n` +
    `📍 Location: ${locationUrl}\n` +
    (deliveryStr ? `${deliveryStr}` : '') +
    `\nநன்றி! 🙏`;
}

export function openWhatsApp(product, buyer, buyerLoc) {
  const digits = String(product.sellerMobile || product.mobile || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const message = buildWhatsAppMessage(product, buyer, buyerLoc);

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openDirectWhatsApp(mobile, customMessage) {
  const digits = String(mobile || '').replace(/\D/g, '');
  const phone = digits.length === 10 ? `91${digits}` : digits;
  const url = customMessage 
    ? `https://wa.me/${phone}?text=${encodeURIComponent(customMessage)}`
    : `https://wa.me/${phone}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
