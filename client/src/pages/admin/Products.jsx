import { useEffect, useState } from 'react';
import {
  FiPackage, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiSearch, FiUpload, FiTag, FiFolderPlus,
} from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { fmt } from '../../utils/format.js';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: 'published', label: 'Published', color: 'bg-success/10 text-success' },
  { value: 'draft', label: 'Draft', color: 'bg-ink/10 text-ink/70' },
  { value: 'hidden', label: 'Hidden', color: 'bg-ink/20 text-ink/80' },
  { value: 'out_of_stock', label: 'Out of stock', color: 'bg-danger/10 text-danger' },
];

const emptyForm = {
  name: '', brand: '', sku: '',
  price: 0, discountPrice: '',
  stock: 0, lowStockThreshold: 5, deliveryWeight: '',
  description: '', shortDescription: '',
  newImageFiles: [], existingImages: [], removedImageUrls: [],
  categoryId: '',
  tagsInput: '', tags: [],
  variants: [], // [{ name: 'Color', optionsInput: 'Red, Black', options: ['Red','Black'] }]
  isFeatured: false,
  status: 'published',
};

function splitCommaList(s) {
  return String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AdminProducts() {
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [creatingCat, setCreatingCat] = useState(false);
  const requestConfirmation = useConfirm();
  const LOW_STOCK_THRESHOLD = 10;

  async function createCategoryInline() {
    const name = newCatName.trim();
    if (!name) return;
    setCreatingCat(true);
    try {
      const slug = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const { data } = await api.post('/categories', {
        name,
        slug,
        parent: newCatParentId || null,
      });
      const created = data.data;
      setCats((prev) => [...prev, created]);
      setForm((f) => ({ ...f, categoryId: created._id }));
      setNewCatName('');
      setNewCatParentId('');
      setShowNewCat(false);
      toast.success(`Category "${created.name}" created`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCreatingCat(false);
    }
  }

  async function load() {
    setLoading(true);
    const [p, c] = await Promise.all([api.get('/products', { params: { limit: 50 } }), api.get('/categories')]);
    setList(p.data.data);
    setCats(c.data.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function startNew() { setEditing('new'); setForm(emptyForm); }
  function startEdit(p) {
    setEditing(p._id);
    setForm({
      name: p.name || '',
      brand: p.brand || '',
      sku: p.sku || '',
      price: p.price ?? 0,
      discountPrice: p.discountPrice ?? '',
      stock: p.stock ?? 0,
      lowStockThreshold: p.lowStockThreshold ?? 5,
      deliveryWeight: p.deliveryWeight ?? '',
      description: p.description || '',
      shortDescription: p.shortDescription || '',
      newImageFiles: [],
      existingImages: (p.images || []).map((img) => ({ ...img })),
      removedImageUrls: [],
      categoryId: p.categories?.[0]?._id || p.categories?.[0] || '',
      tagsInput: '',
      tags: p.tags || [],
      variants: (p.variants || []).map((v) => ({
        name: v.name,
        options: v.options,
        optionsInput: v.options.join(', '),
      })),
      isFeatured: !!p.isFeatured,
      status: p.status || (p.isActive ? 'published' : 'hidden'),
    });
  }

  function addNewImageFiles(filesList) {
    const arr = Array.from(filesList || []);
    setForm((f) => ({ ...f, newImageFiles: [...f.newImageFiles, ...arr] }));
  }

  function removeNewFile(idx) {
    setForm((f) => ({ ...f, newImageFiles: f.newImageFiles.filter((_, i) => i !== idx) }));
  }

  function removeExistingImage(url) {
    setForm((f) => ({
      ...f,
      existingImages: f.existingImages.filter((img) => img.url !== url),
      removedImageUrls: [...f.removedImageUrls, url],
    }));
  }

  function addTag() {
    const newOnes = splitCommaList(form.tagsInput);
    if (!newOnes.length) return;
    const merged = Array.from(new Set([...form.tags, ...newOnes]));
    setForm({ ...form, tags: merged, tagsInput: '' });
  }
  function removeTag(t) {
    setForm({ ...form, tags: form.tags.filter((x) => x !== t) });
  }

  function addVariant() {
    setForm((f) => ({ ...f, variants: [...f.variants, { name: '', optionsInput: '', options: [] }] }));
  }
  function updateVariant(idx, patch) {
    setForm((f) => ({
      ...f,
      variants: f.variants.map((v, i) => {
        if (i !== idx) return v;
        const next = { ...v, ...patch };
        if ('optionsInput' in patch) next.options = splitCommaList(next.optionsInput);
        return next;
      }),
    }));
  }
  function removeVariant(idx) {
    setForm((f) => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      // Upload any new images first
      const uploaded = [];
      for (const file of form.newImageFiles) {
        const fd = new FormData();
        fd.append('image', file);
        const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        uploaded.push({ url: r.data.url, isPrimary: false });
      }

      const allImages = [...form.existingImages, ...uploaded];
      if (allImages.length && !allImages.some((i) => i.isPrimary)) allImages[0].isPrimary = true;

      const cleanVariants = form.variants
        .map((v) => ({ name: v.name.trim(), options: v.options || [] }))
        .filter((v) => v.name && v.options.length > 0);

      const payload = {
        name: form.name,
        brand: form.brand || undefined,
        sku: form.sku || undefined,
        price: Number(form.price),
        discountPrice: form.discountPrice !== '' ? Number(form.discountPrice) : undefined,
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        deliveryWeight: form.deliveryWeight !== '' ? Number(form.deliveryWeight) : undefined,
        description: form.description,
        shortDescription: form.shortDescription || undefined,
        images: allImages,
        categories: form.categoryId ? [form.categoryId] : [],
        tags: form.tags,
        variants: cleanVariants,
        isFeatured: form.isFeatured,
        status: form.status,
      };

      if (editing === 'new') await api.post('/products', payload);
      else await api.put(`/products/${editing}`, payload);

      toast.success('Saved');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(product) {
    const confirmed = await requestConfirmation({
      title: 'Delete product?',
      message: `Delete "${product.name}"? This removes it from the store.`,
      confirmLabel: 'Delete product',
    });
    if (!confirmed) return;
    await api.delete(`/products/${product._id}`);
    await load();
  }

  if (loading) return <Loader />;

  const visible = list.filter((p) => {
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = showLowStock ? p.stock < LOW_STOCK_THRESHOLD : true;
    return matchesSearch && matchesLowStock;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl inline-flex items-center gap-2"><FiPackage className="text-primary" /> Products</h1>
        <div className="flex items-center gap-4">
          <label className="text-sm inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-ink/10 shadow-sm">
            <input type="checkbox" checked={showLowStock} onChange={(e) => setShowLowStock(e.target.checked)} className="accent-primary" />
            Low stock only
          </label>
          <button className="btn-primary inline-flex items-center gap-2" onClick={startNew}>
            <FiPlus /> New product
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
        <input type="search" className="input pl-10" placeholder="Search by name or brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {editing && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <h2 className="text-lg">{editing === 'new' ? 'New product' : 'Edit product'}</h2>

          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input className="input" placeholder="Brand (optional)" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>

          <input className="input" placeholder="SKU (optional)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Price (GHS)</p>
              <input className="input" type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Discount</p>
              <input className="input" type="number" min={0} step="0.01" placeholder="Optional" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Stock</p>
              <input className="input" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Weight (kg)</p>
              <input className="input" type="number" min={0} step="0.01" placeholder="0" value={form.deliveryWeight} onChange={(e) => setForm({ ...form, deliveryWeight: e.target.value })} />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Status</p>
            <ChipRow>
              {STATUSES.map((s) => (
                <Chip key={s.value} active={form.status === s.value} onClick={() => setForm({ ...form, status: s.value })}>
                  {s.label}
                </Chip>
              ))}
            </ChipRow>
          </div>

          {/* Images gallery */}
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Product images</p>
            <div className="flex flex-wrap gap-3">
              {form.existingImages.map((img) => (
                <div key={img.url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-ink/10 bg-canvas group">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExistingImage(img.url)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition" aria-label="Remove">
                    <FiX />
                  </button>
                </div>
              ))}
              {form.newImageFiles.map((file, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-primary/40 bg-canvas group">
                  <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 badge bg-primary text-white text-[10px]">NEW</span>
                  <button type="button" onClick={() => removeNewFile(idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition" aria-label="Remove">
                    <FiX />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-ink/20 hover:border-primary text-ink/50 hover:text-primary cursor-pointer flex flex-col items-center justify-center gap-1 text-xs">
                <FiUpload className="text-lg" />
                Add
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addNewImageFiles(e.target.files); e.target.value = ''; }} />
              </label>
            </div>
            <p className="text-xs text-ink/50 mt-2">Up to 5MB per image. First image is used as the primary thumbnail.</p>
          </div>

          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-ink/50">Category</p>
              <button
                type="button"
                onClick={() => setShowNewCat((s) => !s)}
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
              >
                <FiFolderPlus /> {showNewCat ? 'Cancel' : 'New category'}
              </button>
            </div>

            <ChipRow>
              <Chip active={!form.categoryId} onClick={() => setForm({ ...form, categoryId: '' })}>None</Chip>
              {cats.map((c) => (
                <Chip key={c._id} active={form.categoryId === c._id} onClick={() => setForm({ ...form, categoryId: c._id })}>
                  {c.parent ? '↳ ' : ''}{c.name}
                </Chip>
              ))}
            </ChipRow>

            {showNewCat && (
              <div className="mt-3 p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Category name (e.g. Slow Cookers)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategoryInline(); } }}
                  />
                  <select
                    className="input text-sm max-w-[40%]"
                    value={newCatParentId}
                    onChange={(e) => setNewCatParentId(e.target.value)}
                  >
                    <option value="">Top-level</option>
                    {cats.filter((c) => !c.parent).map((p) => (
                      <option key={p._id} value={p._id}>under {p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={createCategoryInline}
                    disabled={!newCatName.trim() || creatingCat}
                    className="btn-primary text-sm shrink-0"
                  >
                    {creatingCat ? 'Saving...' : 'Create'}
                  </button>
                </div>
                <p className="text-[11px] text-ink/60">
                  Creates the category and selects it for this product. Manage the full tree on the Categories page.
                </p>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 badge bg-primary/10 text-primary">
                  <FiTag className="text-[10px]" /> {t}
                  <button type="button" onClick={() => removeTag(t)} className="ml-1 text-ink/40 hover:text-danger"><FiX /></button>
                </span>
              ))}
              {form.tags.length === 0 && <span className="text-xs text-ink/50">No tags yet</span>}
            </div>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="e.g. non-stick, gift-ready, ceramic"
                value={form.tagsInput}
                onChange={(e) => setForm({ ...form, tagsInput: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
              <button type="button" className="btn-outline" onClick={addTag}>Add</button>
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-wide text-ink/50">Variants</p>
              <button type="button" onClick={addVariant} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                <FiPlus /> Add variant
              </button>
            </div>
            {form.variants.length === 0 && <p className="text-xs text-ink/50">e.g. Color: Red, Black • Size: Small, Medium, Large</p>}
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid sm:grid-cols-[160px_1fr_auto] gap-2 items-start">
                  <input
                    className="input"
                    placeholder="Name (Color, Size...)"
                    value={v.name}
                    onChange={(e) => updateVariant(i, { name: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Comma-separated options"
                    value={v.optionsInput}
                    onChange={(e) => updateVariant(i, { optionsInput: e.target.value })}
                  />
                  <button type="button" onClick={() => removeVariant(i)} className="btn-ghost p-2 text-danger" aria-label="Remove variant">
                    <FiTrash2 />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Short description</p>
            <input className="input" placeholder="One-line teaser shown on cards" maxLength={500} value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Description</p>
            <textarea className="input" rows={4} placeholder="Full description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
            Show on Featured section
          </label>

          <div className="flex gap-2 pt-2">
            <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save product'}
            </button>
            <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => setEditing(null)} disabled={saving}>
              <FiX /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {visible.length === 0 && <p className="text-ink/60 text-sm">No products match.</p>}
        {visible.map((p) => (
          <div key={p._id} className="card p-3 flex gap-3">
            <div className="w-16 h-16 rounded bg-canvas overflow-hidden shrink-0">
              {p.images?.[0]?.url && <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              {p.brand && <p className="text-xs text-ink/50 truncate">{p.brand}</p>}
              <p className="text-sm text-primary">{fmt(p.price, p.currency)}</p>
              <p className={`text-xs ${p.stock < LOW_STOCK_THRESHOLD ? 'text-danger font-semibold' : 'text-ink/60'}`}>
                Stock: {p.stock} {p.stock < LOW_STOCK_THRESHOLD && '(Low)'}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <button className="btn-ghost p-1.5" onClick={() => startEdit(p)} aria-label="Edit"><FiEdit2 /></button>
              <button className="btn-ghost p-1.5 text-danger" onClick={() => remove(p)} aria-label="Delete"><FiTrash2 /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-canvas">
            <tr className="text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Price</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const statusInfo = STATUSES.find((s) => s.value === (p.status || (p.isActive ? 'published' : 'hidden'))) || STATUSES[0];
              return (
                <tr key={p._id} className="border-t border-ink/10">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3 text-ink/70">{p.brand || '—'}</td>
                  <td className="p-3">{fmt(p.price, p.currency)}</td>
                  <td className="p-3">
                    <span className={p.stock < LOW_STOCK_THRESHOLD ? 'text-danger font-medium' : ''}>{p.stock}</span>
                    {p.stock < LOW_STOCK_THRESHOLD && <span className="badge bg-danger/10 text-danger text-[10px] ml-1.5">LOW</span>}
                  </td>
                  <td className="p-3">
                    <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button className="btn-ghost py-1 px-2 text-sm inline-flex items-center gap-1" onClick={() => startEdit(p)}>
                      <FiEdit2 /> Edit
                    </button>
                    <button className="btn-ghost py-1 px-2 text-sm text-danger inline-flex items-center gap-1" onClick={() => remove(p)}>
                      <FiTrash2 /> Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
