import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Store, MapPin, Phone, MessageCircle, Heart, Share2,
  ShoppingCart, CheckCircle, Pencil, Search, Sparkles, X
} from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { openDirectWhatsApp } from '../utils/whatsapp.js';
import { GROCERY_SUBCATEGORIES } from '../data/groceryDefaults.js';
import { calculateScaledPrice, calculateQuantityFromAmount } from '../utils/priceCalculator.js';

function buildScaleOptions(product) {
  const sub = String(product.subCategory || '').toLowerCase();
  const unit = String(product.unitScale || '').toLowerCase();

  let scaleUnits = [];
  if (sub.includes('oil') || unit.includes('l') || unit.includes('ml') || unit.includes('litre')) {
    scaleUnits = ['100ml', '250ml', '500ml', '1 Litre', '2 Litre', '5 Litre'];
  } else if (sub.includes('veg') || sub.includes('paruppu') || sub.includes('mavu') || sub.includes('maligai') || unit.includes('g') || unit.includes('kg')) {
    scaleUnits = ['50g', '100g', '250g', '500g', '750g', '1Kg', '1.5Kg', '2Kg', '5Kg'];
  } else if (Array.isArray(product.availableScales) && product.availableScales.length > 0) {
    scaleUnits = product.availableScales;
  } else if (typeof product.availableScales === 'string' && product.availableScales.trim()) {
    scaleUnits = product.availableScales.split(',').map((s) => s.trim());
  } else {
    scaleUnits = ['100g', '250g', '500g', '1Kg'];
  }

  const rupeePresets = ['₹10', '₹20', '₹50', '₹100', '₹200', '₹500'];
  return { scaleUnits, rupeePresets };
}

