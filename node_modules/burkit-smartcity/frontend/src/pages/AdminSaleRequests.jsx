import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Eye, Edit3, Trash2, Search, Calendar, Phone, MessageCircle,
  AlertTriangle, Loader2, User, Package, Filter
} from 'lucide-react';
import api from '../api/api.js';
import Loader from '../components/Loader.jsx';
import { openDirectWhatsApp } from '../utils/whatsapp.js';

const STATUS_TABS = ['All', 'New', 'Contacted', 'Sold', 'Cancelled'];

const STATUS_STYLE = {
  New: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300',
  Contacted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300',
  Sold: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300',
  Cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300',
};

export default function AdminSaleRequests() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Modal states
  const [viewDetailsTarget, setViewDetailsTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    setError('');
    const params = activeTab === 'All' ? { status: 'all' } : { status: activeTab };
    api.getSaleRequests(params)
      .then((data) => setRequests(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('AdminSaleRequests error:', err);
        setError(err.message || 'Failed to load sale requests');
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [activeTab]);

  async function handleStatusChange(requestId, newStatus, productId) {
    setUpdatingId(requestId);
    try {
      await api.updateSaleRequestStatus(requestId, newStatus, productId);
      load();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteSaleRequest(deleteTarget.requestId);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete request');
    } finally {
      setDeleting(false);
    }
  }

  const requestList = Array.isArray(requests) ? requests : [];
  const filteredRequests = requestList.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.productName || '').toLowerCase().includes(q) ||
      (r.buyerName || '').toLowerCase().includes(q) ||
      (r.buyerMobile || '').includes(q) ||
      (r.sellerName || '').toLowerCase().includes(q) ||
      (r.sellerMobile || '').includes(q)
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
          <h1 className="font-display font-bold text-xl">Sale Requests Records</h1>
          <p className="text-xs text-ink-700/50 dark:text-cloud-100/50">Track & manage buyer WhatsApp enquiries</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab
                ? 'bg-brand-600 text-white shadow-md'
                : 'card text-ink-700 dark:text-cloud-100/70 hover:bg-cloud-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-5 mt-3">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-ink-700/40 dark:text-cloud-100/40" />
          <input
            type="text"
            placeholder="Search by Product, Buyer, or Seller..."
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
        ) : filteredRequests.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
            No sale requests found for status: <span className="font-semibold">{activeTab}</span>.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isBusy = updatingId === req.requestId;
            return (
              <div key={req.requestId} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                      <Package size={13} /> {req.productName}
                    </span>
                    <div className="mt-1 space-y-0.5 text-xs">
                      <p className="text-ink-700/80 dark:text-cloud-100/80">
                        <span className="font-semibold">Buyer:</span> {req.buyerName} ({req.buyerMobile})
                      </p>
                      <p className="text-ink-700/80 dark:text-cloud-100/80">
                        <span className="font-semibold">Seller:</span> {req.sellerName} ({req.sellerMobile})
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${STATUS_STYLE[req.status] || 'card'}`}>
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
                <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setViewDetailsTarget(req)}
                      className="px-2.5 py-1.5 rounded-lg card text-xs font-semibold flex items-center gap-1 hover:bg-cloud-200"
                    >
                      <Eye size={13} /> Details
                    </button>

                    <button
                      onClick={() => openDirectWhatsApp(req.buyerMobile)}
                      className="px-2.5 py-1.5 rounded-lg bg-[#25D366] text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                    >
                      <MessageCircle size={13} /> Chat
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status Selector */}
                    <select
                      disabled={isBusy}
                      value={req.status}
                      onChange={(e) => handleStatusChange(req.requestId, e.target.value, req.productId)}
                      className="text-xs font-semibold rounded-lg px-2 py-1 card border border-cloud-300 dark:border-ink-600 cursor-pointer"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Sold">Sold</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    <button
                      disabled={isBusy}
                      onClick={() => setDeleteTarget(req)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100"
                      title="Delete Request"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* View Details Modal */}
      {viewDetailsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-md p-5 space-y-4 shadow-2xl rounded-2xl border border-cloud-200 dark:border-ink-700">
            <h3 className="font-display font-bold text-lg border-b border-cloud-200 dark:border-ink-700 pb-2">
              Sale Request Details
            </h3>

            <div className="space-y-2 text-xs">
              <p><span className="font-bold text-ink-700/60">Request ID:</span> <code className="bg-cloud-200 dark:bg-ink-800 px-1.5 py-0.5 rounded">{viewDetailsTarget.requestId}</code></p>
              <p><span className="font-bold text-ink-700/60">Product:</span> {viewDetailsTarget.productName} (ID: {viewDetailsTarget.productId})</p>
              <p><span className="font-bold text-ink-700/60">Buyer:</span> {viewDetailsTarget.buyerName} (+91 {viewDetailsTarget.buyerMobile})</p>
              <p><span className="font-bold text-ink-700/60">Seller:</span> {viewDetailsTarget.sellerName} (+91 {viewDetailsTarget.sellerMobile})</p>
              <p><span className="font-bold text-ink-700/60">Status:</span> <span className="font-bold">{viewDetailsTarget.status}</span></p>
              <p><span className="font-bold text-ink-700/60">Request Date:</span> {formatDate(viewDetailsTarget.createdAt)}</p>

              {viewDetailsTarget.message && (
                <div className="mt-3 p-3 rounded-xl card bg-cloud-50 dark:bg-ink-800 space-y-1">
                  <p className="font-bold text-[11px] text-ink-700/50 uppercase">Formatted WhatsApp Message</p>
                  <p className="whitespace-pre-wrap font-mono text-[11px] text-ink-900 dark:text-cloud-100">{viewDetailsTarget.message}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewDetailsTarget(null)}
                className="btn-primary text-xs py-2 px-5 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-sm p-5 space-y-4 shadow-2xl rounded-2xl border border-cloud-200 dark:border-ink-700">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-display font-bold text-lg">Delete Sale Request?</h3>
              <p className="text-xs text-ink-700/70 dark:text-cloud-100/70">
                Are you sure you want to delete this enquiry record for <span className="font-semibold text-ink-900 dark:text-white">"{deleteTarget.productName}"</span>?
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

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}
