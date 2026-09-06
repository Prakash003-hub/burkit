import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, MapPin, Sparkles, Flame, Clock } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ProductCard from '../components/ProductCard.jsx';
import CategoryPill from '../components/CategoryPill.jsx';
import Loader from '../components/Loader.jsx';
import Header from '../components/Header.jsx';

import { BURKIT_AREAS, matchArea } from '../data/areaDefaults.js';

export default function Market() {
  const { user, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userLikedIds, setUserLikedIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [selectedArea, setSelectedArea] = useState('All');
  const [district, setDistrict] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'popular'
  const [showDistrictFilter, setShowDistrictFilter] = useState(false);

  useEffect(() => {
    api.getCategoriesSWR(setCategories)
      .then((initialCats) => {
        if (initialCats && Array.isArray(initialCats)) setCategories(initialCats);
      })
      .catch(() => {});

    if (user?.userId) {
      api.getUserLikes(user.userId).then(setUserLikedIds).catch(() => {});
    }
  }, [user?.userId]);

  useEffect(() => {
    let mounted = true;
    const params = { sortBy };
    if (query) params.q = query;
    if (category) params.category = category;
    if (district) params.district = district;

    api.getProductsSWR(params, (freshProducts) => {
      if (mounted && Array.isArray(freshProducts)) {
        setProducts(freshProducts);
      }
    })
      .then((initial) => {
        if (!mounted) return;
        if (Array.isArray(initial) && initial.length > 0) {
          setProducts(initial);
          setLoading(false);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [query, category, district, sortBy]);

  const isJobOrService = (name) => ['jobs', 'services'].includes(String(name || '').trim().toLowerCase());

  const marketCategories = useMemo(
    () => categories.filter((c) => !isJobOrService(c.categoryName)),
    [categories]
  );

  const marketProducts = useMemo(
    () => products.filter((p) => !isJobOrService(p.category) && matchArea(p.area, selectedArea)),
    [products, selectedArea]
  );

  const districts = useMemo(
    () => Array.from(new Set(marketProducts.map((p) => p.district).filter(Boolean))),
    [marketProducts]
  );

  return (
    <div className="pb-10">
      <Header title="BurKIt Smartcity" subtitle="Market — Find items for sale in your area" />

      {/* Area Selection Filter Bar */}
      <div className="px-5 mb-3">
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
            <option value="All">🌐 All Areas (அனைத்து பகுதிகள்)</option>
            {BURKIT_AREAS.map((a) => (
              <option key={a} value={a}>
                📍 {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search & Location Filter Bar */}
      <div className="px-5 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 input shadow-sm">
          <Search size={16} className="text-ink-700/40" />
          <input
            className="flex-1 bg-transparent outline-none text-sm"
            placeholder="Search products, brands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-ink-700/40 hover:text-ink-900">
              <X size={14} />
            </button>
          )}
        </div>

        {districts.length > 0 && (
          <button
            onClick={() => setShowDistrictFilter((s) => !s)}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              district ? 'bg-[#ea580c] text-white shadow-md' : 'card text-ink-700/70 dark:text-cloud-100/70 hover:bg-cloud-200'
            }`}
            title="Filter by District"
          >
            <MapPin size={18} />
          </button>
        )}
      </div>

      {/* Location Filter Chips */}
      {showDistrictFilter && districts.length > 0 && (
        <div className="px-5 mt-3 animate-fadeIn">
          <p className="text-[11px] font-bold text-ink-700/50 dark:text-cloud-100/50 mb-1.5 uppercase tracking-wider">
            Filter by District
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setDistrict('')}
              className={`chip text-xs px-3 py-1 rounded-full border transition-all ${
                !district ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'card text-ink-700 dark:text-cloud-100'
              }`}
            >
              All Districts
            </button>
            {districts.map((d) => (
              <button
                key={d}
                onClick={() => setDistrict(d)}
                className={`chip text-xs px-3 py-1 rounded-full border transition-all ${
                  district === d ? 'bg-[#ea580c] text-white border-[#ea580c]' : 'card text-ink-700 dark:text-cloud-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category Icons Horizontal Scrollbar */}
      <div className="mt-3">
        <div className="flex items-center gap-4 overflow-x-auto px-5 py-2 scrollbar-none">
          <CategoryPill
            category={{ categoryName: 'All', icon: 'grid' }}
            active={!category}
            onClick={() => {
              setCategory('');
              setSearchParams({});
            }}
          />
          {marketCategories.map((c) => (
            <CategoryPill
              key={c.categoryId}
              category={c}
              active={category === c.categoryName}
              onClick={() => {
                const nextCat = category === c.categoryName ? '' : c.categoryName;
                setCategory(nextCat);
                if (nextCat) {
                  setSearchParams({ category: nextCat });
                } else {
                  setSearchParams({});
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Filter Tabs: Latest Updated vs Top Liked Popular */}
      <div className="px-5 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 bg-cloud-200 dark:bg-ink-800 p-1 rounded-xl">
          <button
            onClick={() => setSortBy('latest')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              sortBy === 'latest'
                ? 'bg-white dark:bg-ink-700 text-[#ea580c] shadow-sm'
                : 'text-ink-700/60 dark:text-cloud-100/60 hover:text-ink-900'
            }`}
          >
            <Clock size={13} /> Recently Updated
          </button>
          <button
            onClick={() => setSortBy('popular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              sortBy === 'popular'
                ? 'bg-[#ea580c] text-white shadow-sm'
                : 'text-ink-700/60 dark:text-cloud-100/60 hover:text-ink-900'
            }`}
          >
            <Flame size={13} /> Top Liked 🔥
          </button>
        </div>

        <span className="text-xs font-medium text-ink-700/50 dark:text-cloud-100/50">
          {marketProducts.length} items
        </span>
      </div>

      {/* Active Filter Indicators */}
      {(category || district || query) && (
        <div className="px-5 mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-700/50 dark:text-cloud-100/50">Active filters:</span>
          {category && (
            <span className="chip text-[11px] bg-[#ea580c]/10 text-[#ea580c] font-bold flex items-center gap-1">
              Category: {category}
              <button onClick={() => setCategory('')}><X size={12} /></button>
            </span>
          )}
          {district && (
            <span className="chip text-[11px] bg-[#ea580c]/10 text-[#ea580c] font-bold flex items-center gap-1">
              District: {district}
              <button onClick={() => setDistrict('')}><X size={12} /></button>
            </span>
          )}
          {query && (
            <span className="chip text-[11px] bg-[#ea580c]/10 text-[#ea580c] font-bold flex items-center gap-1">
              Query: "{query}"
              <button onClick={() => setQuery('')}><X size={12} /></button>
            </span>
          )}
        </div>
      )}

      {/* Product Grid */}
      <div className="px-5 mt-4">
        {loading ? (
          <Loader />
        ) : marketProducts.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
            No products match your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 pb-4">
            {marketProducts.map((p) => (
              <ProductCard
                key={p.productId}
                product={p}
                isLiked={userLikedIds.includes(String(p.productId))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
