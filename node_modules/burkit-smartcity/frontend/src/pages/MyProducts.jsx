import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlusCircle, Trash2, Pencil, AlertTriangle, Loader2 } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';

const STATUS_STYLE = {
  Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
  Approved: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300',
  Rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300',
  Sold: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
};

export default function MyProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    api
      .getProducts({ sellerId: user.userId, status: 'all' })
      .then(setProducts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, [user.userId]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteProduct(deleteTarget.productId);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <h1 className="font-display font-bold text-xl">My Products</h1>
        </div>
        <button onClick={() => navigate('/add-product')} className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center">
          <PlusCircle size={18} />
        </button>
      </div>

      <div className="px-5 mt-4 space-y-3 pb-6">
        {loading ? (
          <Loader />
        ) : products.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
            You haven't listed anything yet.
          </div>
        ) : (
          products.map((p) => {
            const image = (p.imageUrls || '').split(',')[0];
            return (
              <div key={p.productId} className="card p-3 flex gap-3">
                <div className="w-20 h-20 rounded-xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0">
                  {image && <img src={image} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm truncate">{p.productName}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${STATUS_STYLE[p.status] || ''}`}>{p.status}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    {p.price ? (
                      <p className="text-[#ea580c] font-semibold text-sm">
                        ₹{Number(p.price).toLocaleString('en-IN')}
                      </p>
                    ) : <span />}
                    <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
                      ❤️ {p.likeCount || 0}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => navigate(`/edit-product/${p.productId}`)} className="flex items-center gap-1 text-xs font-medium text-ink-700 dark:text-cloud-100/70">
                      <Pencil size={12} /> Edit
                    </button>
                    <button onClick={() => setDeleteTarget(p)} className="flex items-center gap-1 text-xs font-medium text-red-500">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-sm p-5 space-y-4 shadow-2xl rounded-2xl border border-cloud-200 dark:border-ink-700">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg">Delete Product?</h3>
              <p className="text-xs text-ink-700/70 dark:text-cloud-100/70">
                Are you sure you want to delete <span className="font-semibold text-ink-900 dark:text-white">"{deleteTarget.productName}"</span>?
                This action will remove the product permanently.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 btn-secondary text-xs py-2.5 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 bg-rose-600 text-white rounded-xl text-xs py-2.5 font-semibold flex items-center justify-center gap-1.5 shadow-md hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