export default function ShopDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubCat, setActiveSubCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [populating, setPopulating] = useState(false);

  // Cart state: productId -> { quantity: number, scale: string, price: number, productName: string, tamilName: string }
  const [cart, setCart] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([api.getShop(id), api.getShopProducts({ shopId: id })])
      .then(([s, p]) => {
        if (!mounted) return;
        setShop(s);
        setLikeCount(Number(s.likeCount || 0));
        setProducts(Array.isArray(p) ? p : []);
      })
      .catch((err) => console.error(err))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, [id]);

  async function handlePopulateDefaults() {
    if (!shop) return;
    setPopulating(true);
    try {
      await api.populateShopDefaults(shop.shopId);
      const updatedList = await api.getShopProducts({ shopId: shop.shopId });
      setProducts(Array.isArray(updatedList) ? updatedList : []);
    } catch (err) {
      alert(err.message || 'Failed to populate default items');
    } finally {
      setPopulating(false);
    }
  }

  const isOwnerOrAdmin = shop && user && (String(shop.ownerUserId) === String(user.userId) || isAdmin);

  // Extract unique subcategories
  const availableSubCategories = useMemo(() => {
    const set = new Set();
    products.forEach((p) => {
      if (p.subCategory) set.add(p.subCategory);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = activeSubCat === 'All' || p.subCategory === activeSubCat;
      if (!matchesCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.productName || '').toLowerCase().includes(q) ||
        (p.tamilName || '').toLowerCase().includes(q) ||
        (p.subCategory || '').toLowerCase().includes(q)
      );
    });
  }, [products, activeSubCat, searchQuery]);

  const groupedProducts = useMemo(() => {
    const groups = {};
    filteredProducts.forEach((p) => {
      const sub = p.subCategory || 'General';
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const [customActive, setCustomActive] = useState({});

  function handleSelectScaleOnly(product, scale) {
    if (!scale) return;
    setCustomActive((prev) => ({ ...prev, [product.productId]: false }));
    const basePrice = Number(product.price) || 0;
    const baseUnitScale = product.unitScale || '1Kg';
    const calculatedPrice = calculateScaledPrice(basePrice, baseUnitScale, scale);

    setCart((prev) => ({
      ...prev,
      [product.productId]: {
        type: 'scale',
        scale: scale,
        price: calculatedPrice,
        basePrice: basePrice,
        unitScale: baseUnitScale,
        productName: product.productName,
        tamilName: product.tamilName || product.productName,
      },
    }));
  }

  function handleSelectAmountOnly(product, amount) {
    if (!amount) return;
    if (amount === 'CUSTOM_RS') {
      setCustomActive((prev) => ({ ...prev, [product.productId]: true }));
      return;
    }
    setCustomActive((prev) => ({ ...prev, [product.productId]: false }));
    const priceNum = Number(amount.replace('₹', '')) || 0;
    setCart((prev) => ({
      ...prev,
      [product.productId]: {
        type: 'amount',
        scale: amount,
        price: priceNum,
        productName: product.productName,
        tamilName: product.tamilName || product.productName,
      },
    }));
  }

  function handleCustomAmountInput(product, value) {
    const num = Number(value);
    const basePrice = Number(product.price) || 0;
    const baseUnitScale = product.unitScale || '1Kg';
    const approxQty = calculateQuantityFromAmount(num, basePrice, baseUnitScale);

    setCart((prev) => {
      if (!value || isNaN(num) || num <= 0) {
        const copy = { ...prev };
        delete copy[product.productId];
        return copy;
      }
      return {
        ...prev,
        [product.productId]: {
          type: 'amount',
          scale: `₹${num}${approxQty ? ` (~${approxQty})` : ''}`,
          price: num,
          isCustom: true,
          customAmount: value,
          approxQty: approxQty,
          productName: product.productName,
          tamilName: product.tamilName || product.productName,
        },
      };
    });
  }

  function handleClearSelection(product) {
    setCustomActive((prev) => {
      const copy = { ...prev };
      delete copy[product.productId];
      return copy;
    });
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[product.productId];
      return copy;
    });
  }

  const cartItemsArray = Object.values(cart);
  const cartItemCount = cartItemsArray.length;
  const cartTotalPrice = cartItemsArray.reduce((acc, i) => acc + (i.price || 0), 0);
  const hasUnpricedItems = cartItemsArray.some((i) => !i.price || i.price <= 0);

  function handleSendWhatsAppOrder() {
    if (!shop || cartItemsArray.length === 0) return;

    const pricedItems = cartItemsArray.filter((i) => i.price && i.price > 0);
    const unpricedItems = cartItemsArray.filter((i) => !i.price || i.price <= 0);

    let msg = `வணக்கம் ${shop.shopName}!\nநான் BurKIt SmartCity செயலியில் இருந்து பொருள்களை ஆர்டர் செய்ய விரும்புகிறேன்:\n\n`;

    if (pricedItems.length > 0) {
      msg += `🛒 ஆர்டர் விவரங்கள் (Priced Items):\n`;
      pricedItems.forEach((item, idx) => {
        const name = item.tamilName || item.productName;
        msg += `${idx + 1}. ${name} (${item.scale}) - ₹${item.price}\n`;
      });
      msg += `\n💰 தோராய மொத்தம் (Estimated Total): ₹${cartTotalPrice.toLocaleString('en-IN')}\n\n`;
    }

    if (unpricedItems.length > 0) {
      msg += `⚖️ அளவு மட்டும் (Market Rate / Scale Only):\n`;
      unpricedItems.forEach((item, idx) => {
        const name = item.tamilName || item.productName;
        msg += `${idx + 1}. ${name} (${item.scale})\n`;
      });
      msg += `\n`;
    }

    msg += `📍 வாடிக்கையாளர் பெயர்: ${user?.name || 'Customer'}\n📱 தொலைபேசி எண்: ${user?.mobile || ''}\nநன்றி!`;

    openDirectWhatsApp(shop.whatsappNo, msg);
  }

  async function handleLike() {
    if (!user) return alert('Please log in to like this shop');
    try {
      const res = await api.toggleShopLike(shop.shopId, user.userId);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      console.error(err);
    }
  }

  function handleShare() {
    const shareData = {
      title: shop.shopName,
      text: `${shop.shopName} - ${shop.villageName}`,
      url: window.location.href,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert('Shop link copied to clipboard!');
    }
  }

  if (loading) return <Loader />;
  if (!shop) return <div className="p-8 text-center text-sm text-ink-700/50">Shop not found.</div>;

  return (
    <div className="pb-28">
      {/* Top Bar Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full card flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLike}
            className={`w-10 h-10 rounded-full card flex items-center justify-center shadow-sm transition-transform active:scale-95 ${
              liked ? 'text-rose-500 bg-rose-50' : 'text-ink-700 hover:text-rose-500'
            }`}
          >
            <Heart size={18} className={liked ? 'fill-rose-500 text-rose-500' : ''} />
          </button>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full card flex items-center justify-center shadow-sm text-ink-700 hover:bg-cloud-200"
          >
            <Share2 size={18} />
          </button>
          {isOwnerOrAdmin && (
            <button
              onClick={() => navigate(`/edit-shop/${shop.shopId}`)}
              className="px-3 py-2 rounded-xl bg-[#ea580c] text-white font-bold text-xs flex items-center gap-1 shadow-md hover:bg-orange-700"
            >
              <Pencil size={14} /> Edit Shop
            </button>
          )}
        </div>
      </div>

      {/* Shop Info Card */}
      <div className="px-4 mb-4">
        <div className="card p-5 space-y-4 shadow-md rounded-3xl bg-white dark:bg-ink-800 border border-slate-200/80 dark:border-ink-700">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-2xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0 shadow-sm relative">
              {shop.shopPhoto ? (
                <img src={shop.shopPhoto} alt={shop.shopName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#ea580c] bg-orange-50 dark:bg-ink-900">
                  <Store size={32} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-[#ea580c] text-white">
                {shop.category}
              </span>
              <h1 className="font-display font-bold text-lg text-ink-900 dark:text-cloud-100 mt-1 leading-snug">
                {shop.shopName}
              </h1>

              <div className="flex items-center gap-1 text-xs text-ink-700/80 dark:text-cloud-100/80 mt-1 font-semibold">
                <MapPin size={14} className="text-[#ea580c] shrink-0" />
                <span className="truncate">{shop.streetName ? `${shop.streetName}, ` : ''}{shop.villageName || 'பர்கிட் மாநகரம்'}</span>
              </div>
            </div>
          </div>

          {shop.description && (
            <p className="text-xs text-ink-700/70 dark:text-cloud-100/70 leading-relaxed bg-cloud-50 dark:bg-ink-900/50 p-3 rounded-2xl">
              {shop.description}
            </p>
          )}

          {/* Quick Contact Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => openDirectWhatsApp(shop.whatsappNo, `வணக்கம்! ${shop.shopName} கடை பற்றி விவரம் அறிய தொடர்பு கொள்கிறேன்.`)}
              className="py-2.5 px-3 rounded-2xl bg-[#25D366] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#20bd5a]"
            >
              <MessageCircle size={16} /> WhatsApp Chat
            </button>

            <a
              href={`tel:${shop.whatsappNo}`}
              className="py-2.5 px-3 rounded-2xl card text-ink-800 dark:text-cloud-100 text-xs font-extrabold flex items-center justify-center gap-1.5 hover:bg-cloud-200"
            >
              <Phone size={16} className="text-[#ea580c]" /> Direct Call
            </a>
          </div>
        </div>
      </div>

      {/* Subcategory Filter Tabs */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {availableSubCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveSubCat(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                activeSubCat === cat
                  ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                  : 'card text-ink-700 dark:text-cloud-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input for Products */}
      <div className="px-4 mb-4">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-ink-700/40 dark:text-cloud-100/40" />
          <input
            type="text"
            placeholder="Search items in this shop (e.g. தக்காளி, Tomato, Oil...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9 text-xs py-2.5"
          />
        </div>
      </div>

      {/* Row-wise Product List */}
      <div className="px-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-ink-700/60 dark:text-cloud-100/60 font-bold px-1">
          <span>Available Items ({filteredProducts.length})</span>
          <span>Select Scale / Amount (அளவு / ரூபாய்)</span>
        </div>

        {Object.keys(groupedProducts).length === 0 ? (
          <div className="card p-8 text-center text-xs text-ink-700/50 space-y-3">
            <p>No items available in this view.</p>
            {products.length === 0 && (
              <button
                disabled={populating}
                onClick={handlePopulateDefaults}
                className="btn-primary py-2.5 px-5 text-xs mx-auto flex items-center justify-center gap-2 shadow-md"
              >
                <Sparkles size={16} /> Load Default Grocery Items Catalog (மளிகைப் பொருட்களைச் சேர்க்க)
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedProducts).map(([subCatName, subProducts]) => (
            <div key={subCatName} className="space-y-2.5 pt-2">
              {/* Subcategory Section Header Pill */}
              <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c] shadow-sm"></span>
                <h3 className="font-display font-extrabold text-xs text-ink-900 dark:text-cloud-100 tracking-wide uppercase">
                  {subCatName} ({subProducts.length})
                </h3>
                <div className="flex-1 h-[1px] bg-slate-200 dark:bg-ink-800"></div>
              </div>

              {subProducts.map((p) => {
                const cartItem = cart[p.productId];
                const isSelected = Boolean(cartItem?.scale);
                const { scaleUnits } = buildScaleOptions(p);
                const priceNum = Number(p.price) || 0;

                return (
                  <div
                    key={p.productId}
                    className={`card p-3.5 flex items-center justify-between gap-3 transition-all rounded-2xl ${
                      isSelected ? 'border-[#ea580c] ring-1 ring-[#ea580c]/30 bg-orange-50/20 dark:bg-orange-950/20' : ''
                    }`}
                  >
                    {/* Product Name & Subcategory */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-ink-900 dark:text-cloud-100 leading-snug">
                        {p.productName || p.tamilName}
                      </p>

                      {priceNum > 0 && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-display font-extrabold text-[#ea580c] text-sm">
                            ₹{priceNum.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Separate Scale / Direct Rate Typing Input - Mutual Hiding when filled */}
                    <div className="flex items-center gap-2 shrink-0">
                      {cartItem?.type === 'scale' ? (
                        /* Scale Selected Pill -> Rate Typing Input Hidden */
                        <div className="flex items-center gap-1.5 animate-fadeIn">
                          <span className="py-1.5 px-3 rounded-xl bg-[#ea580c] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md ring-2 ring-orange-500/40">
                            <span>⚖️ {cartItem.scale}{cartItem.price > 0 ? ` (₹${cartItem.price})` : ''}</span>
                            <button
                              onClick={() => handleClearSelection(p)}
                              className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                              title="Remove selection"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        </div>
                      ) : (
                        /* Rate Input (Preserved DOM Node) + Conditional Scale Dropdown */
                        <div className="flex items-center gap-2">
                          {/* Hide Scale Dropdown if Rate is entered */}
                          {!(cartItem?.type === 'amount') && (
                            <select
                              value=""
                              onChange={(e) => handleSelectScaleOnly(p, e.target.value)}
                              className="input text-xs font-extrabold !py-1.5 !px-2.5 rounded-xl bg-white dark:bg-ink-700 text-ink-700 dark:text-cloud-100 border-slate-200 dark:border-ink-600 hover:border-orange-400 cursor-pointer shadow-sm"
                            >
                              <option value="">⚖️ Scale (அளவு)</option>
                              {scaleUnits.map((sc) => (
                                <option key={sc} value={sc} className="text-ink-900 dark:text-cloud-100 bg-white dark:bg-ink-800">
                                  {sc}
                                </option>
                              ))}
                            </select>
                          )}

                          {/* Direct Rate Typing Input (Always same element) */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex items-center">
                              <span className={`absolute left-2.5 font-black text-xs ${cartItem?.type === 'amount' ? 'text-[#ea580c]' : 'text-ink-700/50 dark:text-cloud-100/50'}`}>₹</span>
                              <input
                                type="number"
                                min="1"
                                placeholder="Rate ₹"
                                value={cartItem?.type === 'amount' ? (cartItem?.customAmount || cartItem?.price || '') : ''}
                                onChange={(e) => handleCustomAmountInput(p, e.target.value)}
                                className={`input !pl-6 text-xs font-bold transition-all shadow-sm ${
                                  cartItem?.type === 'amount'
                                    ? 'w-24 !py-1.5 rounded-xl border-[#ea580c] ring-2 ring-orange-500/30 bg-white dark:bg-ink-700 text-ink-900 dark:text-cloud-100 font-black'
                                    : 'w-20 !py-1.5 rounded-xl border-slate-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-ink-900 dark:text-cloud-100 hover:border-orange-400 focus:border-[#ea580c]'
                                }`}
                              />
                            </div>

                            {cartItem?.type === 'amount' && (
                              <button
                                onClick={() => handleClearSelection(p)}
                                className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-ink-700 text-ink-700 dark:text-cloud-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors shrink-0 shadow-sm"
                                title="Clear / Reset"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Sticky Floating WhatsApp Order Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-16 left-0 right-0 max-w-lg mx-auto px-4 z-40 animate-slideUp">
          <div className="p-3.5 rounded-3xl bg-[#ea580c] text-white shadow-2xl backdrop-blur-xl flex items-center justify-between border border-orange-400/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <ShoppingCart size={20} />
              </div>
              <div>
                <p className="font-extrabold text-sm text-white">
                  {cartItemCount} Items Selected
                </p>
                <p className="text-xs text-orange-100 font-medium">
                  {cartTotalPrice > 0
                    ? `Estimated Total: ₹${cartTotalPrice.toLocaleString('en-IN')}`
                    : 'Ready to Order on WhatsApp'}
                </p>
              </div>
            </div>

            <button
              onClick={handleSendWhatsAppOrder}
              className="py-2.5 px-4 rounded-2xl bg-[#25D366] text-white font-black text-xs flex items-center gap-1.5 shadow-lg hover:bg-[#20bd5a] active:scale-95 transition-transform shrink-0"
            >
              <MessageCircle size={16} /> Buy on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
