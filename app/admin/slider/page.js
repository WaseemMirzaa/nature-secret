'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getAdminSlides, createSlide, updateSlide, deleteSlide, uploadSlideImage, formatApiError } from '@/lib/api';

function hasAdminToken() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('nature_secret_admin');
    const data = raw ? JSON.parse(raw) : null;
    return !!data?.access_token;
  } catch {
    return false;
  }
}

export default function AdminSliderPage() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ imageUrl: '', alt: '', title: '', href: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAdd, setShowAdd] = useState(false);

  const apiBase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : '';

  const [uploadSlug, setUploadSlug] = useState('');
  const handleUpload = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    uploadSlideImage(file, { slug: uploadSlug, alt: form.alt, onProgress: setUploadProgress })
      .then((res) => {
        const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
        setForm((f) => ({ ...f, imageUrl: url, alt: res.alt || f.alt }));
      })
      .catch((err) => setError(formatApiError(err)))
      .finally(() => { setUploading(false); setUploadProgress(0); e.target.value = ''; });
  };

  const load = () => {
    setLoading(true);
    setError('');
    getAdminSlides()
      .then((data) => setSlides(Array.isArray(data) ? data : []))
      .catch((e) => {
        if (e?.status === 401) return; // layout will redirect to login
        setError(formatApiError(e));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (hasAdminToken()) load();
    else setLoading(false);
  }, []);

  const openEdit = (slide) => {
    setEditingId(slide.id);
    setForm({ imageUrl: slide.imageUrl || '', alt: slide.alt || '', title: slide.title || '', href: slide.href || '' });
  };

  const openAdd = () => {
    setShowAdd(true);
    setForm({ imageUrl: '', alt: '', title: '', href: '/shop' });
  };

  const cancel = () => {
    setEditingId(null);
    setShowAdd(false);
    setError('');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    setError('');
    try {
      await updateSlide(editingId, form);
      load();
      cancel();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    if (!form.imageUrl?.trim()) {
      setError('Upload an image first (required).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await createSlide(form);
      load();
      cancel();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Remove this slide?')) return;
    setSaving(true);
    setError('');
    try {
      await deleteSlide(id);
      load();
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-neutral-500">Loading slides…</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Home page slider</h1>
        <button
          type="button"
          onClick={openAdd}
          className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium"
        >
          Add slide
        </button>
      </div>
      <p className="mt-1 text-sm text-neutral-500">Replace or reorder hero images shown on the home page.</p>

      {error && <p className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</p>}

      {showAdd && (
        <div className="mt-6 p-6 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-lg font-medium text-neutral-900 mb-4">New slide</h2>
          <div className="grid gap-4 max-w-xl">
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Image (required)</span>
              <div className="mt-1 flex flex-col gap-2">
                <input type="text" value={uploadSlug} onChange={(e) => setUploadSlug(e.target.value)} placeholder="Slug for filename (optional)" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleUpload}
                  disabled={uploading}
                  required={!form.imageUrl}
                  className="text-sm text-neutral-600 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                />
                {uploading && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div className="h-full bg-neutral-900 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <span className="text-sm text-neutral-600 whitespace-nowrap">{uploadProgress}%</span>
                  </div>
                )}
                {form.imageUrl && <span className="text-xs text-green-600">Image uploaded.</span>}
              </div>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Alt text (SEO)</span>
              <input
                type="text"
                value={form.alt}
                onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Title</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-neutral-700">Link (href)</span>
              <input
                type="text"
                value={form.href}
                onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm"
                placeholder="/shop or /shop?category=..."
              />
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={saveNew} disabled={saving} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50">Save</button>
              <button type="button" onClick={cancel} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ul className="mt-6 space-y-4">
        {slides.map((slide) => (
          <li key={slide.id} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden flex flex-col sm:flex-row">
            <div className="relative w-full sm:w-48 h-32 shrink-0 bg-neutral-100">
              {slide.imageUrl ? (
                <Image src={slide.imageUrl} alt={slide.alt || 'Slide'} fill className="object-cover" sizes="192px" unoptimized />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm">No image</span>
              )}
            </div>
            <div className="flex-1 p-4 min-w-0">
              {editingId === slide.id ? (
                <div className="space-y-3">
                  <div>
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleUpload} disabled={uploading} className="text-sm mb-2 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs" />
                    {uploading && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden max-w-[120px]">
                          <div className="h-full bg-neutral-700 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                        </div>
                        <span className="text-xs text-neutral-600">{uploadProgress}%</span>
                      </div>
                    )}
                    <input type="url" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="Image URL" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm mt-1" />
                  </div>
                  <input type="text" value={form.alt} onChange={(e) => setForm((f) => ({ ...f, alt: e.target.value }))} placeholder="Alt text" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                  <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                  <input type="text" value={form.href} onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))} placeholder="Link" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEdit} disabled={saving} className="rounded-lg bg-neutral-900 text-white px-3 py-1.5 text-sm disabled:opacity-50">Save</button>
                    <button type="button" onClick={cancel} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-medium text-neutral-900 truncate">{slide.title || '—'}</p>
                  <p className="text-sm text-neutral-500 truncate">{slide.alt || '—'}</p>
                  <p className="text-xs text-neutral-400 mt-1 truncate">{slide.href || '—'}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => openEdit(slide)} className="text-sm font-medium text-neutral-700 hover:text-neutral-900">Edit</button>
                    <button type="button" onClick={() => remove(slide.id)} className="text-sm text-red-600 hover:text-red-700">Delete</button>
                  </div>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {slides.length === 0 && !showAdd && <p className="mt-6 text-neutral-500">No slides yet. Add one to show on the home page.</p>}
    </div>
  );
}
