import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Loader2, X, ShieldAlert, Truck } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { BURKIT_AREAS } from '../data/areaDefaults.js';
import { SERVICE_JOB_TYPES } from '../data/serviceDefaults.js';

const MAX_IMAGES = 5;

export default function EditProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]); // existing URLs or { base64, preview, file }
  const [form, setForm] = useState(null);

  useEffect(() => {
    Promise.all([api.getProduct(id), api.getCategories()]).then(([product, cats]) => {
      setCategories(cats);
      setForm({
        productName: product.productName || '',
        category: product.category || '',
        description: product.description || '',
        price: product.price || '',
        negotiable: product.negotiable || 'No',
        deliveryAvailable: product.deliveryAvailable || 'No',
        deliveryFeePerKm: product.deliveryFeePerKm || '',
        sellerName: product.sellerName || '',
        sellerMobile: product.sellerMobile || '',
        district: product.district || '',
        area: product.area || BURKIT_AREAS[8],
        streetName: product.streetName || '',
        latitude: product.latitude || '',
        longitude: product.longitude || '',
        status: product.status || 'Pending',
      });
      setImages((product.imageUrls || '').split(',').filter(Boolean).map((url) => ({ url, preview: url })));
      setLoading(false);
    });
  }, [id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleImageSelect(e) {
    const files = Array.from(e.target.files || []).slice(0, MAX_IMAGES - images.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setImages((imgs) => [...imgs, { file, preview: reader.result, base64: reader.result.split(',')[1] }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(idx) {
    setImages((imgs) => imgs.filter((_, i) => i !== idx));
  }

  const isJobOrService = ['jobs', 'services'].includes(String(form?.category || '').trim().toLowerCase());

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (images.length === 0 && !isJobOrService) return setError('குறைந்தது ஒரு படத்தை சேர்க்கவும்');
    setSaving(true);
    try {
      const finalUrls = [];
      if (!isJobOrService) {
        for (const img of images) {
          if (img.url) {
            finalUrls.push(img.url);
          } else {
            const res = await api.uploadImage({
              base64: img.base64,
              fileName: img.file.name,
              mimeType: img.file.type,
              type: 'product',
            });
            finalUrls.push(res.url);
          }
        }
      }

      await api.updateProduct({
        productId: id,
        productName: form.productName,
        category: form.category,
        description: form.description,
        price: form.price,
        negotiable: isJobOrService ? 'No' : form.negotiable,
        deliveryAvailable: isJobOrService ? 'No' : form.deliveryAvailable,
        deliveryFeePerKm: (!isJobOrService && form.deliveryAvailable === 'Yes') ? form.deliveryFeePerKm : '',
        sellerName: form.sellerName,
        sellerMobile: form.sellerMobile,
        district: form.district,
        area: form.area,
        streetName: form.streetName || '',
        imageUrls: finalUrls,
        status: isAdmin ? form.status : 'Pending', // Admin can directly change status; user edits reset to Pending
      });

      if (isAdmin) {
        navigate('/admin');
      } else {
        navigate('/my-products');
      }
    } catch (err) {
      setError(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  }

  if (loading || !form) return <Loader />;

  return (
    <div className="pb-10">
      <div className="px-5 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl">Edit Product</h1>
          {isAdmin && (
            <span className="text-[11px] text-brand-600 font-semibold flex items-center gap-1">
              <ShieldAlert size={12} /> Admin Mode
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        <div>
          <label className="text-sm font-medium">Product Images ({images.length}/{MAX_IMAGES})</label>
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

        <Field label="Product Name">
          <input className="input" value={form.productName} onChange={(e) => update('productName', e.target.value)} required />
        </Field>

        <Field label="Category">
          <select className="input" value={form.category} onChange={(e) => update('category', e.target.value)}>
            {categories.map((c) => (
              <option key={c.categoryId} value={c.categoryName}>{c.categoryName}</option>
            ))}
          </select>
        </Field>

        {isJobOrService && (
          <Field label="Service / Job Type (சேவை / பணி வகை)">
            <select
              className="input font-semibold text-xs"
              value={form.subCategory || ''}
              onChange={(e) => update('subCategory', e.target.value)}
            >
              <option value="">Select Service / Job Type</option>
              {SERVICE_JOB_TYPES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Description">
          <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => update('description', e.target.value)} />
        </Field>

        <Field label="Price (₹)">
          <input className="input" inputMode="numeric" value={form.price} onChange={(e) => update('price', e.target.value.replace(/\D/g, ''))} />
        </Field>

        {/* Delivery Option Card */}
        <div className="space-y-3 p-3.5 card rounded-2xl bg-cloud-50 dark:bg-ink-800/60 border border-cloud-200 dark:border-ink-700">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-ink-900 dark:text-cloud-100 flex items-center gap-1.5">
                <Truck size={15} className={form.deliveryAvailable === 'Yes' ? 'text-[#ea580c]' : 'text-slate-400'} />
                Product Delivery
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
              <option value="No">Not Allowed</option>
              <option value="Yes">Allowed</option>
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

        {/* Admin extra fields */}
        {isAdmin && (
          <div className="p-3 bg-brand-50/50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl space-y-3">
            <p className="text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider">Admin Controls</p>

            <Field label="Seller Name">
              <input className="input" value={form.sellerName} onChange={(e) => update('sellerName', e.target.value)} />
            </Field>

            <Field label="Seller Mobile Number">
              <input className="input" maxLength={10} value={form.sellerMobile} onChange={(e) => update('sellerMobile', e.target.value.replace(/\D/g, ''))} />
            </Field>

            <Field label="Product Status">
              <select className="input font-semibold" value={form.status} onChange={(e) => update('status', e.target.value)}>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Sold">Sold</option>
              </select>
            </Field>
          </div>
        )}

        {!isAdmin && (
          <Field label="WhatsApp Number">
            <input className="input" maxLength={10} value={form.sellerMobile} onChange={(e) => update('sellerMobile', e.target.value.replace(/\D/g, ''))} />
          </Field>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="District">
            <input className="input text-xs" value={form.district} onChange={(e) => update('district', e.target.value)} />
          </Field>
          <Field label="Area (ஊர் / பகுதி)">
            <select className="input text-xs font-semibold" value={form.area} onChange={(e) => update('area', e.target.value)}>
              {BURKIT_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field label="Street Name (தெரு பெயர்)">
            <input className="input text-xs font-semibold" value={form.streetName || ''} onChange={(e) => update('streetName', e.target.value)} placeholder="Street Name" />
          </Field>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving && <Loader2 size={18} className="animate-spin" />}
          Save Changes
        </button>

        {!isAdmin && (
          <p className="text-xs text-center text-ink-700/50 dark:text-cloud-100/50">
            Editing will send this listing back for admin review.
          </p>
        )}
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
