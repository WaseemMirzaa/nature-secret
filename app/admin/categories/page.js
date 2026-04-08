'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from '@/components/Link';
import {
  getAdminCategories,
  postAdminCategory,
  patchAdminCategory,
  deleteAdminCategory,
  formatApiError,
} from '@/lib/api';
import { InlineLoader } from '@/components/ui/PageLoader';

function slugFromName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newSlugTouched, setNewSlugTouched] = useState(false);

  const load = useCallback(() => {
    setError('');
    return getAdminCategories()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setRows(arr);
        const d = {};
        arr.forEach((c) => {
          d[c.id] = { name: c.name || '', slug: c.slug || '' };
        });
        setDrafts(d);
      })
      .catch((err) => setError(formatApiError(err, 'Failed to load categories.')));
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  function setDraft(id, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveRow(id) {
    const d = drafts[id];
    if (!d) return;
    setSavingId(id);
    setError('');
    setMessage('');
    try {
      const orig = rows.find((r) => r.id === id);
      const body = {};
      const nameTrim = String(d.name ?? '').trim();
      const slugNorm = slugFromName(d.slug ?? '');
      if (nameTrim !== (orig?.name || '').trim()) body.name = nameTrim;
      if (slugNorm && slugNorm !== (orig?.slug || '')) body.slug = slugNorm;
      if (Object.keys(body).length === 0) {
        setMessage('No changes to save.');
        return;
      }
      await patchAdminCategory(id, body);
      setMessage('Saved.');
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Save failed.'));
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    const name = newName.trim();
    const slug = slugFromName(newSlug || name);
    if (!name || !slug) {
      setError('Name and URL slug are required.');
      return;
    }
    setCreating(true);
    setError('');
    setMessage('');
    try {
      await postAdminCategory({ name, slug });
      setMessage('Category created.');
      setNewName('');
      setNewSlug('');
      setNewSlugTouched(false);
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Could not create category.'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this category? Only allowed if no products use it.')) return;
    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      await deleteAdminCategory(id);
      setMessage('Category deleted.');
      await load();
    } catch (err) {
      setError(formatApiError(err, 'Delete failed.'));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <InlineLoader />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Shop categories</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Names appear in the header, footer, and shop filters. URL slug is used in links (e.g.{' '}
        <code className="text-xs bg-neutral-100 px-1 rounded">/shop?category=your-slug</code>
        ). Changing the slug updates links; bookmarked old URLs stop working until updated.
      </p>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-green-700">{message}</p> : null}

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="p-3 font-medium text-neutral-700">Display name</th>
              <th className="p-3 font-medium text-neutral-700">URL slug</th>
              <th className="p-3 font-medium text-neutral-700 hidden sm:table-cell">Ads ID</th>
              <th className="p-3 w-32" />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const d = drafts[c.id] || { name: c.name, slug: c.slug };
              const dirty = d.name !== c.name || d.slug !== c.slug;
              return (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0">
                  <td className="p-3 align-top">
                    <input
                      type="text"
                      value={d.name}
                      onChange={(e) => setDraft(c.id, 'name', e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                    />
                  </td>
                  <td className="p-3 align-top">
                    <input
                      type="text"
                      value={d.slug}
                      onChange={(e) => setDraft(c.id, 'slug', e.target.value)}
                      className="w-full min-w-0 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-mono"
                      spellCheck={false}
                    />
                  </td>
                  <td className="p-3 align-top hidden sm:table-cell">
                    <span className="text-xs text-neutral-500 font-mono">{c.advertisingId || '—'}</span>
                  </td>
                  <td className="p-3 align-top">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        disabled={!dirty || savingId === c.id}
                        onClick={() => saveRow(c.id)}
                        className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
                      >
                        {savingId === c.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === c.id}
                        onClick={() => handleDelete(c.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-40"
                      >
                        {deletingId === c.id ? '…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No categories yet. Add one below.</p>
        ) : null}
      </div>

      <form onSubmit={handleCreate} className="mt-8 rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">Add category</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => {
                const v = e.target.value;
                setNewName(v);
                if (!newSlugTouched) setNewSlug(slugFromName(v));
              }}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm"
              placeholder="e.g. Body care"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">URL slug</label>
            <input
              type="text"
              value={newSlug}
              onChange={(e) => {
                setNewSlugTouched(true);
                setNewSlug(e.target.value);
              }}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm font-mono"
              placeholder="e.g. body-care"
              spellCheck={false}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-gold-600 disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Add category'}
        </button>
      </form>
    </div>
  );
}
