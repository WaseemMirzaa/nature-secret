'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useBlogStore } from '@/lib/store';
import { useProductsStore } from '@/lib/store';
import { BLOG_TEMPLATES, BLOG_CATEGORIES } from '@/lib/constants';

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const posts = useBlogStore((s) => s.posts);
  const updatePost = useBlogStore((s) => s.updatePost);
  const products = useProductsStore((s) => s.products);
  const post = posts.find((p) => p.id === params.id);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [template, setTemplate] = useState('standard');
  const [categoryId, setCategoryId] = useState('ingredients');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState('');
  const [image, setImage] = useState('');
  const [readTimeMinutes, setReadTimeMinutes] = useState(4);
  const [publishedAt, setPublishedAt] = useState('');
  const [relatedProductIds, setRelatedProductIds] = useState([]);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    if (!post) return;
    setTitle(post.title || '');
    setSlug(post.slug || '');
    setExcerpt(post.excerpt || '');
    setBody(post.body || '');
    setTemplate(post.template || 'standard');
    setCategoryId(post.categoryId || 'ingredients');
    setAuthorName(post.author?.name || '');
    setAuthorRole(post.author?.role || '');
    setImage(post.image || '');
    setReadTimeMinutes(post.readTimeMinutes ?? 4);
    setPublishedAt(post.publishedAt ? post.publishedAt.slice(0, 16) : '');
    setRelatedProductIds(post.relatedProductIds || []);
    setSeoTitle(post.seoTitle || '');
    setSeoDescription(post.seoDescription || '');
  }, [post]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!post) return;
    const updates = {
      title,
      slug: slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      excerpt,
      body,
      template,
      categoryId,
      author: { name: authorName, role: authorRole },
      image: image || 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=1200',
      readTimeMinutes: Number(readTimeMinutes) || 4,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
      relatedProductIds,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
    };
    updatePost(post.id, updates);
    router.push('/admin/blog');
  }

  function toggleProduct(id) {
    setRelatedProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  if (!post) {
    return (
      <div>
        <Link href="/admin/blog" className="text-sm text-neutral-500 hover:text-neutral-900">← Blog</Link>
        <p className="mt-4 text-neutral-500">Post not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/blog" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Blog</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Edit blog post</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Title *</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Slug (URL)</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Excerpt</label>
          <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} rows={2} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Body (HTML)</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 font-mono text-sm" />
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
          <label className="block text-sm font-medium text-neutral-700 mb-1">Featured image URL</label>
          <input type="text" value={image} onChange={(e) => setImage(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Read time (min)</label>
            <input type="number" value={readTimeMinutes} onChange={(e) => setReadTimeMinutes(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Publish at</label>
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
          <button type="submit" className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium">Save changes</button>
          <Link href="/admin/blog" className="rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-900">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
