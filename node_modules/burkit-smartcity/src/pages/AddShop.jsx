import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, ImagePlus, Loader2, X, CheckCircle2, Sparkles } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { SHOP_CATEGORIES } from '../data/groceryDefaults.js';
import { BURKIT_AREAS } from '../data/areaDefaults.js';
import { compressImage } from '../utils/imageCompressor.js';

export default function AddShop() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    shopName: '',
    whatsappNo: user?.mobile || '',
    category: 'Grocery',
    villageName: user?.area || BURKIT_AREAS[8],
    streetName: user?.streetName || '',
    description: '',
    shopPhoto: '',
    populateDefaults: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 0.7);
      setPhotoPreview(compressed);
      update('shopPhoto', compressed);
    } catch (err) {
      console.error('Image compression error:', err);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.shopName.trim()) return setError('Shop name is required');
    if (!form.whatsappNo.trim()) return setError('WhatsApp number is required');

    setSaving(true);
    try {
      const effectiveUserId = user?.userId || (user?.mobile ? `USR_${user.mobile}` : `USR_${form.whatsappNo.trim()}`);
      const effectiveOwnerName = user?.name || form.shopName.trim();

      await api.createShop({
        ownerUserId: effectiveUserId,
        ownerName: effectiveOwnerName,
        shopName: form.shopName.trim(),
        whatsappNo: form.whatsappNo.trim(),
        category: form.category,
        villageName: form.villageName.trim(),
        streetName: form.streetName.trim(),
        description: form.description.trim(),
        shopPhoto: form.shopPhoto,
        populateDefaults: form.category === 'Grocery' ? form.populateDefaults : false,
        status: 'Approved',
      });

      // Navigate immediately — grocery catalog loads in background
      navigate('/my-shops', {
        state: {
          successMsg: '✅ உங்கள் கடை வெற்றிகரமாக பதிவு செய்யப்பட்டது!'
        }
      });
    } catch (err) {
      console.error('Failed to create shop:', err);
      setError(err.message || 'Failed to create shop');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      {/* Top Bar Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl">Register New Shop</h1>
          <p className="text-xs text-ink-700/60 dark:text-cloud-100/60">புதிய கடை பதிவு செய்யும் படிவம்</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Photo Upload */}
        <div>
          <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Shop Photo (optional)</label>
          <div className="mt-1.5 flex items-center gap-3">
            {photoPreview ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                <img src={photoPreview} alt="Shop Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(''); update('shopPhoto', ''); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-orange-300 dark:border-ink-700 bg-orange-50/50 dark:bg-ink-800 flex flex-col items-center justify-center text-[#ea580c] cursor-pointer hover:bg-orange-100/50 transition-colors">
                <ImagePlus size={24} />
                <span className="text-[10px] font-bold mt-1">Upload Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
              </label>
            )}
          </div>
        </div>

        {/* Shop Name */}
        <div>
          <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Shop Name (கடையின் பெயர்) *</label>
          <input
            type="text"
            className="input mt-1 text-sm font-semibold"
            placeholder="e.g. ஸ்ரீ முருகன் மளிகை கடை"
            value={form.shopName}
            onChange={(e) => update('shopName', e.target.value)}
            required
          />
        </div>

        {/* WhatsApp Mobile Number */}
        <div>
          <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">WhatsApp Mobile Number *</label>
          <input
            type="text"
            maxLength={10}
            className="input mt-1 text-sm font-semibold font-mono"
            placeholder="e.g. 9876543210"
            value={form.whatsappNo}
            onChange={(e) => update('whatsappNo', e.target.value.replace(/\D/g, ''))}
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Category (கடை வகை) *</label>
          <select
            className="input mt-1 text-sm font-bold"
            value={form.category}
            onChange={(e) => {
              const selectedCategory = e.target.value;
              setForm((f) => ({
                ...f,
                category: selectedCategory,
                populateDefaults: selectedCategory === 'Grocery',
              }));
            }}
          >
            {SHOP_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Village / Area Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Village / Area Name (ஊரின் பெயர் / பகுதி) *</label>
            <select
              className="input mt-1 text-sm font-semibold"
              value={form.villageName}
              onChange={(e) => update('villageName', e.target.value)}
              required
            >
              {BURKIT_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Street Name (தெரு பெயர்)</label>
            <input
              type="text"
              className="input mt-1 text-sm font-semibold"
              placeholder="e.g. 1st Street, Main Road"
              value={form.streetName}
              onChange={(e) => update('streetName', e.target.value)}
            />
          </div>
        </div>

        {/* Grocery Default Catalog Checkbox Banner */}
        {form.category === 'Grocery' && (
          <div className="card p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border border-orange-400/30 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#ea580c]" />
              <p className="font-bold text-xs text-ink-900 dark:text-cloud-100">
                Default Tamil Grocery Catalog (இயல்புநிலை மளிகைப் பொருட்கள்)
              </p>
            </div>
            <p className="text-[11px] text-ink-700/70 dark:text-cloud-100/70 leading-relaxed">
              கடையை உருவாக்கும் போதே காய்கறிகள் (தக்காளி, உருளை...), மளிகைப் பொருட்கள், எண்ணெய், மாவு & பருப்பு வகைகள் தானாக சேர்க்கப்படும்.
            </p>

            <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.populateDefaults}
                onChange={(e) => update('populateDefaults', e.target.checked)}
                className="w-4 h-4 accent-[#ea580c] rounded"
              />
              <span className="text-xs font-bold text-[#ea580c]">
                Include Default Tamil Grocery Items Catalog
              </span>
            </label>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Description / Services (விளக்கம் - optional)</label>
          <textarea
            className="input mt-1 text-xs min-h-[90px]"
            placeholder="Describe your shop services, timing, or special offers..."
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full py-3.5 text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg disabled:opacity-75"
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Google Sheet-ல் சேமிக்கப்படுகிறது...</span>
            </>
          ) : (
            <>
              <Store size={18} />
              <span>Register Shop (கடையைப் பதிவு செய்)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
