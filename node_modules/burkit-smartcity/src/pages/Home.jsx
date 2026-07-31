import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Sparkles, Briefcase, Wrench, MapPin, Truck, MessageCircle,
  PlusCircle, ArrowRight, Store, ChevronRight, Zap
} from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { BURKIT_AREAS, matchArea } from '../data/areaDefaults.js';

export default function Home() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Area & Job/Service Filter State
  const [selectedArea, setSelectedArea] = useState('All');
  const [jobServiceFilter, setJobServiceFilter] = useState('all'); // 'all' | 'jobs' | 'services'

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.getProducts({}),
      api.getCategories(),
    ])
      .then(([p, c]) => {
        if (!mounted) return;
        setProducts(p);
        setCategories(c);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  const isJobOrService = (catName) =>
    ['jobs', 'services'].includes(String(catName || '').trim().toLowerCase());

  // All job & service listings filtered by selected area
  const jobAndServiceItems = useMemo(
    () => products.filter((p) => isJobOrService(p.category) && matchArea(p.area, selectedArea)),
    [products, selectedArea]
  );

  // Filtered job & service items by tab
  const filteredJobServiceItems = useMemo(() => {
    if (jobServiceFilter === 'jobs') {
      return jobAndServiceItems.filter((p) => String(p.category).toLowerCase() === 'jobs');
    }
    if (jobServiceFilter === 'services') {
      return jobAndServiceItems.filter((p) => String(p.category).toLowerCase() === 'services');
    }
    return jobAndServiceItems;
  }, [jobAndServiceItems, jobServiceFilter]);

  return (
    <div className="pb-12">
      {/* Top Header Bar */}
      <div className="mx-4 mt-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#ea580c] via-[#f97316] to-[#27272a] text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="BurKIt Smartcity Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-white tracking-tight leading-tight">
              BurKIt Smartcity
            </h1>
            <p className="text-xs text-orange-100/90 font-semibold mt-0.5">
              Burkitmanagaram Nearby Areas service
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-sm transition-all"
        >
          <Bell size={18} />
        </button>
      </div>

      {/* Area / Village Selection Filter Header */}
      <div className="px-4 mb-4">
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

      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-7">
          {/* ======================================================== */}
          {/* ANNOUNCEMENT & APP INFORMATION CARD (TAMIL)              */}
          {/* ======================================================== */}
          <div className="px-5">
            <div className="card p-5 rounded-3xl bg-gradient-to-br from-[#ea580c]/10 via-[#f97316]/10 to-amber-500/10 border border-[#f97316]/30 dark:border-[#f97316]/40 space-y-3.5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">📢</span>
                <p className="text-xs font-bold text-orange-950 dark:text-orange-200 leading-relaxed">
                  பர்கித்மாநகரத்தைச் சுற்றியுள்ள அனைத்து பகுதிகளிலும் உள்ள பொதுமக்கள் Burkit SmartCity App-ஐ பயன்படுத்திக் கொள்ளலாம்.
                </p>
              </div>

              <div className="pt-1 border-t border-[#f97316]/20 space-y-2 text-xs">
                <p className="font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1.5 text-xs">
                  <span>📱</span> இந்த App மூலம்:
                </p>

                <ul className="space-y-2 text-[12px] text-ink-800 dark:text-cloud-100/90 font-medium">
                  <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
                    <span className="shrink-0 text-base">🛒</span>
                    <span>உங்கள் பகுதியில் பொருட்களை வாங்கவும், விற்கவும் முடியும்.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
                    <span className="shrink-0 text-base">🏪</span>
                    <span>உங்கள் பகுதியில் உள்ள அனைத்து சேவைகளையும் தெரிந்துகொள்ளலாம்.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
                    <span className="shrink-0 text-base">💼</span>
                    <span>புதிய வேலைவாய்ப்பு தகவல்களை உடனுக்குடன் பெறலாம்.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
                    <span className="shrink-0 text-base">📢</span>
                    <span>உங்கள் பகுதியில் நடைபெறும் நிகழ்வுகள் மற்றும் முக்கிய அறிவிப்புகளை அறிந்துகொள்ளலாம்.</span>
                  </li>
                  <li className="flex items-start gap-2 bg-white/60 dark:bg-ink-800/60 p-2 rounded-xl">
                    <span className="shrink-0 text-base">📍</span>
                    <span>அருகிலுள்ள கடைகள், சேவைகள் மற்றும் பயனுள்ள தகவல்களை ஒரே இடத்தில் பெறலாம்.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* JOBS & SERVICES HUB SECTION                              */}
          {/* ======================================================== */}
          <div className="px-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Briefcase size={16} />
                  </span>
                  <h2 className="font-display font-bold text-lg text-ink-900 dark:text-cloud-100">
                    Jobs & Local Services
                  </h2>
                </div>
                <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 mt-0.5">
                  Find jobs and hire local service providers in your area
                </p>
              </div>

              <button
                onClick={() => navigate('/add-product')}
                className="chip bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1 hover:bg-orange-500/20"
              >
                <PlusCircle size={13} /> Post
              </button>
            </div>

            {/* Job & Service Category Sub-Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setJobServiceFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                  jobServiceFilter === 'all'
                    ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                    : 'card text-ink-700 dark:text-cloud-100'
                }`}
              >
                All ({jobAndServiceItems.length})
              </button>

              <button
                onClick={() => setJobServiceFilter('jobs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shrink-0 ${
                  jobServiceFilter === 'jobs'
                    ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                    : 'card text-ink-700 dark:text-cloud-100'
                }`}
              >
                <Briefcase size={13} /> Jobs (
                {jobAndServiceItems.filter((p) => String(p.category).toLowerCase() === 'jobs').length})
              </button>

              <button
                onClick={() => setJobServiceFilter('services')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shrink-0 ${
                  jobServiceFilter === 'services'
                    ? 'bg-[#ea580c] text-white border-[#ea580c] shadow-sm'
                    : 'card text-ink-700 dark:text-cloud-100'
                }`}
              >
                <Wrench size={13} /> Services (
                {jobAndServiceItems.filter((p) => String(p.category).toLowerCase() === 'services').length})
              </button>
            </div>

            {/* Job & Service Cards Grid */}
            {filteredJobServiceItems.length === 0 ? (
              <div className="card p-6 text-center space-y-2 bg-cloud-50 dark:bg-ink-800/60">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 text-orange-600 mx-auto flex items-center justify-center">
                  <Briefcase size={22} />
                </div>
                <p className="text-xs font-bold text-ink-900 dark:text-cloud-100">
                  No {jobServiceFilter === 'jobs' ? 'Jobs' : jobServiceFilter === 'services' ? 'Services' : 'Jobs or Services'} listed yet
                </p>
                <p className="text-[11px] text-ink-700/60 dark:text-cloud-100/60">
                  Be the first to post a job or service in your district!
                </p>
                <button
                  onClick={() => navigate('/add-product')}
                  className="btn-primary !py-2 !px-4 text-xs font-bold inline-flex items-center gap-1.5 mt-1"
                >
                  <PlusCircle size={14} /> Post Job or Service
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredJobServiceItems.map((item) => {
                  const isJob = String(item.category).toLowerCase() === 'jobs';
                  const image = (item.imageUrls || '').split(',')[0];
                  return (
                    <div
                      key={item.productId}
                      onClick={() => navigate(`/product/${item.productId}`)}
                      className="card p-3.5 flex gap-3 cursor-pointer hover:border-orange-500/50 transition-all active:scale-[0.99] group"
                    >
                      <div className="w-20 h-20 rounded-xl bg-cloud-200 dark:bg-ink-700 overflow-hidden shrink-0 relative">
                        {image ? (
                          <img src={image} alt={item.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-orange-500/40">
                            {isJob ? <Briefcase size={24} /> : <Wrench size={24} />}
                          </div>
                        )}
                        <span className={`absolute top-1 left-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded text-white shadow ${
                          isJob ? 'bg-[#ea580c]' : 'bg-[#27272a]'
                        }`}>
                          {isJob ? 'JOB' : 'SERVICE'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <p className="font-semibold text-sm text-ink-900 dark:text-cloud-100 truncate">
                            {item.productName}
                          </p>
                          <p className="text-xs text-[#ea580c] font-bold mt-0.5">
                            {item.price ? `₹${Number(item.price).toLocaleString('en-IN')}` : 'Rate Negotiable'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-ink-700/60 dark:text-cloud-100/60">
                          <span className="flex items-center gap-1 truncate">
                            <MapPin size={12} className="text-[#ea580c] shrink-0" />
                            <span className="truncate">{item.area ? `${item.area}, ` : ''}{item.district}</span>
                          </span>
                          <span className="text-rose-500 font-bold text-[10px]">❤️ {item.likeCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SMART CITY FEATURES INTRO                                */}
          {/* ======================================================== */}
          <div className="px-5">
            <div className="card p-5 space-y-3.5 bg-gradient-to-r from-cloud-50 to-cloud-100 dark:from-ink-800/80 dark:to-ink-800/40 border border-cloud-200 dark:border-ink-700">
              <h3 className="font-display font-bold text-sm text-ink-900 dark:text-cloud-100 flex items-center gap-1.5">
                <Sparkles size={16} className="text-[#ea580c]" /> Why BurKIt Smartcity?
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 card rounded-xl bg-white/70 dark:bg-ink-700/60 space-y-1">
                  <p className="font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1 text-[#ea580c]">
                    <MapPin size={14} /> GPS Distance Calculation
                  </p>
                  <p className="text-[11px] text-ink-700/70 dark:text-cloud-100/70 leading-relaxed">
                    Easily calculate the exact distance to sellers in kilometers.
                  </p>
                </div>

                <div className="p-3 card rounded-xl bg-white/70 dark:bg-ink-700/60 space-y-1">
                  <p className="font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1 text-[#ea580c]">
                    <Truck size={14} /> Per-KM Delivery Fee
                  </p>
                  <p className="text-[11px] text-ink-700/70 dark:text-cloud-100/70 leading-relaxed">
                    Automatic delivery fee calculation based on live distance.
                  </p>
                </div>

                <div className="p-3 card rounded-xl bg-white/70 dark:bg-ink-700/60 space-y-1">
                  <p className="font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1 text-[#ea580c]">
                    <MessageCircle size={14} /> Direct WhatsApp Chat
                  </p>
                  <p className="text-[11px] text-ink-700/70 dark:text-cloud-100/70 leading-relaxed">
                    One-click direct contact with sellers and map directions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
