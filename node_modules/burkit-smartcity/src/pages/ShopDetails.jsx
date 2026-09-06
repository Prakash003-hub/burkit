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
import { goBack } from '../utils/navigation.js';
import { getMergedShopProducts } from '../data/groceryDefaults.js';

function buildScaleOptions(product, isGrocery = true) {
  if (!isGrocery) {
    if (Array.isArray(product.availableScales) && product.availableScales.length > 0) {
      return { scaleUnits: product.availableScales };
    }
    if (typeof product.availableScales === 'string' && product.availableScales.trim()) {
      return { scaleUnits: product.availableScales.split(',').map((s) => s.trim()) };
    }
    return { scaleUnits: [product.unitScale || '1 Unit'] };
  }

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

  return { scaleUnits };
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

  // Local rate input values (not committed to cart until Enter/Blur)
  const [localRates, setLocalRates] = useState({});

  // Cart state: productId -> { type: 'scale'|'amount', scale: string, productName: string, tamilName: string, customAmount?: string }
  const [cart, setCart] = useState({});

  useEffect(() => {
    let mounted = true;

    // Load shop with SWR
    api.getShopSWR(id, (freshShop) => {
      if (mounted && freshShop) {
        setShop(freshShop);
        setLikeCount(Number(freshShop?.likeCount || 0));
      }
    })
      .then((initialShop) => {
        if (!mounted) return;
        if (initialShop) {
          setShop(initialShop);
          setLikeCount(Number(initialShop?.likeCount || 0));
          setLoading(false);
        }
      })
      .catch((err) => console.error('Error loading shop details:', err));

    // Load shop products with SWR
    api.getShopProductsSWR(id, (freshProducts) => {
      if (mounted && Array.isArray(freshProducts)) {
        setProducts(freshProducts);
      }
    })
      .then((initialProducts) => {
        if (!mounted) return;
        if (Array.isArray(initialProducts) && initialProducts.length > 0) {
          setProducts(initialProducts);
          setLoading(false);
        }
      })
      .catch((err) => console.error('Error loading shop products:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    if (user?.userId) {
      api.getUserLikes(user.userId).then((ids) => {
        if (mounted && Array.isArray(ids)) {
          setLiked(ids.includes(id));
        }
      }).catch(() => {});
    }

    return () => (mounted = false);
  }, [id, user?.userId]);

  async function handlePopulateDefaults() {
    if (!shop || !user) return;
    setPopulating(true);
    try {
      await api.populateShopDefaults(shop.shopId);
      const updatedProducts = await api.getShopProducts(shop.shopId);
      setProducts(Array.isArray(updatedProducts) ? updatedProducts : []);
    } catch (err) {
      console.error(err);
      alert('Failed to add default items: ' + err.message);
    } finally {
      setPopulating(false);
    }
  }

  async function handleLike() {
    if (!user) return alert('Please log in to like shops');
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
      text: `${shop.shopName} - ${shop.villageName || ''} (${shop.category})`,
      url: window.location.origin + `/shop/${shop.shopId}`,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert('Shop link copied to clipboard!');
    }
  }

  function handleSelectScale(product, scale) {
    if (!scale) return;
    setCart((prev) => ({
      ...prev,
      [product.productId]: {
        type: 'scale',
        scale: scale,
        productName: product.productName,
        tamilName: product.tamilName || product.productName,
      },
    }));
  }

  function handleRateChange(product, value) {
    // Only update the local input — do NOT commit to cart yet
    setLocalRates((prev) => ({ ...prev, [product.productId]: value }));
  }

  function handleCommitRate(product) {
    const value = localRates[product.productId];
    const num = Number(value);
    if (!value || isNaN(num) || num <= 0) {
      // Clear local value if invalid
      setLocalRates((prev) => { const c = { ...prev }; delete c[product.productId]; return c; });
      return;
    }
    // Commit to cart only now (on Enter or Blur)
    setCart((prev) => ({
      ...prev,
      [product.productId]: {
        type: 'amount',
        scale: `₹${num}`,
        customAmount: String(num),
        productName: product.productName,
        tamilName: product.tamilName || product.productName,
      },
    }));
    setLocalRates((prev) => { const c = { ...prev }; delete c[product.productId]; return c; });
  }

  function handleClearSelection(product) {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[product.productId];
      return copy;
    });
    setLocalRates((prev) => { const c = { ...prev }; delete c[product.productId]; return c; });
  }

  const cartItemCount = Object.keys(cart).length;

  function handleSendWhatsAppOrder() {
    if (cartItemCount === 0 || !shop) return;
    const itemsList = Object.values(cart)
      .map((item, index) => {
        const name = item.tamilName || item.productName;
        return `${index + 1}. *${name}* (${item.scale})`;
      })
      .join('\n');

    const text = `வணக்கம்! *${shop.shopName}*\n\nஎனக்கு பின்வரும் பொருட்கள் தேவை:\n\n${itemsList}\n\nநன்றி!`;
    openDirectWhatsApp(shop.whatsappNo, text);
  }

  const isGrocery = shop?.category === 'Grocery';

  // For Grocery shops, default items are supplied instantly from frontend and merged with any backend items.
  // For non-grocery shops, default grocery items are hidden.
  const visibleProducts = useMemo(() => {
    return getMergedShopProducts(id, shop?.category, products);
  }, [products, shop?.category, id]);

  const subCategories = useMemo(() => {
    const list = Array.from(
      new Set(visibleProducts.map((p) => p.subCategory).filter(Boolean))
    );
    return ['All', ...list];
  }, [visibleProducts]);

  const filteredProducts = useMemo(() => {
    return visibleProducts.filter((p) => {
      const matchesSub =
        activeSubCat === 'All' ||
        String(p.subCategory).toLowerCase() === activeSubCat.toLowerCase();
      if (!matchesSub) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.productName || '').toLowerCase().includes(q) ||
        (p.tamilName || '').toLowerCase().includes(q) ||
        (p.subCategory || '').toLowerCase().includes(q)
      );
    });
  }, [visibleProducts, activeSubCat, searchQuery]);

  const groupedProducts = useMemo(() => {
    const groups = {};
    filteredProducts.forEach((p) => {
      const sub = p.subCategory || 'General';
      if (!groups[sub]) groups[sub] = [];
      groups[sub].push(p);
    });
    return groups;
  }, [filteredProducts]);

  const isOwnerOrAdmin = user && (user.userId === shop?.ownerUserId || isAdmin);

  if (loading) return <Loader />;
  if (!shop) return <div className="p-8 text-center text-sm text-ink-700/50">Shop not found.</div>;

  return (
    <div className="pb-28">
      {/* Top Bar Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <button
          onClick={() => goBack(navigate, '/')}
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

      {/* Shop Profile Banner Card */}
      <div className="px-4 mb-4">
        <div className="card p-4 space-y-3.5 bg-gradient-to-br from-white to-cloud-100 dark:from-ink-800 dark:to-ink-900 border border-slate-200 dark:border-ink-700 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 overflow-hidden shrink-0 flex items-center justify-center font-bold text-2xl border border-orange-500/20 shadow-sm">
              {shop.shopPhoto ? (
                <img src={shop.shopPhoto} alt={shop.shopName} className="w-full h-full object-cover" />
              ) : (
                <Store size={32} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#ea580c]/10 text-[#ea580c] text-[10px] font-extrabold uppercase tracking-wide">
                  {shop.category}
                </span>
                {shop.status === 'Approved' && (
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-0.5 font-bold">
                    <CheckCircle size={12} /> Verified
                  </span>
                )}
              </div>

              <h1 className="font-display font-black text-lg text-ink-900 dark:text-cloud-100 leading-tight mt-1">
                {shop.shopName}
              </h1>

              <p className="text-xs text-ink-700/70 dark:text-cloud-100/70 flex items-center gap-1 mt-1">
                <MapPin size={13} className="text-[#ea580c] shrink-0" />
                <span className="truncate">{shop.streetName ? `${shop.streetName}, ` : ''}{shop.villageName}</span>
              </p>

              {shop.ownerName && (
                <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 mt-0.5">
                  Owner: {shop.ownerName}
                </p>
              )}
            </div>
          </div>

          {shop.description && (
            <p className="text-xs text-ink-700/80 dark:text-cloud-100/80 leading-relaxed pt-1 border-t border-slate-100 dark:border-ink-700">
              {shop.description}
            </p>
          )}

          {/* Action Contact Bar */}
          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => openDirectWhatsApp(shop.whatsappNo, `வணக்கம்! ${shop.shopName} பற்றிய தகவல் தேவை.`)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-[#20bd5a] transition-all"
            >
              <MessageCircle size={16} /> WhatsApp Order / Contact
            </button>
            <a
              href={`tel:${shop.whatsappNo}`}
              className="w-10 h-10 rounded-xl bg-cloud-200 dark:bg-ink-700 text-ink-900 dark:text-cloud-100 flex items-center justify-center hover:bg-cloud-300 shrink-0"
            >
              <Phone size={16} />
            </a>
          </div>
        </div>
      </div>

      {/* Subcategory Filter Tabs */}
      {subCategories.length > 1 && (
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {subCategories.map((sub) => (
              <button
                key={sub}
                onClick={() => setActiveSubCat(sub)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all border shrink-0 ${
                  activeSubCat === sub
                    ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                    : 'card text-ink-700 dark:text-cloud-100'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="px-4 mb-3">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-ink-700/40" />
          <input
            type="text"
            placeholder="Search items in this shop (e.g. தக்காளி, Tomato, Oil...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9 text-xs py-2.5"
          />
        </div>
      </div>

      {/* Row-wise Product List with Scale & Rate Selector */}
      <div className="px-4 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-ink-700/60 dark:text-cloud-100/60 font-bold px-1">
          <span>Available Items ({filteredProducts.length})</span>
          <span>{isGrocery ? 'Select Scale / Amount (அளவு / ரூபாய்)' : 'Price / Order (விலை / ஆர்டர்)'}</span>
        </div>

        {Object.keys(groupedProducts).length === 0 ? (
          isGrocery ? (
            <div className="card p-8 text-center text-xs text-ink-700/50 space-y-3">
              <p>No items available in this view.</p>
              {visibleProducts.length === 0 && (
                <button
                  disabled={populating}
                  onClick={handlePopulateDefaults}
                  className="btn-primary py-2.5 px-5 text-xs mx-auto flex items-center justify-center gap-2 shadow-md"
                >
                  <Sparkles size={16} /> Load Default Grocery Catalog (மளிகைப் பொருட்களைச் சேர்க்க)
                </button>
              )}
            </div>
          ) : (
            <div className="card p-6 text-center space-y-3 bg-cloud-50 dark:bg-ink-800 rounded-2xl border border-slate-200 dark:border-ink-700">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 text-[#ea580c] mx-auto flex items-center justify-center">
                <Store size={22} />
              </div>
              <h3 className="text-sm font-bold text-ink-900 dark:text-cloud-100">
                {shop.shopName} ({shop.category})
              </h3>
              <p className="text-xs text-ink-700/70 dark:text-cloud-100/70 max-w-sm mx-auto">
                {shop.description || 'இந்த கடை மற்றும் சேவைகள் பற்றிய தகவல்களுக்கு நேரடியாக தொடர்பு கொள்ளவும்.'}
              </p>
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => openDirectWhatsApp(shop.whatsappNo, `வணக்கம்! ${shop.shopName} பற்றிய தகவல்கள் தேவை.`)}
                  className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 shadow-md"
                >
                  <MessageCircle size={15} /> WhatsApp Contact
                </button>
                <a
                  href={`tel:${shop.whatsappNo}`}
                  className="btn-secondary py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Phone size={15} /> Call Now
                </a>
              </div>
            </div>
          )
        ) : (
          Object.entries(groupedProducts).map(([subCatName, subProducts]) => (
            <div key={subCatName} className="space-y-2 pt-2">
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
                const { scaleUnits } = buildScaleOptions(p, isGrocery);
                const priceNum = Number(p.price) || 0;

                return (
                  <div
                    key={p.productId}
                    className={`card p-3.5 flex items-center justify-between gap-3 transition-all rounded-2xl ${
                      isSelected ? 'border-[#ea580c] ring-1 ring-[#ea580c]/30 bg-orange-50/20 dark:bg-orange-950/20' : ''
                    }`}
                  >
                    {/* Product Name & Listed Rate */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-ink-900 dark:text-cloud-100 leading-snug">
                        {p.productName || p.tamilName}
                      </p>
                      {priceNum > 0 && (
                        <p className="text-xs text-[#ea580c] font-bold mt-0.5">
                          Rate: ₹{priceNum.toLocaleString('en-IN')}{p.unitScale ? ` / ${p.unitScale}` : ''}
                        </p>
                      )}
                    </div>

                    {/* Scale Selector / Rate Input Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {cartItem ? (
                        /* Selected Item Pill with Clear Button */
                        <div className="flex items-center gap-1.5 animate-fadeIn">
                          <span className="py-1.5 px-3 rounded-xl bg-[#ea580c] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md ring-2 ring-orange-500/40">
                            <span>{cartItem.scale}</span>
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
                        /* Scale Dropdown OR Direct Rate Typing Input */
                        <div className="flex items-center gap-2">
                          <select
                            value=""
                            onChange={(e) => handleSelectScale(p, e.target.value)}
                            className="input text-xs font-extrabold !py-1.5 !px-2.5 rounded-xl bg-white dark:bg-ink-700 text-ink-700 dark:text-cloud-100 border-slate-200 dark:border-ink-600 hover:border-orange-400 cursor-pointer shadow-sm"
                          >
                            <option value="">⚖️ Scale (அளவு)</option>
                            {scaleUnits.map((sc) => (
                              <option key={sc} value={sc} className="text-ink-900 dark:text-cloud-100 bg-white dark:bg-ink-800">
                                {sc}
                              </option>
                            ))}
                          </select>

                          {/* Direct Rate Typing Input — commits on Enter or Blur */}
                          <div className="relative flex items-center">
                            <span className="absolute left-2.5 font-black text-xs text-ink-700/50 dark:text-cloud-100/50">₹</span>
                            <input
                              type="number"
                              min="1"
                              placeholder="Rate ₹"
                              value={localRates[p.productId] || ''}
                              onChange={(e) => handleRateChange(p, e.target.value)}
                              onBlur={() => handleCommitRate(p)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.target.blur(); } }}
                              className="input !pl-6 text-xs font-bold transition-all shadow-sm w-20 !py-1.5 rounded-xl border-slate-200 dark:border-ink-600 bg-white dark:bg-ink-700 text-ink-900 dark:text-cloud-100 hover:border-orange-400 focus:border-[#ea580c]"
                            />
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

      {/* Floating WhatsApp Order Bar WITHOUT Estimated Total Price Math */}
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
                  Ready to Order on WhatsApp
                </p>
              </div>
            </div>

            <button
              onClick={handleSendWhatsAppOrder}
              className="py-2.5 px-4 rounded-2xl bg-[#25D366] text-white font-black text-xs flex items-center gap-1.5 shadow-lg hover:bg-[#20bd5a] active:scale-95 transition-transform shrink-0"
            >
              <MessageCircle size={16} /> Order on WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
