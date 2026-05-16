import { useEffect, useMemo, useState } from 'react';
import { FiFolder, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiChevronRight, FiUpload, FiImage } from 'react-icons/fi';
import { api } from '../../services/api.js';
import Loader from '../../components/common/Loader.jsx';
import { Chip, ChipRow } from '../../components/common/Chips.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';
import toast from 'react-hot-toast';

const slugify = (s) => String(s || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const emptyForm = { name: '', slug: '', parentId: '', sortOrder: 0, isActive: true, image: '' };

const sortByDisplayOrder = (a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name);

export default function AdminCategories() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [categoryType, setCategoryType] = useState('top');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const requestConfirmation = useConfirm();

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/categories/admin/all');
      setList(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const tree = useMemo(() => {
    const parents = list.filter((c) => !c.parent).sort(sortByDisplayOrder);
    const childrenByParent = list.reduce((acc, c) => {
      if (c.parent) {
        const pid = c.parent._id || c.parent;
        (acc[pid] = acc[pid] || []).push(c);
      }
      return acc;
    }, {});
    return parents.map((p) => ({
      ...p,
      children: (childrenByParent[p._id] || []).sort(sortByDisplayOrder),
    }));
  }, [list]);

  const parentOptions = list.filter((c) => !c.parent);

  function getNextSortOrder(parentId = '') {
    const siblings = list.filter((c) => {
      const pid = c.parent?._id || c.parent || '';
      return parentId ? pid === parentId : !pid;
    });
    if (siblings.length === 0) return 0;
    return Math.max(...siblings.map((c) => Number(c.sortOrder) || 0)) + 1;
  }

  function startNew(parentId = '') {
    setEditing('new');
    setCategoryType(parentId ? 'sub' : 'top');
    setForm({ ...emptyForm, parentId, sortOrder: getNextSortOrder(parentId) });
  }

  function startEdit(c) {
    const parentId = c.parent?._id || c.parent || '';
    setEditing(c._id);
    setCategoryType(parentId ? 'sub' : 'top');
    setForm({
      name: c.name,
      slug: c.slug,
      parentId,
      sortOrder: c.sortOrder || 0,
      isActive: c.isActive !== false,
      image: c.image || '',
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
      setForm((f) => ({ ...f, image: r.data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function chooseCategoryType(type) {
    setCategoryType(type);
    if (type === 'top') {
      setForm((current) => ({
        ...current,
        parentId: '',
        sortOrder: getNextSortOrder(''),
      }));
      return;
    }

    const nextParentId = form.parentId || parentOptions.find((p) => p._id !== editing)?._id || '';
    setForm((current) => ({
      ...current,
      parentId: nextParentId,
      sortOrder: getNextSortOrder(nextParentId),
    }));
  }

  function chooseParent(parentId) {
    setForm((current) => ({
      ...current,
      parentId,
      sortOrder: getNextSortOrder(parentId),
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (categoryType === 'sub' && !form.parentId) {
        toast.error('Choose a parent category for this subcategory');
        return;
      }

      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        parent: categoryType === 'sub' ? form.parentId : null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: form.isActive,
        image: form.image || '',
      };
      if (editing === 'new') await api.post('/categories', payload);
      else await api.put(`/categories/${editing}`, payload);
      toast.success('Saved');
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(c) {
    const confirmed = await requestConfirmation({
      title: c.parent ? 'Delete subcategory?' : 'Delete category?',
      message: c.parent ? `Delete "${c.name}"?` : `Delete "${c.name}" and move its subcategories to top-level?`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
    await api.delete(`/categories/${c._id}`);
    await load();
  }

  if (loading) return <Loader />;

  const formParent = parentOptions.find((p) => p._id === form.parentId);
  const isSubcategoryForm = categoryType === 'sub';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl inline-flex items-center gap-2"><FiFolder className="text-primary" /> Categories</h1>
        <button className="btn-primary inline-flex items-center gap-2" onClick={() => startNew()}>
          <FiPlus /> New top-level category
        </button>
      </div>

      {editing && (
        <form onSubmit={submit} className="card p-5 space-y-4">
          <div>
            <h2 className="text-lg">
              {editing === 'new'
                ? (isSubcategoryForm ? `New subcategory under ${formParent?.name || 'category'}` : 'New top-level category')
                : 'Edit category'}
            </h2>
            <p className="text-sm text-ink/60 mt-1">
              {isSubcategoryForm
                ? 'Subcategories appear nested beneath their parent in category lists.'
                : 'Top-level categories appear as the main category groups.'}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Name</p>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} required />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Slug</p>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} required />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Category image</p>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="w-28 h-28 rounded-lg border border-ink/15 bg-canvas overflow-hidden flex items-center justify-center shrink-0">
                {form.image ? (
                  <img src={form.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <FiImage className="text-2xl text-ink/30" />
                )}
              </div>
              <div className="flex-1 min-w-[200px] space-y-2">
                <label className="btn-outline inline-flex items-center gap-2 cursor-pointer">
                  <FiUpload /> {uploading ? 'Uploading…' : (form.image ? 'Replace image' : 'Upload image')}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadImage(e.target.files?.[0])}
                    disabled={uploading}
                  />
                </label>
                {form.image && (
                  <button
                    type="button"
                    className="btn-ghost text-sm inline-flex items-center gap-1 text-danger"
                    onClick={() => setForm({ ...form, image: '' })}
                  >
                    <FiX /> Remove
                  </button>
                )}
                <p className="text-xs text-ink/50">PNG or JPG, up to 5MB. Square images work best — they show on the storefront category grid.</p>
                <input
                  type="url"
                  placeholder="Or paste an image URL"
                  className="input text-sm"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Category type</p>
            <ChipRow>
              <Chip active={categoryType === 'top'} onClick={() => chooseCategoryType('top')}>Top-level category</Chip>
              <Chip active={categoryType === 'sub'} onClick={() => chooseCategoryType('sub')}>Subcategory</Chip>
            </ChipRow>
          </div>

          {isSubcategoryForm && (
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-2">Show under</p>
              {parentOptions.filter((p) => p._id !== editing).length === 0 ? (
                <p className="rounded-md border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
                  Create a top-level category first, then add subcategories under it.
                </p>
              ) : (
                <ChipRow>
                  {parentOptions
                    .filter((p) => p._id !== editing) // can't be your own parent
                    .map((p) => (
                      <Chip key={p._id} active={form.parentId === p._id} onClick={() => chooseParent(p._id)}>
                        {p.name}
                      </Chip>
                    ))}
                </ChipRow>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-1.5">Display order</p>
              <input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
              <p className="text-xs text-ink/50 mt-1">Lower numbers show first. Items with the same number are sorted by name.</p>
            </div>
            <label className="text-sm inline-flex items-end gap-2 pb-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="accent-primary" />
              Active
            </label>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary inline-flex items-center gap-2" type="submit" disabled={saving}>
              <FiSave /> {saving ? 'Saving...' : 'Save category'}
            </button>
            <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => setEditing(null)} disabled={saving}>
              <FiX /> Cancel
            </button>
          </div>
        </form>
      )}

      <div className="card divide-y divide-ink/10">
        {tree.length === 0 && <p className="p-5 text-ink/60 text-sm">No categories yet.</p>}
        {tree.map((parent) => (
          <div key={parent._id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-canvas overflow-hidden flex items-center justify-center shrink-0 border border-ink/10">
                  {parent.image ? (
                    <img src={parent.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FiFolder className="text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold inline-flex items-center gap-2">
                    {parent.name}
                    {!parent.isActive && <span className="badge bg-ink/10 text-ink/60">disabled</span>}
                  </p>
                  <p className="text-xs text-ink/50 mt-0.5">
                    {parent.children.length} subcategory{parent.children.length === 1 ? '' : 'ies'} - Display order {parent.sortOrder}
                  </p>
                </div>
              </div>
              <div className="shrink-0 flex flex-wrap justify-end gap-1">
                <button className="btn-outline py-1.5 px-2 text-sm inline-flex items-center gap-1" onClick={() => startNew(parent._id)}>
                  <FiPlus /> Add subcategory
                </button>
                <button className="btn-ghost p-2 text-sm" onClick={() => startEdit(parent)} aria-label="Edit"><FiEdit2 /></button>
                <button className="btn-ghost p-2 text-sm text-danger" onClick={() => remove(parent)} aria-label="Delete"><FiTrash2 /></button>
              </div>
            </div>

            {parent.children.length > 0 && (
              <ul className="mt-3 pl-6 space-y-1.5">
                {parent.children.map((c) => (
                  <li key={c._id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1 text-ink/80">
                      <FiChevronRight className="text-ink/30" /> {c.name}
                      {!c.isActive && <span className="badge bg-ink/10 text-ink/60 ml-1">disabled</span>}
                      <span className="text-xs text-ink/40 ml-1">Order {c.sortOrder}</span>
                    </span>
                    <span className="space-x-1">
                      <button className="btn-ghost p-1.5" onClick={() => startEdit(c)} aria-label="Edit"><FiEdit2 /></button>
                      <button className="btn-ghost p-1.5 text-danger" onClick={() => remove(c)} aria-label="Delete"><FiTrash2 /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
