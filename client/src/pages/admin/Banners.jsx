import { useEffect, useState } from 'react';
import {
  FiImage, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiUpload,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';

const PLACEMENTS = [
  { value: 'home_hero', label: 'Home — Hero (top banner)' },
  { value: 'home_deal', label: 'Home — Deal of the Day (green card image)' },
  { value: 'home_new_arrivals', label: 'Home — New Arrivals (orange card image)' },
  { value: 'welcome', label: 'Welcome screens (3 onboarding slides — use Display order 0, 1, 2)' },
  { value: 'category_top', label: 'Category page — Top' },
  { value: 'promo_strip', label: 'Promo strip' },
];

const emptyForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  ctaLabel: '',
  placement: 'home_hero',
  sortOrder: 0,
  isActive: true,
};

export default function AdminBanners() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestConfirmation = useConfirm();

  async function load() {
    setLoading(true);
    try {
      const results = await Promise.all(
        PLACEMENTS.map((p) =>
          api.get('/banners', { params: { placement: p.value } }).then((r) => r.data.data || [])
        )
      );
      const merged = results.flat();
      setList(merged);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load banners');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function startNew() {
    setEditing('new');
    setForm({ ...emptyForm });
  }

  function startEdit(b) {
    setEditing(b._id);
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      imageUrl: b.imageUrl || '',
      linkUrl: b.linkUrl || '',
      ctaLabel: b.ctaLabel || '',
      placement: b.placement || 'home_hero',
      sortOrder: b.sortOrder || 0,
      isActive: b.isActive !== false,
    });
  }

  async function uploadImage(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5MB or smaller');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: r.data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.imageUrl) {
      toast.error('Add a banner image first');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl || undefined,
        ctaLabel: form.ctaLabel || undefined,
        placement: form.placement,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
      };
      if (editing === 'new') await api.post('/banners', payload);
      else await api.put(`/banners/${editing}`, payload);
      toast.success('Banner saved');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(b) {
    const confirmed = await requestConfirmation({
      title: 'Delete banner?',
      message: `Delete "${b.title}"?`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    await api.delete(`/banners/${b._id}`);
    await load();
  }

  if (loading) return <Loader />;

  const grouped = PLACEMENTS.map((p) => ({
    ...p,
    items: list.filter((b) => b.placement === p.value),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl inline-flex items-center gap-2">
          <FiImage className="text-primary" /> Banners
        </h1>
        <button className="btn-primary inline-flex items-center gap-2" onClick={startNew}>
          <FiPlus /> New banner
        </button>
      </div>

      <p className="text-sm text-ink/60">
        Hero banners appear at the top of the homepage. Upload an image (landscape works best, 1200×600+), set a title, subtitle and call-to-action link.
      </p>

      {editing && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <h2 className="text-lg">{editing === 'new' ? 'New banner' : 'Edit banner'}</h2>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Banner image</p>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-56 h-32 rounded-lg border border-ink/15 bg-canvas overflow-hidden flex items-center justify-center shrink-0">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FiImage className="text-3xl text-ink/30" />
                )}
              </div>
              <div className="flex-1 min-w-[220px] space-y-2">
                <label className="btn-outline inline-flex items-center gap-2 cursor-pointer">
                  <FiUpload /> {uploading ? 'Uploading…' : (form.imageUrl ? 'Replace image' : 'Upload image')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadImage(e.target.files?.[0])}
                    disabled={uploading}
                  />
                </label>
                {form.imageUrl && (
                  <button
                    type="button"
                    className="btn-ghost text-sm inline-flex items-center gap-1 text-danger"
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                  >
                    <FiX /> Remove
                  </button>
                )}
                <p className="text-xs text-ink/50">PNG or JPG, up to 5MB. Landscape orientation displays best.</p>
                <input
                  type="url"
                  placeholder="Or paste an image URL"
                  className="input text-sm"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-ink/50 -mt-2">
            Only the image is required. Leave the rest blank if you just want a visual banner — defaults will be used on the storefront.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Title <span className="text-ink/40 normal-case">(optional)</span></p>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Cook Better. Live Better."
              />
              <p className="text-xs text-ink/50 mt-1">Tip: use \n in the title to force a line break.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Subtitle / eyebrow <span className="text-ink/40 normal-case">(optional)</span></p>
              <input
                className="input"
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Top Quality Kitchenware"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Call-to-action label <span className="text-ink/40 normal-case">(optional)</span></p>
              <input
                className="input"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="Shop Now"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Call-to-action link <span className="text-ink/40 normal-case">(optional)</span></p>
              <input
                className="input"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                placeholder="/products?tag=deals"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Placement</p>
              <select
                className="input"
                value={form.placement}
                onChange={(e) => setForm({ ...form, placement: e.target.value })}
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Display order</p>
              <input
                className="input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              />
            </div>
            <label className="text-sm inline-flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="accent-primary"
              />
              Active
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save banner'}
            </button>
            <button
              type="button"
              className="btn-outline inline-flex items-center gap-2"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              <FiX /> Cancel
            </button>
          </div>
        </form>
      )}

      {grouped.map((group) => (
        <div key={group.value} className="card">
          <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
            <p className="font-semibold text-sm">{group.label}</p>
            <span className="text-xs text-ink/50">{group.items.length} banner{group.items.length === 1 ? '' : 's'}</span>
          </div>
          {group.items.length === 0 ? (
            <p className="p-4 text-sm text-ink/50">No banners yet for this placement.</p>
          ) : (
            <ul className="divide-y divide-ink/10">
              {group.items.map((b) => (
                <li key={b._id} className="p-4 flex items-center gap-4">
                  <div className="w-24 h-16 rounded-md bg-canvas overflow-hidden border border-ink/10 shrink-0">
                    {b.imageUrl ? (
                      <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ink/30 text-xs">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-ink/60 truncate">{b.subtitle}</p>}
                    <p className="text-xs text-ink/40 mt-0.5">
                      Order {b.sortOrder} {b.isActive ? '' : '· disabled'}
                    </p>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <button className="btn-ghost p-2" onClick={() => startEdit(b)} aria-label="Edit"><FiEdit2 /></button>
                    <button className="btn-ghost p-2 text-danger" onClick={() => remove(b)} aria-label="Delete"><FiTrash2 /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
