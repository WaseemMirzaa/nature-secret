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
  const [homeHeroIntro, setHomeHeroIntro] = useState('');
  const [homeStoryLabel, setHomeStoryLabel] = useState('');
  const [homeStoryHeading, setHomeStoryHeading] = useState('');
  const [homeStoryHtml, setHomeStoryHtml] = useState('');

  useEffect(() => {
    getAdminContentSettings()
      .then((r) => {
        setFooterDisclaimer(r.footerDisclaimer || '');
        setProductDisclaimerTitle(typeof r.productDisclaimerTitle === 'string' ? r.productDisclaimerTitle : '');
        setProductDisclaimerText(typeof r.productDisclaimerText === 'string' ? r.productDisclaimerText : '');
        setHomeHeroIntro(r.homeHeroIntro || '');
        setHomeStoryLabel(r.homeStoryLabel || '');
        setHomeStoryHeading(r.homeStoryHeading || '');
        setHomeStoryHtml(r.homeStoryHtml || '');
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
        homeHeroIntro,
        homeStoryLabel,
        homeStoryHeading,
        homeStoryHtml,
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
      <p className="mt-1 text-sm text-neutral-600">Footer, product disclaimer, and home page hero &amp; story (stored in the database).</p>

      <form onSubmit={handleSave} className="mt-6 space-y-5 rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="border-b border-neutral-100 pb-5">
          <h2 className="text-sm font-semibold text-neutral-900 mb-3">Home — hero (under main headline)</h2>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Intro paragraph (plain text)</label>
          <textarea
            value={homeHeroIntro}
            onChange={(e) => setHomeHeroIntro(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
          />
        </div>
        <div className="border-b border-neutral-100 pb-5 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">Home — story section</h2>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Label (e.g. Our story)</label>
            <input
              type="text"
              value={homeStoryLabel}
              onChange={(e) => setHomeStoryLabel(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Heading</label>
            <input
              type="text"
              value={homeStoryHeading}
              onChange={(e) => setHomeStoryHeading(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Body (HTML: &lt;p&gt;, &lt;strong&gt;, &lt;br&gt;, lists)</label>
            <textarea
              value={homeStoryHtml}
              onChange={(e) => setHomeStoryHtml(e.target.value)}
              rows={12}
              className="w-full font-mono text-xs rounded-xl border border-neutral-200 px-4 py-2.5 text-neutral-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Footer disclaimer</label>
          <textarea
            value={footerDisclaimer}
            onChange={(e) => setFooterDisclaimer(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
          />
        </div>
        <div className="rounded-xl border border-neutral-100 bg-neutral-50/80 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">Product page disclaimer (optional)</h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Shown on every product detail page when the text below is not empty. Leave blank to hide. Per-product disclaimers
            (Products → edit → “Show disclaimer”) override this when enabled and filled in.
          </p>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Title</label>
            <input
              type="text"
              value={productDisclaimerTitle}
              onChange={(e) => setProductDisclaimerTitle(e.target.value)}
              placeholder="e.g. Important note"
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Body</label>
            <textarea
              value={productDisclaimerText}
              onChange={(e) => setProductDisclaimerText(e.target.value)}
              rows={5}
              placeholder="One paragraph per line becomes a bullet on the storefront."
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full sm:rounded-2xl bg-neutral-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  );
}
