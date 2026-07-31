import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/api.js';

export default function ProductCard({ product, isLiked: initialLiked = false, onLikeToggle }) {
  const { user } = useAuth();
  const firstImage = (product.imageUrls || '').split(',')[0];
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(Number(product.likeCount || 0));
  const [busy, setBusy] = useState(false);

  async function handleLikeClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Please log in to like products');
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const res = await api.toggleLike(product.productId, user.userId);
      setLiked(res.liked);
      setLikeCount(res.likeCount);
      if (onLikeToggle) onLikeToggle(product.productId, res.liked, res.likeCount);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Link to={`/product/${product.productId}`} className="card overflow-hidden block active:scale-[0.98] transition group relative">
      <div className="aspect-square bg-cloud-200 dark:bg-ink-700 relative overflow-hidden">
        {firstImage ? (
          <img src={firstImage} alt={product.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-700/30 text-xs">No image</div>
        )}

        {/* Heart Like Button */}
        <button
          onClick={handleLikeClick}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full glass flex items-center justify-center transition-all ${
            liked ? 'text-rose-500 bg-white/90' : 'text-slate-600 dark:text-cloud-100 hover:text-rose-500'
          }`}
          title={liked ? 'Unlike' : 'Like'}
        >
          <Heart size={16} className={liked ? 'fill-rose-500 text-rose-500' : ''} />
        </button>
      </div>

      <div className="p-3">
        <p className="font-semibold text-sm text-ink-900 dark:text-cloud-100 truncate">{product.productName}</p>
        
        <div className="flex items-center justify-between mt-0.5">
          {product.price ? (
            <p className="font-display font-bold text-[#ea580c]">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </p>
          ) : <span />}

          <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5">
            ❤️ {likeCount}
          </span>
        </div>

        <div className="flex items-center gap-1 mt-1 text-[11px] text-ink-700/50 dark:text-cloud-100/50">
          <MapPin size={12} className="shrink-0 text-[#ea580c]" />
          <span className="truncate">{product.area ? `${product.area}, ` : ''}{product.district}</span>
        </div>
      </div>
    </Link>
  );
}
