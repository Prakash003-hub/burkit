import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ImagePlus, Loader2, X, MapPin, Navigation, CheckCircle,
  AlertCircle, ToggleLeft, ToggleRight, Truck
} from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { BURKIT_AREAS } from '../data/areaDefaults.js';
import { SERVICE_JOB_TYPES } from '../data/serviceDefaults.js';
import { compressImage } from '../utils/imageCompressor.js';

const MAX_IMAGES = 5;

export default function AddProduct() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]); // { file, preview, base64 }
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Location ON / OFF toggle states for products
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [locSuccess, setLocSuccess] = useState('');
  const [locError, setLocError] = useState('');

  const [form, setForm] = useState({
    productName: '',
    category: '',
    description: '',
    price: '',
    negotiable: 'No',
    deliveryAvailable: 'No',
    deliveryFeePerKm: '',
    whatsappNumber: user?.mobile || '',
    district: user?.district || '',
    area: user?.area || '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleImageSelect(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - images.length);
    for (const file of files) {
      try {
        const compressed = await compressImage(file, 800, 0.7);
        setImages((imgs) => [...imgs, { file, preview: compressed, base64: compressed }]);
      } catch (err) {
        console.error(err);
      }
    }
  }

  function removeImage(idx) {
    setImages((imgs) => imgs.filter((_, i) => i !== idx));
  }

  function toggleLocationSharing() {
    setLocError('');
    setLocSuccess('');

    if (!locationEnabled) {
      if (!navigator.geolocation) {
        setLocError('Geolocation is not supported by your browser.');
        return;
      }

      setDetectingLoc(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
          setLocSuccess(`Location Allowed (ON) — ${lat}, ${lng}`);
          setLocationEnabled(true);
          setDetectingLoc(false);
        },
        (err) => {
          setLocError('Location permission denied. GPS disabled.');
          setLocationEnabled(false);
          setDetectingLoc(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setForm((f) => ({ ...f, latitude: '', longitude: '' }));
      setLocationEnabled(false);
      setLocSuccess('Location Not Allowed (OFF) — GPS coordinates cleared');
    }
  }

  const isJobOrService = ['jobs', 'services'].includes(String(form.category || '').trim().toLowerCase());

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.productName.trim()) return setError('Title / Name is required');
    if (!form.category) return setError('Please select a category');
    if (!/^\d{10}$/.test(form.whatsappNumber)) return setError('Enter a valid 10-digit WhatsApp number');
    if (!form.district.trim()) return setError('District is required');
    if (images.length === 0 && !isJobOrService) return setError('Add at least one product image');

    setSaving(true);
    try {
      setUploading(true);
      const uploaded = [];
      if (!isJobOrService) {
        for (const img of images) {
          const res = await api.uploadImage({ base64: img.base64, fileName: img.file.name, mimeType: img.file.type, type: 'product' });
          uploaded.push(res.url);
        }
      }
      setUploading(false);

      await api.createProduct({
        sellerId: user.userId,
        sellerName: user.name,
        sellerMobile: form.whatsappNumber,
        category: form.category,
        productName: form.productName,
        description: form.description,
        price: form.price,
        negotiable: 'No',
        deliveryAvailable: isJobOrService ? 'No' : form.deliveryAvailable,
        deliveryFeePerKm: (!isJobOrService && form.deliveryAvailable === 'Yes') ? form.deliveryFeePerKm : '',
        imageUrls: uploaded,
        district: form.district,
        area: form.area,
        latitude: isJobOrService ? '' : form.latitude,
        longitude: isJobOrService ? '' : form.longitude,
      });

      navigate('/my-products');
    } catch (err) {
      setError(err.message || 'Failed to submit listing');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-10">
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <h1 className="font-display font-bold text-xl">
          {isJobOrService ? 'Post Job or Service' : 'Add Product'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {/* Category Selection */}
        <Field label="Category *">
          <select className="input font-semibold" value={form.category} onChange={(e) => update('category', e.target.value)} required>
            <option value="">Select Category</option>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryName}>{c.categoryName}</option>
            ))}
          </select>
        </Field>

        {/* Service / Job Type Dropdown */}
        {isJobOrService && (
          <Field label="Service / Job Type (சேவை / பணி வகை) *">
            <select
              className="input font-semibold text-xs"
              value={form.subCategory}
              onChange={(e) => {
                const val = e.target.value;
                update('subCategory', val);
                if (!form.productName) update('productName', val);
              }}
            >
              <option value="">Select Service / Job Type (தேர்வு செய்க)</option>
              {SERVICE_JOB_TYPES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </Field>
        )}

        {/* Product Images - shown ONLY for physical products */}
        {!isJobOrService && (
          <div>
            <label className="text-sm font-medium">Images ({images.length}/{MAX_IMAGES}) *</label>
            <div className="flex gap-2 mt-1.5 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden">
                  <img src={img.preview} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label className="w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-brand-300 flex items-center justify-center text-brand-600 cursor-pointer">
                  <ImagePlus size={20} />
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                </label>
              )}
            </div>
          </div>
        )}

        <Field label={isJobOrService ? "Job or Service Title *" : "Product Title *"}>
          <input
            className="input"
            value={form.productName}
            onChange={(e) => update('productName', e.target.value)}
            placeholder={isJobOrService ? "e.g. Car Driver Required / Plumbing Service" : "e.g. Wooden Dining Table"}
            required
          />
        </Field>

        <Field label="Description *">
          <textarea
            className="input min-h-[110px]"
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder={isJobOrService ? "Enter timing, experience, service details..." : "Describe product condition, features..."}
            required
          />
        </Field>

        {isJobOrService ? (
          <Field label="Salary / Fee (Optional)">
            <input className="input" inputMode="numeric" value={form.price} onChange={(e) => update('price', e.target.value.replace(/\D/g, ''))} placeholder="₹ Salary or Fee" />
          </Field>
        ) : (
          <>
            <Field label="Price (Optional)">
              <input className="input" inputMode="numeric" value={form.price} onChange={(e) => update('price', e.target.value.replace(/\D/g, ''))} placeholder="₹" />
            </Field>

            {/* Delivery Option Card for products */}
            <div className="space-y-3 p-3.5 card rounded-2xl bg-cloud-50 dark:bg-ink-800/60 border border-cloud-200 dark:border-ink-700">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1.5">
                    <Truck size={15} className={form.deliveryAvailable === 'Yes' ? 'text-[#ea580c]' : 'text-slate-400'} />
                    Home Delivery Option
                  </label>
                  <p className="text-[11px] text-ink-700/60 dark:text-cloud-100/60">
                    {form.deliveryAvailable === 'Yes' ? 'Delivery Allowed (ON)' : 'Delivery Not Allowed (OFF)'}
                  </p>
                </div>

                <select
                  className="input text-xs w-28 font-bold !py-1"
                  value={form.deliveryAvailable}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({
                      ...f,
                      deliveryAvailable: val,
                      deliveryFeePerKm: val === 'No' ? '' : f.deliveryFeePerKm,
                    }));
                  }}
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>

              {form.deliveryAvailable === 'Yes' && (
                <div className="pt-1 animate-fadeIn">
                  <label className="text-xs font-medium text-ink-700/70 dark:text-cloud-100/70">
                    Delivery Charge per KM (₹/km) *
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="input w-12 text-center !px-0 text-xs font-bold">₹</span>
                    <input
                      className="input flex-1 text-xs"
                      inputMode="decimal"
                      value={form.deliveryFeePerKm}
                      onChange={(e) => update('deliveryFeePerKm', e.target.value.replace(/[^\d.]/g, ''))}
                      placeholder="e.g. 15"
                      required={form.deliveryAvailable === 'Yes'}
                    />
                    <span className="text-xs text-ink-700/60 dark:text-cloud-100/60 shrink-0 font-medium">/ KM</span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <Field label="Contact WhatsApp Number *">
          <div className="flex items-center gap-2">
            <span className="input w-16 text-center !px-0">+91</span>
            <input className="input flex-1" inputMode="numeric" maxLength={10} value={form.whatsappNumber} onChange={(e) => update('whatsappNumber', e.target.value.replace(/\D/g, ''))} required />
          </div>
        </Field>

        {/* Location ON / OFF Toggle Card - shown ONLY for physical products */}
        {!isJobOrService && (
          <div className="space-y-3 p-3.5 card rounded-2xl bg-cloud-50 dark:bg-ink-800/60 border border-cloud-200 dark:border-ink-700">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1.5">
                  <MapPin size={15} className={locationEnabled ? 'text-[#ea580c]' : 'text-slate-400'} />
                  GPS Location Sharing
                </label>
                <p className="text-[11px] text-ink-700/60 dark:text-cloud-100/60">
                  {locationEnabled ? 'Location Allowed (ON)' : 'Location Disabled (OFF)'}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleLocationSharing}
                disabled={detectingLoc}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  locationEnabled
                    ? 'bg-[#ea580c] text-white'
                    : 'bg-slate-200 dark:bg-ink-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {detectingLoc ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : locationEnabled ? (
                  <ToggleRight size={18} />
                ) : (
                  <ToggleLeft size={18} />
                )}
                {locationEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {locSuccess && (
              <p className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1 font-medium pt-1">
                <CheckCircle size={13} /> {locSuccess}
              </p>
            )}

            {locError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1 font-medium pt-1">
                <AlertCircle size={13} /> {locError}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="text-xs font-medium text-ink-700/70 dark:text-cloud-100/70">District *</label>
            <input className="input mt-1 text-xs" value={form.district} onChange={(e) => update('district', e.target.value)} placeholder="District" required />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-700/70 dark:text-cloud-100/70">Area (ஊர் / பகுதி) *</label>
            <select className="input mt-1 text-xs font-semibold" value={form.area} onChange={(e) => update('area', e.target.value)}>
              {BURKIT_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-ink-700/70 dark:text-cloud-100/70">Street Name (தெரு பெயர்)</label>
            <input className="input mt-1 text-xs font-semibold" value={form.streetName || ''} onChange={(e) => update('streetName', e.target.value)} placeholder="Street Name" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving && <Loader2 size={18} className="animate-spin" />}
          {uploading ? 'Uploading Images...' : 'Submit Listing'}
        </button>
        <p className="text-xs text-center text-ink-700/50 dark:text-cloud-100/50">
          Your listing will be published after verification.
        </p>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-ink-700 dark:text-cloud-100/80">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
