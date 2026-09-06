import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Store, Pencil, Eye, Trash2, MapPin } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';

const STATUS_STYLE = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
  Approved: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300',
};

export default function MyShops() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.getShops({ ownerUserId: user?.userId, status: 'all' })
      .then((data) => setShops(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.userId) load();
  }, [user?.userId]);

  async function handleDeleteShop(shop) {
    if (!confirm(`Are you sure you want to delete "${shop.shopName}"?`)) return;
    try {
      await api.deleteShop(shop.shopId);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete shop');
    }
  }

  return (
    <div className="pb-12">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display font-bold text-xl">My Shops</h1>
            <p className="text-xs text-ink-700/60 dark:text-cloud-100/60">உங்கள் பதிவு செய்த கடைகள்</p>
          </div>
        </div>

        <button
          onClick={() => navigate('/add-shop')}
          className="w-9 h-9 rounded-full bg-[#ea580c] text-white flex items-center justify-center shadow-md"
        >
          <PlusCircle size={18} />
        </button>
      </div>

      {/* Shop List */}
      <div className="px-4 mt-4 space-y-3">
        {loading ? (
          <Loader />
        ) : shops.length === 0 ? (
          <div className="card p-8 text-center space-y-3 bg-cloud-50 dark:bg-ink-800">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 text-[#ea580c] mx-auto flex items-center justify-center">
              <Store size={24} />
            </div>
            <p className="text-sm font-bold text-ink-900 dark:text-cloud-100">
              You haven't registered any shop yet.
            </p>
            <button
              onClick={() => navigate('/add-shop')}
              className="btn-primary py-2 px-4 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <PlusCircle size={15} /> Add New Shop
            </button>
          </div>
        ) : (
          shops.map((shop) => (
            <div key={shop.shopId} className="card p-4 space-y-3 rounded-2xl">
              <div className="flex gap-3">
                <div className="w-20 h-20 rounded-2xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0">
                  {shop.shopPhoto ? (
                    <img src={shop.shopPhoto} alt={shop.shopName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#ea580c] bg-orange-50 dark:bg-ink-900">
                      <Store size={26} />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="font-bold text-sm truncate">{shop.shopName}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${STATUS_STYLE[shop.status] || ''}`}>
                      {shop.status}
                    </span>
                  </div>

                  <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 mt-0.5">
                    Category: <span className="font-semibold text-ink-900 dark:text-cloud-100">{shop.category}</span>
                  </p>

                  <div className="flex items-center gap-1 text-xs text-ink-700/70 dark:text-cloud-100/70 mt-1">
                    <MapPin size={13} className="text-[#ea580c]" />
                    <span className="truncate">{shop.streetName ? `${shop.streetName}, ` : ''}{shop.villageName || 'பர்கிட் மாநகரம்'}</span>
                  </div>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/shop/${shop.shopId}`)}
                  className="px-3 py-1.5 rounded-xl card text-xs font-bold flex items-center gap-1.5 hover:bg-cloud-200"
                >
                  <Eye size={14} /> View Storefront
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/edit-shop/${shop.shopId}`)}
                    className="px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-[#ea580c] text-xs font-bold flex items-center gap-1 hover:bg-orange-100"
                  >
                    <Pencil size={14} /> Edit & Items
                  </button>

                  <button
                    onClick={() => handleDeleteShop(shop)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
