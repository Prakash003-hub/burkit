import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, XCircle, Calendar, Package, User } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { openDirectWhatsApp } from '../utils/whatsapp.js';

const STATUS_STYLE = {
  New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300',
  Contacted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
  Sold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300',
  Cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300',
};

export default function BuyerPurchaseRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  function load() {
    setLoading(true);
    api.getSaleRequests({ buyerId: user.userId })
      .then(setRequests)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.userId) load();
  }, [user?.userId]);

  async function handleCancelRequest(req) {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    setUpdatingId(req.requestId);
    try {
      await api.updateSaleRequestStatus(req.requestId, 'Cancelled');
      load();
    } catch (err) {
      alert(err.message || 'Failed to cancel request');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl">My Purchase Requests</h1>
          <p className="text-xs text-ink-700/50 dark:text-cloud-100/50">Your product enquiries sent to sellers</p>
        </div>
      </div>

      {/* List */}
      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <Loader />
        ) : requests.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
            You haven't sent any buy enquiries yet. Browse the Market to contact sellers!
          </div>
        ) : (
          requests.map((req) => {
            const isBusy = updatingId === req.requestId;
            return (
              <div key={req.requestId} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-1.5">
                      <Package size={16} className="text-brand-600 shrink-0" />
                      {req.productName}
                    </h3>
                    <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 mt-1 flex items-center gap-1">
                      <User size={12} /> Seller: <span className="font-medium text-ink-900 dark:text-white">{req.sellerName || 'Seller'}</span>
                    </p>
                  </div>

                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border shrink-0 ${STATUS_STYLE[req.status] || 'card'}`}>
                    {req.status}
                  </span>
                </div>

                {req.createdAt && (
                  <div className="flex items-center gap-1 text-[11px] text-ink-700/40 dark:text-cloud-100/40">
                    <Calendar size={11} />
                    <span>Requested on {formatDate(req.createdAt)}</span>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openDirectWhatsApp(req.sellerMobile, req.message || `Hello ${req.sellerName || ''}, regarding ${req.productName}`)}
                    className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-[#20bd5a]"
                  >
                    <MessageCircle size={14} /> Open WhatsApp Again
                  </button>

                  {req.status !== 'Cancelled' && (
                    <button
                      disabled={isBusy}
                      onClick={() => handleCancelRequest(req)}
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle size={13} /> Cancel Request
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
