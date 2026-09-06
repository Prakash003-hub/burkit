import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Check, Eye, Edit3, Trash2, X, Phone, Calendar, AlertTriangle,
  Search, Loader2, Store, Package, MapPin, CheckCircle, ShieldAlert
} from 'lucide-react';
import api from '../api/api.js';
import Loader from '../components/Loader.jsx';

const STATUS_TABS = ['Pending', 'Approved', 'Rejected', 'Sold', 'All'];
const SHOP_STATUS_TABS = ['Pending', 'Approved', 'Rejected', 'All'];

const STATUS_STYLE = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
  Approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300',
  Sold: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
};

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('products'); // 'products' | 'shops'
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4500);
  }

  // Delete modal state
  const [deleteProductTarget, setDeleteProductTarget] = useState(null);
  const [deleteShopTarget, setDeleteShopTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    setError('');

    if (viewMode === 'products') {
      const params = activeTab === 'Pending'
        ? { status: 'Pending' }
        : activeTab === 'All'
          ? { status: 'all' }
          : { status: activeTab };

      api.getProducts(params)
        .then((data) => setProducts(Array.isArray(data) ? data : []))
        .catch((err) => {
          console.error('AdminDashboard error:', err);
          setError(err.message || 'Failed to load products');
          setProducts([]);
        })
        .finally(() => setLoading(false));
    } else {
      const params = activeTab === 'Pending'
        ? { status: 'Pending' }
        : activeTab === 'All'
          ? { status: 'all' }
          : { status: activeTab };

      api.getShops(params)
        .then((data) => setShops(Array.isArray(data) ? data : []))
        .catch((err) => {
          console.error('AdminDashboard shops error:', err);
          setError(err.message || 'Failed to load shops');
          setShops([]);
        })
        .finally(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, [viewMode, activeTab]);

  // Product Actions
  async function handleApprove(id) {
    setBusyId(id);
    try {
      await api.approveProduct(id);
      showToast('✅ Product Approved successfully! Moved to "Approved" tab.');
      load();
    } catch (err) {
      alert(err.message || 'Failed to approve product');
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id) {
    setBusyId(id);
    try {
      await api.rejectProduct(id);
      showToast('❌ Product Rejected. Moved to "Rejected" tab.');
      load();
    } catch (err) {
      alert(err.message || 'Failed to reject product');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDeleteProduct() {
    if (!deleteProductTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteProductTarget.productId);
      setDeleteProductTarget(null);
      showToast('🗑️ Product deleted.');
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  // Shop Actions
  async function handleApproveShop(shopId) {
    setBusyId(shopId);
    try {
      await api.approveShop(shopId);
      showToast('✅ Shop Approved successfully! Moved to "Approved" tab.');
      load();
    } catch (err) {
      alert(err.message || 'Failed to approve shop');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRejectShop(shopId) {
    setBusyId(shopId);
    try {
      await api.rejectShop(shopId);
      showToast('❌ Shop Rejected. Moved to "Rejected" tab.');
      load();
    } catch (err) {
      alert(err.message || 'Failed to reject shop');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDeleteShop() {
    if (!deleteShopTarget) return;
    setDeleting(true);
    try {
      await api.deleteShop(deleteShopTarget.shopId);
      setDeleteShopTarget(null);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete shop');
    } finally {
      setDeleting(false);
    }
  }

  const productList = Array.isArray(products) ? products : [];
  const filteredProducts = productList.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.productName || '').toLowerCase().includes(q) ||
      (p.sellerName || '').toLowerCase().includes(q) ||
      (p.sellerMobile || '').includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  });

  const shopList = Array.isArray(shops) ? shops : [];
  const filteredShops = shopList.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.shopName || '').toLowerCase().includes(q) ||
      (s.ownerName || '').toLowerCase().includes(q) ||
      (s.whatsappNo || '').includes(q) ||
      (s.villageName || '').toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display font-bold text-xl">Admin Dashboard</h1>
            <p className="text-xs text-ink-700/50 dark:text-cloud-100/50">Manage Marketplace & Shops Directory</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin/categories')}
          className="btn-secondary py-2 px-3 text-xs flex items-center gap-1.5 shadow-sm"
        >
          Categories
        </button>
      </div>

      {toast && (
        <div className="mx-4 mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold rounded-xl flex items-center justify-between transition-all animate-fade-in">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Main View Mode Switcher (Products vs Shops) */}
      <div className="px-4 mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => { setViewMode('products'); setActiveTab('Pending'); }}
          className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${
            viewMode === 'products'
              ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-md'
              : 'card text-ink-700 dark:text-cloud-100'
          }`}
        >
          <Package size={16} /> Marketplace Items
        </button>

        <button
          onClick={() => { setViewMode('shops'); setActiveTab('Pending'); }}
          className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2 border transition-all ${
            viewMode === 'shops'
              ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-md'
              : 'card text-ink-700 dark:text-cloud-100'
          }`}
        >
          <Store size={16} /> Manage Shops
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="px-4 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(viewMode === 'products' ? STATUS_TABS : SHOP_STATUS_TABS).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-[#ea580c] text-white shadow-md'
                : 'card text-ink-700 dark:text-cloud-100/70 hover:bg-cloud-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="px-4 mt-3">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-ink-700/40 dark:text-cloud-100/40" />
          <input
            type="text"
            placeholder={viewMode === 'products' ? 'Search product, seller or mobile...' : 'Search shop name, village or WhatsApp...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9 text-xs py-2.5"
          />
        </div>
      </div>

      {/* PRODUCTS VIEW */}
      {viewMode === 'products' && (
        <div className="px-4 mt-4 space-y-3">
          {loading ? (
            <Loader />
          ) : error ? (
            <div className="card p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle size={20} />
              </div>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>
              <button onClick={load} className="btn-secondary py-1.5 px-4 text-xs font-semibold">
                Retry Loading
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
              No products found for status: <span className="font-semibold">{activeTab}</span>.
            </div>
          ) : (
            filteredProducts.map((p) => {
              const image = (p.imageUrls || '').split(',')[0];
              const isBusy = busyId === p.productId;
              return (
                <div key={p.productId} className="card p-3.5 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0 relative">
                      {image ? (
                        <img src={image} alt={p.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-ink-700/40">No Image</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-sm truncate">{p.productName}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLE[p.status] || 'card'}`}>
                          {p.status}
                        </span>
                      </div>

                      <p className="text-xs text-ink-700/50 dark:text-cloud-100/50 mt-0.5 truncate">
                        {p.category} · {p.district}{p.area ? `, ${p.area}` : ''}
                      </p>

                      {p.price && (
                        <p className="text-[#ea580c] font-bold text-sm mt-1">
                          ₹{Number(p.price).toLocaleString('en-IN')}
                        </p>
                      )}

                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-700/70 dark:text-cloud-100/70 truncate">
                        <Phone size={12} className="shrink-0 text-[#ea580c]" />
                        <span className="font-medium">{p.sellerName || 'Seller'}</span>
                        <a href={`tel:${p.sellerMobile}`} className="text-[#ea580c] underline font-mono text-[11px]">
                          ({p.sellerMobile})
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex flex-wrap gap-1.5 items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/product/${p.productId}`)}
                        className="px-2.5 py-1.5 rounded-lg card text-xs font-semibold flex items-center gap-1 hover:bg-cloud-200"
                      >
                        <Eye size={13} /> View
                      </button>

                      <button
                        onClick={() => navigate(`/edit-product/${p.productId}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1 hover:bg-blue-100"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.status !== 'Approved' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleApprove(p.productId)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#ea580c] text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check size={13} /> Approve
                        </button>
                      )}

                      {p.status !== 'Rejected' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleReject(p.productId)}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <X size={13} /> Reject
                        </button>
                      )}

                      <button
                        disabled={isBusy}
                        onClick={() => setDeleteProductTarget(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 hover:bg-rose-100"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SHOPS VIEW */}
      {viewMode === 'shops' && (
        <div className="px-4 mt-4 space-y-3">
          {loading ? (
            <Loader />
          ) : error ? (
            <div className="card p-6 text-center space-y-3">
              <p className="text-xs font-semibold text-rose-600">{error}</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-700/50">
              No shops found for status: <span className="font-semibold">{activeTab}</span>.
            </div>
          ) : (
            filteredShops.map((s) => {
              const isBusy = busyId === s.shopId;
              return (
                <div key={s.shopId} className="card p-3.5 space-y-3">
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0 relative">
                      {s.shopPhoto ? (
                        <img src={s.shopPhoto} alt={s.shopName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#ea580c] bg-orange-50 dark:bg-ink-900">
                          <Store size={26} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-sm truncate">{s.shopName}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${STATUS_STYLE[s.status] || 'card'}`}>
                          {s.status}
                        </span>
                      </div>

                      <p className="text-xs text-ink-700/60 mt-0.5">
                        Category: <span className="font-bold text-[#ea580c]">{s.category}</span>
                      </p>

                      <div className="flex items-center gap-1 text-xs text-ink-700/70 mt-1">
                        <MapPin size={12} className="text-[#ea580c]" />
                        <span className="truncate">{s.villageName || 'Burkitmanagaram'}</span>
                      </div>

                      <div className="mt-1 flex items-center gap-1 text-xs text-ink-700/70 font-mono">
                        <Phone size={12} className="text-[#ea580c]" />
                        <span>Owner: {s.ownerName} ({s.whatsappNo})</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => navigate(`/shop/${s.shopId}`)}
                        className="px-2.5 py-1.5 rounded-lg card text-xs font-semibold flex items-center gap-1 hover:bg-cloud-200"
                      >
                        <Eye size={13} /> View
                      </button>

                      <button
                        onClick={() => navigate(`/edit-shop/${s.shopId}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-orange-50 text-[#ea580c] text-xs font-semibold flex items-center gap-1 hover:bg-orange-100"
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {s.status !== 'Approved' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleApproveShop(s.shopId)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#ea580c] text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <Check size={13} /> Approve
                        </button>
                      )}

                      {s.status !== 'Rejected' && (
                        <button
                          disabled={isBusy}
                          onClick={() => handleRejectShop(s.shopId)}
                          className="px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <X size={13} /> Reject
                        </button>
                      )}

                      <button
                        disabled={isBusy}
                        onClick={() => setDeleteShopTarget(s)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1 hover:bg-rose-100"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteProductTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-sm p-5 space-y-4 shadow-2xl rounded-2xl">
            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg">Delete Product?</h3>
              <p className="text-xs text-ink-700/70">
                Are you sure you want to delete <span className="font-semibold">"{deleteProductTarget.productName}"</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteProductTarget(null)} className="flex-1 btn-secondary text-xs py-2.5 font-semibold">
                Cancel
              </button>
              <button onClick={confirmDeleteProduct} className="flex-1 bg-rose-600 text-white rounded-xl text-xs py-2.5 font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Shop Confirmation Modal */}
      {deleteShopTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-sm p-5 space-y-4 shadow-2xl rounded-2xl">
            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg">Delete Shop?</h3>
              <p className="text-xs text-ink-700/70">
                Are you sure you want to delete shop <span className="font-semibold">"{deleteShopTarget.shopName}"</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setDeleteShopTarget(null)} className="flex-1 btn-secondary text-xs py-2.5 font-semibold">
                Cancel
              </button>
              <button onClick={confirmDeleteShop} className="flex-1 bg-rose-600 text-white rounded-xl text-xs py-2.5 font-semibold">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
