'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from '@/components/Link';
import {
  getAdminUploadZones,
  getAdminUploadsList,
  getAdminUploadRefs,
  deleteAdminUploadFile,
  bulkDeleteAdminUploadFiles,
  formatApiError,
  resolveImageUrl,
} from '@/lib/api';

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function previewPath(zone, filename) {
  const map = {
    products: `/api/v1/admin/products/upload/${filename}`,
    blog: `/api/v1/admin/blog/upload/${filename}`,
    slider: `/api/v1/slider/upload/${filename}`,
    reviews: `/api/v1/reviews/upload/${filename}`,
  };
  return map[zone] || '';
}

function isProbablyImage(name) {
  return /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(name);
}

export default function AdminUploadsPage() {
  const [zones, setZones] = useState([]);
  const [zone, setZone] = useState('products');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailFilename, setDetailFilename] = useState(null);
  const [detailRefs, setDetailRefs] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkMessage, setBulkMessage] = useState('');

  const loadZones = useCallback(() => {
    getAdminUploadZones()
      .then((r) => {
        const z = Array.isArray(r?.zones) ? r.zones : [];
        setZones(z);
        setZone((cur) => (z.length && !z.includes(cur) ? z[0] : cur));
      })
      .catch(() => {});
  }, []);

  const loadFiles = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminUploadsList(zone)
      .then((r) => setFiles(Array.isArray(r?.files) ? r.files : []))
      .catch((e) => setError(formatApiError(e)))
      .finally(() => setLoading(false));
  }, [zone]);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    setSelected(new Set());
    setBulkMessage('');
  }, [zone]);

  useEffect(() => {
    setSelected((prev) => {
      const names = new Set(files.map((f) => f.filename));
      const next = new Set();
      for (const n of prev) {
        if (names.has(n)) next.add(n);
      }
      return next;
    });
  }, [files]);

  const openDetail = (filename) => {
    setDetailFilename(filename);
    setDetailRefs([]);
    setDetailLoading(true);
    getAdminUploadRefs(zone, filename)
      .then((r) => setDetailRefs(Array.isArray(r?.references) ? r.references : []))
      .catch(() => setDetailRefs([]))
      .finally(() => setDetailLoading(false));
  };

  const handleDelete = async (filename, referenced) => {
    if (referenced) {
      if (!window.confirm('This file is still referenced in the database. Delete from disk anyway? (Links will break.)')) return;
      try {
        await deleteAdminUploadFile(zone, filename, { force: true });
        loadFiles();
        if (detailFilename === filename) setDetailFilename(null);
      } catch (e) {
        setError(formatApiError(e));
      }
      return;
    }
    if (!window.confirm(`Delete ${filename} from the server?`)) return;
    try {
      await deleteAdminUploadFile(zone, filename, { force: false });
      loadFiles();
      if (detailFilename === filename) setDetailFilename(null);
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  const toggleSelect = (filename) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(filename)) n.delete(filename);
      else n.add(filename);
      return n;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(files.map((f) => f.filename)));
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const handleBulkDelete = async () => {
    const names = [...selected];
    if (!names.length) return;
    setBulkMessage('');
    setError('');
    if (!window.confirm(`Delete ${names.length} selected file(s)? In-use files are skipped unless you confirm a second step.`)) return;
    try {
      const r = await bulkDeleteAdminUploadFiles(zone, names, { force: false });
      const deletedN = r?.deleted?.length ?? 0;
      const skipped = Array.isArray(r?.skipped) ? r.skipped : [];
      const trunc = r?.truncated > 0 ? ` (${r.truncated} name(s) not processed — max ${100} per request)` : '';
      let msg = `Removed ${deletedN} file(s). Skipped ${skipped.length}.${trunc}`;
      const refSkipped = skipped.filter((s) => s.reason === 'referenced');
      let forceDeleted = [];
      if (refSkipped.length > 0) {
        if (window.confirm(`${refSkipped.length} in-use file(s) were skipped. Force-delete them from disk? (Broken links.)`)) {
          const r2 = await bulkDeleteAdminUploadFiles(
            zone,
            refSkipped.map((s) => s.filename),
            { force: true },
          );
          forceDeleted = Array.isArray(r2?.deleted) ? r2.deleted : [];
          msg += ` Force-deleted ${forceDeleted.length} more.`;
        }
      }
      setBulkMessage(msg);
      setSelected(new Set());
      const removed = new Set([...(r?.deleted || []), ...forceDeleted]);
      if (detailFilename && removed.has(detailFilename)) setDetailFilename(null);
      loadFiles();
    } catch (e) {
      setError(formatApiError(e));
    }
  };

  const selectedCount = selected.size;
  const allSelected = files.length > 0 && files.every((f) => selected.has(f.filename));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Upload files</h1>
      <p className="mt-1 max-w-3xl text-sm text-neutral-500">
        Browse files on disk under products, blog, home slider, and customer reviews. We scan the database for URLs that
        point at each file. Deleting a referenced file is blocked unless you confirm — then remove or update those records
        in the linked admin pages so the site does not show broken media.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {(zones.length ? zones : ['products', 'blog', 'slider', 'reviews']).map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZone(z)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize ${
              zone === z ? 'bg-neutral-900 text-white' : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            {z}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {bulkMessage ? <p className="mt-2 text-sm text-emerald-800">{bulkMessage}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!selectedCount}
          onClick={handleBulkDelete}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 disabled:opacity-40"
        >
          Delete selected ({selectedCount})
        </button>
        <button
          type="button"
          disabled={!files.length}
          onClick={allSelected ? clearSelection : selectAllVisible}
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-40"
        >
          {allSelected ? 'Clear selection' : 'Select all'}
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-10 px-2 py-3">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-3">Preview</th>
              <th className="px-4 py-3">Filename</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">DB</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  Loading…
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No files in this folder.
                </td>
              </tr>
            ) : (
              files.map((f) => (
                <tr key={f.filename} className="border-b border-neutral-100 last:border-0">
                  <td className="px-2 py-2 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300"
                      checked={selected.has(f.filename)}
                      onChange={() => toggleSelect(f.filename)}
                      aria-label={`Select ${f.filename}`}
                    />
                  </td>
                  <td className="px-4 py-2">
                    {isProbablyImage(f.filename) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveImageUrl(previewPath(zone, f.filename))}
                        alt=""
                        className="h-12 w-16 rounded-md object-cover bg-neutral-100"
                      />
                    ) : (
                      <span className="flex h-12 w-16 items-center justify-center rounded-md bg-neutral-100 text-[10px] text-neutral-500">
                        file
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-800">{f.filename}</td>
                  <td className="px-4 py-2 text-neutral-600">{formatBytes(f.size)}</td>
                  <td className="px-4 py-2">
                    {f.referenced ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        In use ({f.referenceCount})
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">Orphan</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openDetail(f.filename)}
                      className="text-xs font-semibold text-neutral-700 underline hover:text-neutral-900"
                    >
                      References
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(f.filename, f.referenced)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailFilename ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          onClick={(e) => e.target === e.currentTarget && setDetailFilename(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">References</h2>
              <button type="button" className="text-2xl leading-none text-neutral-400 hover:text-neutral-700" onClick={() => setDetailFilename(null)}>
                ×
              </button>
            </div>
            <p className="mt-1 font-mono text-xs text-neutral-600">{detailFilename}</p>
            {detailLoading ? (
              <p className="mt-4 text-sm text-neutral-500">Loading…</p>
            ) : detailRefs.length === 0 ? (
              <p className="mt-4 text-sm text-neutral-500">No database rows reference this URL.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {detailRefs.map((r) => (
                  <li key={`${r.kind}-${r.id}`} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                    <span className="text-xs font-semibold uppercase text-neutral-500">{r.kind.replace('_', ' ')}</span>
                    <p className="font-medium text-neutral-900">{r.label}</p>
                    <Link href={r.adminHref} className="text-xs font-semibold text-neutral-900 underline">
                      Open in admin
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs text-neutral-500">
              To replace a file, upload a new image/video where you edit the product or post, then delete the old file here if nothing else uses it.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
