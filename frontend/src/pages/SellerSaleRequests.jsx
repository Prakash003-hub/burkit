import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Phone, CheckCircle, XCircle, Calendar, Package, Search } from 'lucide-react';
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

export default function SellerSaleRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  function load() {
    setLoading(true);
    api.getSaleRequests({ sellerId: user.userId })
      .then(setRequests)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user?.userId) load();
  }, [user?.userId]);

  async function handleUpdateStatus(req, newStatus) {
    setUpdatingId(req.requestId);
    try {
      await api.updateSaleRequestStatus(req.requestId, newStatus, req.productId);
      load();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = requests.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.productName || '').toLowerCase().includes(q) ||
      (r.buyerName || '').toLowerCase().includes(q) ||
      (r.buyerMobile || '').includes(q)
    );
  });

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl">My Sale Requests</h1>
          <p className="text-xs text-ink-700/50 dark:text-cloud-100/50">Buyer enquiries for your products</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-5 mt-3">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-ink-700/40 dark:text-cloud-100/40" />
          <input
            type="text"
            placeholder="Search buyer name, mobile, product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <Loader />
        ) : filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
            No sale requests received yet.
          </div>
        ) : (
          filtered.map((req) => {
            const isBusy = updatingId === req.requestId;
            return (
              <div key={req.requestId} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                      <Package size={12} /> {req.productName}
                    </span>
                    <h3 className="font-bold text-base mt-0.5">{req.buyerName || 'Buyer'}</h3>
                    <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 font-mono">
                      +91 {req.buyerMobile}
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
                <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex flex-wrap gap-2 items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openDirectWhatsApp(req.buyerMobile, `வணக்கம் ${req.buyerName || ''}, நீங்கள் கேட்ட ${req.productName} பொருள் பற்றிய விவரத்திற்கு தொடர்பு கொள்கிறேன்.`)}
                      className="px-3 py-1.5 rounded-xl bg-[#25D366] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-[#20bd5a]"
                    >
                      <MessageCircle size={14} /> Open WhatsApp
                    </button>

                    <a
                      href={`tel:${req.buyerMobile}`}
                      className="px-3 py-1.5 rounded-xl card text-ink-700 dark:text-cloud-100 text-xs font-semibold flex items-center gap-1.5 hover:bg-cloud-200"
                    >
                      <Phone size={14} /> Call
                    </a>
                  </div>

                  <div className="flex gap-1.5">
                    {req.status !== 'Sold' && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(req, 'Sold')}
                        className="px-2.5 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle size={13} /> Mark Sold
                      </button>
                    )}

                    {req.status !== 'Cancelled' && (
                      <button
                        disabled={isBusy}
                        onClick={() => handleUpdateStatus(req, 'Cancelled')}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <XCircle size={13} /> Cancel
                      </button>
                    )}
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

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
