import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Edit3, Trash2, Eye, ToggleLeft, ToggleRight,
  Smartphone, Car, Sofa, Shirt, Utensils, Home, Briefcase, Wrench, Leaf, Grid,
  AlertTriangle, Loader2, Calendar, Hash, Tag, Layers, Search
} from 'lucide-react';
import api from '../api/api.js';
import Loader from '../components/Loader.jsx';

const ICON_MAP = {
  smartphone: Smartphone,
  car: Car,
  sofa: Sofa,
  shirt: Shirt,
  utensils: Utensils,
  home: Home,
  briefcase: Briefcase,
  wrench: Wrench,
  leaf: Leaf,
  grid: Grid,
  tag: Tag,
  layers: Layers,
};

const POPULAR_ICONS = [
  'smartphone', 'car', 'sofa', 'shirt', 'utensils',
  'home', 'briefcase', 'wrench', 'leaf', 'grid', 'tag', 'layers'
];

export default function AdminCategories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({
    categoryName: '',
    categoryIcon: 'grid',
    description: '',
    displayOrder: 1,
    status: 'Active',
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  function load() {
    setLoading(true);
    setError('');
    api.getCategories({ all: 'true' })
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('AdminCategories error:', err);
        setError(err.message || 'Failed to load categories');
        setCategories([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openAddModal() {
    setEditingCategory(null);
    setForm({
      categoryName: '',
      categoryIcon: 'grid',
      description: '',
      displayOrder: (categories.length + 1),
      status: 'Active',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  function openEditModal(cat) {
    setEditingCategory(cat);
    setForm({
      categoryName: cat.categoryName || '',
      categoryIcon: cat.categoryIcon || cat.icon || 'grid',
      description: cat.description || '',
      displayOrder: cat.displayOrder !== undefined ? cat.displayOrder : 99,
      status: cat.status || 'Active',
    });
    setFormError('');
    setIsFormOpen(true);
  }

  async function handleToggleStatus(cat) {
    setTogglingId(cat.categoryId);
    try {
      const newStatus = cat.status === 'Active' ? 'Inactive' : 'Active';
      await api.toggleCategoryStatus(cat.categoryId, newStatus);
      load();
    } catch (err) {
      alert(err.message || 'Failed to change category status');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleSaveCategory(e) {
    e.preventDefault();
    setFormError('');
    if (!form.categoryName.trim()) {
      setFormError('Category name is required');
      return;
    }
    setFormSaving(true);
    try {
      if (editingCategory) {
        await api.updateCategory({
          categoryId: editingCategory.categoryId,
          categoryName: form.categoryName.trim(),
          categoryIcon: form.categoryIcon,
          description: form.description.trim(),
          displayOrder: Number(form.displayOrder) || 1,
          status: form.status,
        });
      } else {
        await api.createCategory({
          categoryName: form.categoryName.trim(),
          categoryIcon: form.categoryIcon,
          description: form.description.trim(),
          displayOrder: Number(form.displayOrder) || 1,
          status: form.status,
        });
      }
      setIsFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setFormSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError('');
    setDeleting(true);
    try {
      await api.deleteCategory(deleteTarget.categoryId);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
    }
  }

  const categoryList = Array.isArray(categories) ? categories : [];
  const filteredCategories = categoryList.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.categoryName || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="pb-10">
      {/* Header */}
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full card flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-display font-bold text-xl">Manage Categories</h1>
            <p className="text-xs text-ink-700/50 dark:text-cloud-100/50">{categoryList.length} total categories</p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="btn-primary py-2 px-3 text-xs flex items-center gap-1.5 shadow-md"
        >
          <Plus size={15} /> Add Category
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-5 mt-3">
        <div className="relative flex items-center">
          <Search size={16} className="absolute left-3 text-ink-700/40 dark:text-cloud-100/40" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-9 text-xs"
          />
        </div>
      </div>

      {/* Categories List */}
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
        ) : filteredCategories.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-700/50 dark:text-cloud-100/50">
            No categories found.
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const IconComp = ICON_MAP[cat.categoryIcon || cat.icon] || Grid;
            const isActive = cat.status === 'Active';
            const isToggling = togglingId === cat.categoryId;

            return (
              <div key={cat.categoryId} className="card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isActive 
                      ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300' 
                      : 'bg-cloud-200 dark:bg-ink-700 text-ink-700/40 dark:text-cloud-100/40'
                  }`}>
                    <IconComp size={22} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm truncate">{cat.categoryName}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        isActive
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-orange-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300'
                      }`}>
                        {cat.status}
                      </span>
                    </div>

                    {cat.description && (
                      <p className="text-xs text-ink-700/60 dark:text-cloud-100/60 mt-0.5 line-clamp-2">
                        {cat.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-ink-700/50 dark:text-cloud-100/50">
                      <span className="font-semibold text-brand-600 dark:text-brand-400">
                        {cat.totalProducts || 0} Products
                      </span>
                      <span>Order: #{cat.displayOrder || 99}</span>
                      {cat.createdAt && <span>Added {formatDate(cat.createdAt)}</span>}
                    </div>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="pt-2 border-t border-cloud-200 dark:border-ink-700/50 flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/market?category=${encodeURIComponent(cat.categoryName)}`)}
                    className="text-xs text-brand-600 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Eye size={13} /> View Products
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Toggle Status */}
                    <button
                      disabled={isToggling}
                      onClick={() => handleToggleStatus(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                        isActive
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                          : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
                      }`}
                    >
                      {isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                      {isActive ? 'Disable' : 'Enable'}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEditModal(cat)}
                      className="p-1.5 rounded-lg card text-ink-700 dark:text-cloud-100/70 hover:bg-cloud-200"
                      title="Edit Category"
                    >
                      <Edit3 size={14} />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => {
                        setDeleteError('');
                        setDeleteTarget(cat);
                      }}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 hover:bg-rose-100"
                      title="Delete Category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-md p-5 space-y-4 shadow-2xl rounded-2xl border border-cloud-200 dark:border-ink-700 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display font-bold text-lg">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="text-xs font-semibold">Category Name *</label>
                <input
                  type="text"
                  className="input mt-1 text-sm"
                  placeholder="e.g. Electronics, Fashion"
                  value={form.categoryName}
                  onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Select Icon</label>
                <div className="grid grid-cols-6 gap-2 mt-1.5">
                  {POPULAR_ICONS.map((iconKey) => {
                    const IconC = ICON_MAP[iconKey];
                    const isSelected = form.categoryIcon === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setForm({ ...form, categoryIcon: iconKey })}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                            : 'card text-ink-700/60 hover:bg-cloud-200'
                        }`}
                      >
                        <IconC size={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Description (Optional)</label>
                <textarea
                  className="input mt-1 text-xs min-h-[70px]"
                  placeholder="Brief summary of items in this category"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    className="input mt-1 text-sm"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Status</label>
                  <select
                    className="input mt-1 text-sm font-semibold"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={formSaving}
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 btn-secondary text-xs py-2.5 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="flex-1 btn-primary text-xs py-2.5 font-semibold flex items-center justify-center gap-1.5 shadow-md"
                >
                  {formSaving && <Loader2 size={14} className="animate-spin" />}
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
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
              <h3 className="font-display font-bold text-lg">Delete Category?</h3>
              <p className="text-xs text-ink-700/70 dark:text-cloud-100/70">
                Are you sure you want to delete <span className="font-semibold text-ink-900 dark:text-white">"{deleteTarget.categoryName}"</span>?
              </p>
            </div>

            {deleteError ? (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 text-xs space-y-1 text-left">
                <p className="font-bold flex items-center gap-1">
                  <AlertTriangle size={14} /> Cannot Delete Category
                </p>
                <p>{deleteError}</p>
              </div>
            ) : deleteTarget.totalProducts > 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs text-left">
                ⚠️ This category currently has <strong>{deleteTarget.totalProducts} products</strong>. You must delete or reassign those products first.
              </div>
            ) : null}

            <div className="flex gap-2 pt-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 btn-secondary text-xs py-2.5 font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={deleting || (deleteTarget.totalProducts > 0 && !deleteError)}
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
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}
