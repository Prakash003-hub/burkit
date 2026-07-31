import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, Search, PlusCircle, MapPin, Phone, MessageCircle,
  Heart, Share2, Store, Sparkles, User, ChevronRight
} from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { SHOP_CATEGORIES } from '../data/groceryDefaults.js';
import { BURKIT_AREAS, matchArea } from '../data/areaDefaults.js';
import { openDirectWhatsApp } from '../utils/whatsapp.js';

export default function Shops() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedArea, setSelectedArea] = useState(
    user?.area || user?.villageName || BURKIT_AREAS[9]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [likedMap, setLikedMap] = useState({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api.getShops({ status: 'Approved' })
      .then((data) => {
        if (!mounted) return;
        setShops(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error('Error loading shops:', err))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  async function handleLikeShop(e, shop) {
    e.stopPropagation();
    if (!user) return alert('Please log in to like shops');
    try {
      const res = await api.toggleShopLike(shop.shopId, user.userId);
      setLikedMap((prev) => ({ ...prev, [shop.shopId]: res.liked }));
      setShops((prev) =>
        prev.map((s) => (s.shopId === shop.shopId ? { ...s, likeCount: res.likeCount } : s))
      );
    } catch (err) {
      console.error(err);
    }
  }

  function handleShareShop(e, shop) {
    e.stopPropagation();
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

  const filteredShops = shops.filter((shop) => {
    const matchesCategory =
      activeCategory === 'All' ||
      String(shop.category).toLowerCase() === activeCategory.toLowerCase();

    if (!matchesCategory) return false;

    const matchesArea = matchArea(shop.villageName, selectedArea);
    if (!matchesArea) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (shop.shopName || '').toLowerCase().includes(q) ||
      (shop.villageName || '').toLowerCase().includes(q) ||
      (shop.category || '').toLowerCase().includes(q) ||
      (shop.ownerName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="pb-12">
      {/* Top Banner Header */}
      <div className="mx-4 mt-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#27272a] text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-2 shadow-md shrink-0 flex items-center justify-center text-[#ea580c]">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-white tracking-tight leading-tight">
              Shops Directory
            </h1>
            <p className="text-xs text-orange-100/90 font-semibold mt-0.5">
              ஊரின் கடைகள் & சேவைகள் (Burkitmanagaram)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/my-shops')}
            className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-bold text-white shadow-sm transition-all shrink-0"
          >
            My Shops
          </button>
          <button
            onClick={() => navigate('/add-shop')}
            className="px-3 py-1.5 rounded-xl bg-white text-[#ea580c] text-xs font-extrabold flex items-center gap-1 shadow-md hover:bg-orange-50 transition-all shrink-0"
          >
            <PlusCircle size={14} /> Add Shop
          </button>
        </div>
      </div>

      {/* Area / Village Selection Filter Header */}
      <div className="px-4 mb-3">
        <div className="card p-3 rounded-2xl flex items-center justify-between gap-2 shadow-sm border border-slate-200 dark:border-ink-700 bg-white dark:bg-ink-800">
          <div className="flex items-center gap-2 text-xs font-bold text-ink-900 dark:text-cloud-100 shrink-0">
            <MapPin size={16} className="text-[#ea580c]" />
            <span>பகுதி (Area):</span>
          </div>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="input text-xs font-extrabold !py-1.5 !px-2.5 rounded-xl bg-cloud-100 dark:bg-ink-700 text-ink-900 dark:text-cloud-100 border-none hover:border-orange-400 cursor-pointer max-w-[230px] truncate"
          >
            {isAdmin && <option value="All">🌐 All Areas (அனைத்து பகுதிகள்)</option>}
            {BURKIT_AREAS.map((a) => (
              <option key={a} value={a}>
                📍 {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shop Category Filters */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border shrink-0 ${
              activeCategory === 'All'
                ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                : 'card text-ink-700 dark:text-cloud-100'
            }`}
          >
            All Shops
          </button>
          {SHOP_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all border shrink-0 ${
                activeCategory === cat
                  ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                  : 'card text-ink-700 dark:text-cloud-100 hover:border-orange-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 mb-4">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3.5 text-ink-700/40 dark:text-cloud-100/40" />
          <input
            type="text"
            placeholder="Search by Shop Name, Village (ஊரின் பெயர்) or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10 text-xs py-3"
          />
        </div>
      </div>

      {/* Main Shops Listing */}
      <div className="px-4 space-y-3.5">
        {loading ? (
          <Loader />
        ) : filteredShops.length === 0 ? (
          <div className="card p-8 text-center space-y-3 bg-cloud-50 dark:bg-ink-800/60">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 text-[#ea580c] mx-auto flex items-center justify-center">
              <Store size={26} />
            </div>
            <p className="text-sm font-bold text-ink-900 dark:text-cloud-100">
              No shops found for "{activeCategory}"
            </p>
            <p className="text-xs text-ink-700/60 dark:text-cloud-100/60">
              Be the first to register a shop in your village!
            </p>
            <button
              onClick={() => navigate('/add-shop')}
              className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <PlusCircle size={15} /> Register New Shop
            </button>
          </div>
        ) : (
          filteredShops.map((shop) => {
            const isLiked = likedMap[shop.shopId];
            return (
              <div
                key={shop.shopId}
                onClick={() => navigate(`/shop/${shop.shopId}`)}
                className="card p-4 flex flex-col gap-3 cursor-pointer hover:border-orange-500/40 transition-all active:scale-[0.99] group relative"
              >
                <div className="flex gap-3.5">
                  {/* Shop Image */}
                  <div className="w-24 h-24 rounded-2xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0 relative shadow-sm">
                    {shop.shopPhoto ? (
                      <img
                        src={shop.shopPhoto}
                        alt={shop.shopName}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-orange-500/60 bg-orange-50 dark:bg-ink-800 p-2 text-center">
                        <Store size={26} />
                        <span className="text-[9px] font-bold mt-1 text-ink-700/60">No Photo</span>
                      </div>
                    )}
                    <span className="absolute top-1 left-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-[#ea580c] text-white shadow">
                      {shop.category}
                    </span>
                  </div>

                  {/* Shop Information */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <h2 className="font-display font-bold text-base text-ink-900 dark:text-cloud-100 leading-snug group-hover:text-[#ea580c] transition-colors truncate">
                        {shop.shopName}
                      </h2>
                      {shop.description && (
                        <p className="text-xs text-ink-700/70 dark:text-cloud-100/70 mt-0.5 line-clamp-2 leading-relaxed">
                          {shop.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-ink-800 dark:text-cloud-100 font-semibold">
                        <MapPin size={14} className="text-[#ea580c] shrink-0" />
                        <span className="truncate">{shop.streetName ? `${shop.streetName}, ` : ''}{shop.villageName || 'பர்கிட் மாநகரம்'}</span>
                      </div>

                      {shop.ownerName && (
                        <div className="flex items-center gap-1.5 text-[11px] text-ink-700/60 dark:text-cloud-100/60">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">Owner: {shop.ownerName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Card Action Bar */}
                <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleLikeShop(e, shop)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                        isLiked
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40'
                          : 'bg-cloud-100 dark:bg-ink-800 text-ink-700 dark:text-cloud-100 hover:text-rose-500'
                      }`}
                    >
                      <Heart size={14} className={isLiked ? 'fill-rose-500 text-rose-500' : ''} />
                      <span>{shop.likeCount || 0}</span>
                    </button>

                    <button
                      onClick={(e) => handleShareShop(e, shop)}
                      className="px-2.5 py-1 rounded-xl bg-cloud-100 dark:bg-ink-800 text-ink-700 dark:text-cloud-100 hover:bg-cloud-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Share2 size={13} /> Share
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDirectWhatsApp(shop.whatsappNo, `வணக்கம்! ${shop.shopName} கடை பற்றி விவரம் அறிய தொடர்பு கொள்கிறேன்.`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-[#20bd5a]"
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </button>

                    <button className="px-3 py-1.5 rounded-xl bg-[#ea580c] text-white text-xs font-bold flex items-center gap-1 shadow-sm group-hover:bg-orange-700">
                      View Shop <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
