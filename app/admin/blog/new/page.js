'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { useRouter } from 'next/navigation';
import { useBlogStore } from '@/lib/store';
import { BLOG_TEMPLATES, BLOG_CATEGORIES } from '@/lib/constants';
import { useProductsStore } from '@/lib/store';
import { getBlogImages, uploadBlogImage, createBlogPost, formatApiError } from '@/lib/api';

export default function NewBlogPage() {
  const router = useRouter();
  const posts = useBlogStore((s) => s.posts);
  const setPosts = useBlogStore((s) => s.setPosts);
  const products = useProductsStore((s) => s.products);
  const [title, setTitle] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('standard');
  const [categoryId, setCategoryId] = useState('ingredients');
  const [authorName, setAuthorName] = useState('Nature Secret Team');
  const [authorRole, setAuthorRole] = useState('Editor');
  const [image, setImage] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [existingImages, setExistingImages] = useState([]);
  const [uploadSlug, setUploadSlug] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [readTimeMinutes, setReadTimeMinutes] = useState(4);
  const [publishedAt, setPublishedAt] = useState('');
  const [relatedProductIds, setRelatedProductIds] = useState([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    getBlogImages().then((r) => setExistingImages(r.images || [])).catch(() => setExistingImages([]));
  }, []);

  const apiBase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : '';
  async function handleBlogImageUpload(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const res = await uploadBlogImage(file, { slug: uploadSlug, alt: imageAlt });
      const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
      setImage(url);
      if (res.alt) setImageAlt(res.alt);
      setExistingImages((prev) => [...prev, { url, filename: url.split('/').pop() }]);
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    const payload = {
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      excerpt,
      body,
      template,
      categoryId,
      image: image || 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200',
      imageAlt: imageAlt || undefined,
      readTimeMinutes: Number(readTimeMinutes) || 4,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
      relatedProductIds,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
    };
    try {
      const created = await createBlogPost(payload);
      setPosts([created, ...(posts || [])]);
      router.push('/admin/blog');
    } catch (err) {
      setSubmitError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function toggleProduct(id) {
    setRelatedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/blog" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Blog</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">New blog post</h1>
      {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Slug (URL)</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from title" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Excerpt</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Body (HTML)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="<p>...</p>" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 font-mono text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Template</label>
            <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900">
              {BLOG_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900">
              {BLOG_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Author name</label>
            <input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Author role</label>
            <input type="text" value={authorRole} onChange={(e) => setAuthorRole(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Featured image (SEO)</label>
          <label className="block text-xs text-neutral-500 mb-1">Select existing or upload new</label>
          <select value={image} onChange={(e) => setImage(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 mb-2">
            <option value="">— Choose or paste URL below —</option>
            {existingImages.map((img) => (
              <option key={img.url} value={img.url}>{img.filename || img.url}</option>
            ))}
          </select>
          <input type="text" value={image} onChange={(e) => setImage(e.target.value)} placeholder="Or paste image URL" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 mb-2" />
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <input type="text" value={uploadSlug} onChange={(e) => setUploadSlug(e.target.value)} placeholder="Slug for upload (optional)" className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm w-40" />
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleBlogImageUpload} disabled={uploading} className="text-sm file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1" />
            {uploading && <span className="text-xs text-neutral-500">Uploading…</span>}
          </div>
          {uploadError && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}
          <label className="block text-xs text-neutral-600 mt-1">Image alt text (SEO)</label>
          <input type="text" value={imageAlt} onChange={(e) => setImageAlt(e.target.value)} placeholder="Describe image for accessibility" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 mt-0.5" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Read time (min)</label>
            <input type="number" value={readTimeMinutes} onChange={(e) => setReadTimeMinutes(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Publish at (optional)</label>
            <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Related products</label>
          <div className="flex flex-wrap gap-2">
            {products.slice(0, 12).map((p) => (
              <label key={p.id} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm">
                <input type="checkbox" checked={relatedProductIds.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                {p.name}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">SEO title</label>
          <input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">SEO description</label>
          <textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} rows={2} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={submitting} className="rounded-full sm:rounded-2xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium disabled:opacity-50">Publish post</button>
          <Link href="/admin/blog" className="rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-900">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
