'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/Link';
import { getAdminContentSettings, updateAdminContentSettings, formatApiError } from '@/lib/api';
import { InlineLoader } from '@/components/ui/PageLoader';

export default function AdminContentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [footerDisclaimer, setFooterDisclaimer] = useState('');
  const [productDisclaimerTitle, setProductDisclaimerTitle] = useState('');
  const [productDisclaimerText, setProductDisclaimerText] = useState('');

  useEffect(() => {
    getAdminContentSettings()
      .then((r) => {
        setFooterDisclaimer(r.footerDisclaimer || '');
        setProductDisclaimerTitle(r.productDisclaimerTitle || 'Important Note');
        setProductDisclaimerText(r.productDisclaimerText || '');
      })
      .catch((err) => setError(formatApiError(err, 'Failed to load content settings.')))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await updateAdminContentSettings({
        footerDisclaimer,
        productDisclaimerTitle,
        productDisclaimerText,
      });
      setMessage('Saved successfully.');
    } catch (err) {
      setError(formatApiError(err, 'Failed to save content settings.'));
    } finally {
      setSaving(false);
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
    <div className="max-w-3xl">
      <Link href="/admin" className="text-sm text-neutral-500 hover:text-neutral-900">← Dashboard</Link>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Content settings</h1>
      <p className="mt-1 text-sm text-neutral-600">Manage disclaimer text shown on footer and product detail.</p>

      <form onSubmit={handleSave} className="mt-6 space-y-5 rounded-2xl border border-neutral-200 bg-white p-5">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Footer disclaimer</label>
          <textarea
            value={footerDisclaimer}
            onChange={(e) => setFooterDisclaimer(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Product disclaimer title</label>
          <input
            type="text"
            value={productDisclaimerTitle}
            onChange={(e) => setProductDisclaimerTitle(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Product disclaimer text</label>
          <textarea
            value={productDisclaimerText}
            onChange={(e) => setProductDisclaimerText(e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
          />
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
