import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, Check, ImagePlus, Loader2, Store, AlertTriangle, Sparkles } from 'lucide-react';
import api from '../api/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/Loader.jsx';
import { SHOP_CATEGORIES, GROCERY_SUBCATEGORIES } from '../data/groceryDefaults.js';
import { BURKIT_AREAS } from '../data/areaDefaults.js';

export default function EditShop() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [populating, setPopulating] = useState(false);
  const [error, setError] = useState('');
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);

  // Modal for adding/editing a shop product
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    productName: '',
    tamilName: '',
    subCategory: 'General',
    unitScale: '1Kg',
    price: '',
    inStock: true,
  });
  const [itemSaving, setItemSaving] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([api.getShop(id), api.getShopProducts({ shopId: id })])
      .then(([s, p]) => {
        setShop(s);
        setProducts(Array.isArray(p) ? p : []);
      })
      .catch((err) => setError(err.message || 'Failed to load shop'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handlePopulateDefaults() {
    if (!shop) return;
    setPopulating(true);
    try {
      await api.populateShopDefaults(shop.shopId);
      load();
    } catch (err) {
      alert(err.message || 'Failed to populate default items');
    } finally {
      setPopulating(false);
    }
  }

  function updateShopField(field, value) {
    setShop((s) => ({ ...s, [field]: value }));
  }

  async function handleSaveShop(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.updateShop({
        shopId: shop.shopId,
        shopName: shop.shopName,
        whatsappNo: shop.whatsappNo,
        category: shop.category,
        villageName: shop.villageName,
        streetName: shop.streetName || '',
        description: shop.description,
        shopPhoto: shop.shopPhoto,
        status: isAdmin ? shop.status : 'Pending',
      });
      alert('Shop details updated successfully!');
      navigate(`/shop/${shop.shopId}`);
    } catch (err) {
      setError(err.message || 'Failed to update shop');
    } finally {
      setSaving(false);
    }
  }

  function openAddItemModal() {
    setEditingItem(null);
    setItemForm({
      productName: '',
      tamilName: '',
      subCategory: 'General',
      unitScale: '1Kg',
      price: '',
      inStock: true,
    });
    setIsProductModalOpen(true);
  }

  function openEditItemModal(item) {
    setEditingItem(item);
    setItemForm({
      productName: item.productName || '',
      tamilName: item.tamilName || '',
      subCategory: item.subCategory || 'General',
      unitScale: item.unitScale || '1Kg',
      price: item.price || '',
      inStock: item.inStock !== false,
    });
    setIsProductModalOpen(true);
  }

  async function handleSaveProduct(e) {
    e.preventDefault();
    const name = (itemForm.tamilName || itemForm.productName).trim();
    if (!name) return alert('Item name is required (பொருளின் பெயர் தேவை)');

    const payload = {
      ...itemForm,
      tamilName: name,
      productName: name,
    };

    setItemSaving(true);
    try {
      if (editingItem) {
        await api.updateShopProduct({
          productId: editingItem.productId,
          shopId: shop.shopId,
          ...payload,
        });
      } else {
        await api.createShopProduct({
          shopId: shop.shopId,
          ...payload,
        });
      }
      setIsProductModalOpen(false);
      load();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    } finally {
      setItemSaving(false);
    }
  }

  async function handleDeleteProduct(item) {
    if (!confirm(`Are you sure you want to delete "${item.productName}"?`)) return;
    try {
      await api.deleteShopProduct(item.productId);
      load();
    } catch (err) {
      alert(err.message || 'Failed to delete product');
    }
  }

  if (loading) return <Loader />;
  if (!shop) return <div className="p-8 text-center text-sm text-ink-700/50">Shop not found.</div>;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl">Edit Shop & Products</h1>
          <p className="text-xs text-ink-700/60 dark:text-cloud-100/60">{shop.shopName}</p>
        </div>
      </div>

      {/* Shop Info Edit Form */}
      <form onSubmit={handleSaveShop} className="px-4 py-3 space-y-3.5">
        <div className="card p-4 space-y-3 rounded-2xl">
          <h2 className="font-bold text-sm text-[#ea580c] uppercase tracking-wider">Shop Details</h2>

          <div>
            <label className="text-xs font-bold">Shop Name *</label>
            <input
              type="text"
              className="input mt-1 text-sm font-semibold"
              value={shop.shopName || ''}
              onChange={(e) => updateShopField('shopName', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold">WhatsApp Mobile Number *</label>
            <input
              type="text"
              className="input mt-1 text-sm font-mono"
              value={shop.whatsappNo || ''}
              onChange={(e) => updateShopField('whatsappNo', e.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold">Category</label>
              <select
                className="input mt-1 text-xs font-bold"
                value={shop.category || 'Grocery'}
                onChange={(e) => updateShopField('category', e.target.value)}
              >
                {SHOP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold">Village / Area Name (ஊரின் பெயர் / பகுதி) *</label>
              <select
                className="input mt-1 text-xs font-semibold"
                value={shop.villageName || ''}
                onChange={(e) => updateShopField('villageName', e.target.value)}
                required
              >
                {BURKIT_AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold">Street Name (தெரு பெயர்)</label>
              <input
                type="text"
                className="input mt-1 text-xs font-semibold"
                placeholder="e.g. 1st Street, Main Road"
                value={shop.streetName || ''}
                onChange={(e) => updateShopField('streetName', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold">Description</label>
            <textarea
              className="input mt-1 text-xs min-h-[70px]"
              value={shop.description || ''}
              onChange={(e) => updateShopField('description', e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-rose-600 font-bold">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Save Shop Details
          </button>
        </div>
      </form>

      {/* Manage Shop Products Header */}
      <div className="px-4 mt-4 flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-ink-900 dark:text-cloud-100">
            Shop Products Catalog ({products.length})
          </h2>
          <p className="text-xs text-ink-700/60 dark:text-cloud-100/60">Add, edit, or remove items in this store</p>
        </div>

        <div className="flex items-center gap-2">
          {shop.category === 'Grocery' && (
            <button
              type="button"
              disabled={populating}
              onClick={handlePopulateDefaults}
              className="py-2 px-3 rounded-xl bg-orange-100 text-[#ea580c] dark:bg-ink-700 dark:text-orange-300 text-xs font-extrabold flex items-center gap-1 shadow-sm hover:bg-orange-200"
              title="Load Default Tamil Grocery Catalog"
            >
              {populating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Defaults
            </button>
          )}
          <button
            type="button"
            onClick={openAddItemModal}
            className="py-2 px-3 rounded-xl bg-[#ea580c] text-white text-xs font-extrabold flex items-center gap-1 shadow-md hover:bg-orange-700"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Shop Products List */}
      <div className="px-4 mt-3 space-y-2.5">
        {products.length === 0 ? (
          <div className="card p-6 text-center text-xs text-ink-700/50 space-y-3">
            <p>No products added yet.</p>
            {shop.category === 'Grocery' && (
              <button
                type="button"
                disabled={populating}
                onClick={handlePopulateDefaults}
                className="btn-primary py-2 px-4 text-xs mx-auto flex items-center justify-center gap-1.5 shadow-md"
              >
                {populating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Load Default Grocery Catalog (மளிகைப் பொருட்களைச் சேர்க்க)
              </button>
            )}
          </div>
        ) : (
          products.map((p) => (
            <div key={p.productId} className="card p-3 flex items-center justify-between gap-2 rounded-2xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-sm">{p.tamilName || p.productName}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="font-bold text-[#ea580c]">{p.price ? `₹${p.price}` : 'No Price'}</span>
                  <span className="text-[10px] bg-cloud-200 dark:bg-ink-700 px-2 py-0.5 rounded font-semibold">{p.unitScale}</span>
                  <span className="text-[10px] text-ink-700/60">{p.subCategory}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditItemModal(p)}
                  className="p-2 rounded-xl card text-ink-700 hover:bg-cloud-200"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDeleteProduct(p)}
                  className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Product Add / Edit Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-md p-5 space-y-4 shadow-2xl rounded-3xl border border-cloud-200 dark:border-ink-700 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg">
              {editingItem ? 'Edit Product Item' : 'Add New Product Item'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-ink-800 dark:text-cloud-100">Item Name (பொருளின் பெயர்) *</label>
                <input
                  type="text"
                  className="input mt-1 text-sm font-semibold"
                  placeholder="e.g. தக்காளி, மிளகாய் பொடி, தேங்காய் எண்ணெய்..."
                  value={itemForm.tamilName || itemForm.productName}
                  onChange={(e) => setItemForm({ ...itemForm, tamilName: e.target.value, productName: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold">Sub-Category</label>
                  <select
                    className="input mt-1 text-xs font-semibold"
                    value={itemForm.subCategory}
                    onChange={(e) => setItemForm({ ...itemForm, subCategory: e.target.value })}
                  >
                    {GROCERY_SUBCATEGORIES.filter((c) => c !== 'All').map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold">Default Scale / Unit</label>
                  <select
                    className="input mt-1 text-xs font-semibold"
                    value={itemForm.unitScale || '1Kg'}
                    onChange={(e) => setItemForm({ ...itemForm, unitScale: e.target.value })}
                  >
                    {itemForm.unitScale && !['50g','100g','250g','500g','750g','1Kg','1.5Kg','2Kg','5Kg','100ml','250ml','500ml','1 Litre','2 Litre','5 Litre','1 Pc','1 Packet','1 Box','1 Set'].includes(itemForm.unitScale) && (
                      <option value={itemForm.unitScale}>{itemForm.unitScale}</option>
                    )}

                    <optgroup label="Weight (எடை)">
                      <option value="50g">50g</option>
                      <option value="100g">100g</option>
                      <option value="250g">250g</option>
                      <option value="500g">500g</option>
                      <option value="750g">750g</option>
                      <option value="1Kg">1Kg</option>
                      <option value="1.5Kg">1.5Kg</option>
                      <option value="2Kg">2Kg</option>
                      <option value="5Kg">5Kg</option>
                    </optgroup>

                    <optgroup label="Liquid (திரவம் / எண்ணெய்)">
                      <option value="100ml">100ml</option>
                      <option value="250ml">250ml</option>
                      <option value="500ml">500ml</option>
                      <option value="1 Litre">1 Litre</option>
                      <option value="2 Litre">2 Litre</option>
                      <option value="5 Litre">5 Litre</option>
                    </optgroup>

                    <optgroup label="Count / Pack (எண்ணிக்கை)">
                      <option value="1 Pc">1 Pc (ஒன்று)</option>
                      <option value="1 Packet">1 Packet (பாக்கெட்)</option>
                      <option value="1 Box">1 Box (பெட்டி)</option>
                      <option value="1 Set">1 Set (செட்)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold">Price (₹) (optional)</label>
                <input
                  type="text"
                  className="input mt-1 text-sm font-bold"
                  placeholder="e.g. 40"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 btn-secondary text-xs py-2.5 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={itemSaving}
                  className="flex-1 btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
                >
                  {itemSaving && <Loader2 size={14} className="animate-spin" />}
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
