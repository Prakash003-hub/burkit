import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MapPin, MessageCircle, Share2, CalendarDays, Flag, Edit3,
  Navigation, ExternalLink, Loader2, Compass, ToggleLeft, ToggleRight, Heart, Truck, Briefcase, Wrench
} from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { openWhatsApp, buildWhatsAppMessage } from '../utils/whatsapp.js';
import { calculateHaversineDistance, formatDistance, getGoogleMapsDirectionsUrl } from '../utils/distance.js';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Like State
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeBusy, setLikeBusy] = useState(false);

  // Buyer GPS Location State
  const [buyerLoc, setBuyerLoc] = useState({ lat: null, lng: null });
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locError, setLocError] = useState('');

  const isOwner = user && product && (
    (user.userId && String(product.sellerId) === String(user.userId)) ||
    (user.mobile && String(product.sellerMobile) === String(user.mobile))
  );

  useEffect(() => {
    api
      .getProduct(id)
      .then((p) => {
        setProduct(p);
        setLikeCount(Number(p.likeCount || 0));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (user?.userId) {
      api.getUserLikes(user.userId).then((likedIds) => {
        if (likedIds.includes(String(id))) setLiked(true);
      }).catch(() => {});
    }

    // Try auto-detecting buyer location if permission is granted
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setBuyerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {}, // Silent fallback if not allowed yet
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [id, user?.userId]);

  async function handleToggleLike() {
    if (!user) {
      alert('Please log in to like products');
      return;
    }
    if (likeBusy || !product) return;

    setLikeBusy(true);
    try {
      const res = await api.toggleLike(product.productId, user.userId);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLikeBusy(false);
    }
  }

  function handleDetectBuyerLocation() {
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBuyerLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDetectingLoc(false);
      },
      (err) => {
        setLocError('Location permission denied. Enable GPS to calculate distance.');
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const distKm = useMemo(() => {
    if (!product?.latitude || !product?.longitude || !buyerLoc.lat || !buyerLoc.lng) return null;
    return calculateHaversineDistance(buyerLoc.lat, buyerLoc.lng, product.latitude, product.longitude);
  }, [product?.latitude, product?.longitude, buyerLoc.lat, buyerLoc.lng]);

  async function handleBuyNow() {
    if (!product) return;

    api.createSaleRequest({
      productId: product.productId,
      productName: product.productName,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      sellerMobile: product.sellerMobile,
      buyerId: user?.userId || '',
      buyerName: user?.name || 'Buyer',
      buyerMobile: user?.mobile || '',
      message: buildWhatsAppMessage(product, user, buyerLoc),
      status: 'New',
    }).catch((err) => console.error('Failed to log sale request:', err));

    openWhatsApp(product, user, buyerLoc);
  }

  if (loading) return <Loader />;
  if (!product) {
    return (
      <div className="p-6 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
        Product or Listing not found.
      </div>
    );
  }

  const images = (product.imageUrls || '').split(',').filter(Boolean);
  const mapsUrl = product.latitude && product.longitude
    ? getGoogleMapsDirectionsUrl(product.latitude, product.longitude, buyerLoc.lat, buyerLoc.lng)
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((product.area ? `${product.area}, ` : '') + product.district)}`;

  async function handleShare() {
    const shareData = {
      title: product.productName,
      text: `Check out ${product.productName} on Burkit SmartCity`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard');
    }
  }

  const isJobOrService = ['jobs', 'services'].includes(String(product?.category || '').trim().toLowerCase());
  const isJob = String(product?.category || '').toLowerCase() === 'jobs';

  return (
    <div className="pb-24">
      {/* Top Header Banner for Job/Service vs Image Gallery for Goods */}
      {isJobOrService ? (
        <div className={`relative px-5 pt-8 pb-10 text-white rounded-b-3xl shadow-lg ${
          isJob ? 'bg-gradient-to-br from-orange-600 via-orange-700 to-zinc-800' : 'bg-gradient-to-br from-amber-600 via-orange-600 to-zinc-800'
        }`}>
          {/* Top Control Buttons */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleToggleLike}
                className={`w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center transition-all ${
                  liked ? 'text-rose-400 bg-white/95' : 'text-white'
                }`}
                title={liked ? 'Unlike' : 'Like'}
              >
                <Heart size={18} className={liked ? 'fill-rose-500 text-rose-500' : ''} />
              </button>

              {isOwner && (
                <button
                  onClick={() => navigate(`/edit-product/${product.productId}`)}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold"
                  title="Edit Listing"
                >
                  <Edit3 size={16} />
                </button>
              )}

              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
                title="Share"
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>

          {/* Job or Service Icon & Category Badge */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              {isJob ? <Briefcase size={32} className="text-orange-200" /> : <Wrench size={32} className="text-amber-200" />}
            </div>
            <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wide border border-white/30">
              {isJob ? '💼 Job Opportunity' : '🛠️ Local Service'}
            </span>
          </div>
        </div>
      ) : (
        /* Product Image Gallery */
        <div className="relative aspect-square bg-cloud-200 dark:bg-ink-700">
          {images.length > 0 ? (
            <img src={images[activeImage]} alt={product.productName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ink-700/30 text-sm">No image available</div>
          )}

          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-10 h-10 rounded-full glass flex items-center justify-center z-10"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button
              onClick={handleToggleLike}
              className={`w-10 h-10 rounded-full glass flex items-center justify-center transition-all ${
                liked ? 'text-rose-500 bg-white/95' : 'text-slate-700 dark:text-cloud-100 hover:text-rose-500'
              }`}
              title={liked ? 'Unlike' : 'Like'}
            >
              <Heart size={18} className={liked ? 'fill-rose-500 text-rose-500' : ''} />
            </button>

            {isOwner && (
              <button
                onClick={() => navigate(`/edit-product/${product.productId}`)}
                className="w-10 h-10 rounded-full glass flex items-center justify-center text-brand-600 font-bold"
                title="Edit Listing"
              >
                <Edit3 size={16} />
              </button>
            )}

            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full glass flex items-center justify-center"
              title="Share Product"
            >
              <Share2 size={16} />
            </button>
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImage ? 'bg-[#ea580c] w-4' : 'bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Details */}
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display font-bold text-xl">{product.productName}</h1>
            <p className="text-xs font-bold text-rose-500 mt-1 flex items-center gap-1">
              ❤️ {likeCount} {likeCount === 1 ? 'person liked this' : 'people liked this'}
            </p>
          </div>
        </div>

        {product.price && (
          <p className="font-display font-bold text-2xl text-[#ea580c]">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-ink-700/60 dark:text-cloud-100/60">
          <div className="flex items-center gap-1">
            <MapPin size={13} className="text-[#ea580c]" />
            <span>{product.area ? `${product.area}, ` : ''}{product.district}</span>
          </div>
          <div className="flex items-center gap-1">
            <CalendarDays size={13} />
            <span>{formatDate(product.createdAt)}</span>
          </div>
        </div>

        {/* Location & Distance Card with ON / OFF Toggle */}
        <div className="p-4 card rounded-2xl bg-cloud-50 dark:bg-ink-800/60 border border-cloud-200 dark:border-ink-700 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Compass size={16} className={buyerLoc.lat ? "text-[#ea580c]" : "text-slate-400"} />
              <span className="text-xs font-bold uppercase tracking-wider text-ink-900 dark:text-cloud-100">
                Location & Distance
              </span>
            </div>

            {/* ON / OFF Toggle Button */}
            <button
              onClick={() => {
                if (buyerLoc.lat) {
                  setBuyerLoc({ lat: null, lng: null });
                  setLocError('');
                } else {
                  handleDetectBuyerLocation();
                }
              }}
              disabled={detectingLoc}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                buyerLoc.lat
                  ? 'bg-[#ea580c] text-white shadow-sm'
                  : 'bg-slate-200 dark:bg-ink-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {detectingLoc ? (
                <Loader2 size={13} className="animate-spin" />
              ) : buyerLoc.lat ? (
                <ToggleRight size={16} />
              ) : (
                <ToggleLeft size={16} />
              )}
              {buyerLoc.lat ? 'GPS: ON' : 'GPS: OFF'}
            </button>
          </div>

          {/* Distance Badge if GPS is ON */}
          {distKm !== null && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-medium text-ink-700/70 dark:text-cloud-100/70">Distance from you:</span>
              <span className="chip bg-[#ea580c]/10 text-[#ea580c] font-bold text-xs border border-[#ea580c]/20">
                📍 {formatDistance(distKm)}
              </span>
            </div>
          )}

          {locError && <p className="text-xs text-rose-500 font-medium">{locError}</p>}

          <p className="text-xs text-ink-700/70 dark:text-cloud-100/70">
            Location: <strong className="text-ink-900 dark:text-white">{product.area ? `${product.area}, ` : ''}{product.district}</strong>
            {product.latitude ? ' (GPS active)' : ''}
          </p>

          {/* Google Maps Directions Button */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl bg-white dark:bg-ink-700 text-ink-900 dark:text-cloud-100 border border-slate-200 dark:border-ink-600 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm hover:bg-cloud-100 transition"
          >
            <MapPin size={15} className="text-rose-500" />
            Get Directions on Google Maps
            <ExternalLink size={13} className="text-ink-700/40" />
          </a>
        </div>

        {/* Delivery Option Card - rendered ONLY if delivery is allowed */}
        {product.deliveryAvailable === 'Yes' && (
          <div className="p-4 card rounded-2xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-900 dark:text-orange-300">
                <Truck size={18} className="text-[#ea580c]" />
                <span className="text-sm font-bold">Home Delivery Available</span>
              </div>
              <span className="chip bg-[#ea580c] text-white text-xs font-bold px-2.5 py-0.5 shadow-sm">
                ₹{product.deliveryFeePerKm || 0} / KM
              </span>
            </div>

            {distKm !== null && Number(product.deliveryFeePerKm) > 0 ? (
              <div className="flex items-center justify-between pt-2 border-t border-orange-200/60 dark:border-orange-800/40 text-xs">
                <span className="text-orange-900/80 dark:text-orange-200/80 font-medium">Estimated Delivery Charge:</span>
                <span className="font-bold text-[#ea580c] dark:text-orange-400 text-sm">
                  ₹{Math.round(distKm * Number(product.deliveryFeePerKm))} ({formatDistance(distKm)})
                </span>
              </div>
            ) : distKm === null && Number(product.deliveryFeePerKm) > 0 ? (
              <p className="text-[11px] text-orange-900/70 dark:text-orange-300/70 pt-1">
                💡 Turn ON GPS location above to calculate exact delivery charge to your location.
              </p>
            ) : null}
          </div>
        )}

        {/* Description */}
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-700/50 dark:text-cloud-100/50 mb-1.5 uppercase tracking-wider">Description</p>
          <p className="text-sm text-ink-700 dark:text-cloud-100/80 whitespace-pre-line leading-relaxed">
            {product.description || 'No description provided.'}
          </p>
        </div>

        {/* Seller Info */}
        <div className="card p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#ea580c]/10 text-[#ea580c] flex items-center justify-center font-bold text-lg">
            {(product.sellerName || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{product.sellerName || 'Seller / Provider'}</p>
            <p className="text-xs text-ink-700/50 dark:text-cloud-100/50">{product.district}{product.area ? `, ${product.area}` : ''}</p>
          </div>
        </div>

        <button
          onClick={() => window.confirm('Do you want to report this listing?') && api.reportProduct({ productId: product.productId, reason: 'Reported from product page' })}
          className="flex items-center gap-1.5 text-xs text-ink-700/40 dark:text-cloud-100/40 mt-2"
        >
          <Flag size={12} /> Report this listing
        </button>
      </div>

      {/* Fixed WhatsApp Buy Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto p-4 pb-6 bg-gradient-to-t from-cloud-100 dark:from-ink-900 via-cloud-100/95 dark:via-ink-900/95 to-transparent z-50">
        {isOwner ? (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/edit-product/${product.productId}`)}
              className="flex-1 btn-secondary py-3 text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Edit3 size={18} />
              Edit Listing
            </button>

            <button
              onClick={handleBuyNow}
              className="flex-1 btn-primary flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] shadow-glass py-3 text-sm font-bold"
            >
              <MessageCircle size={18} />
              WhatsApp Chat
            </button>
          </div>
        ) : (
          <button
            onClick={handleBuyNow}
            className="btn-primary w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] shadow-glass py-3.5 text-base font-bold"
          >
            <MessageCircle size={20} />
            Chat to Buy on WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
