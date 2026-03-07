'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useBlogStore, useProductsStore } from '@/lib/store';
import { BLOG_TEMPLATES } from '@/lib/constants';
import { format } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { getBlogPostBySlug } from '@/lib/api';

function getTemplateLabel(templateSlug) {
  return BLOG_TEMPLATES.find((t) => t.slug === templateSlug || t.id === templateSlug)?.name || templateSlug || 'Article';
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const storePosts = useBlogStore((s) => s.posts);
  const products = useProductsStore((s) => s.products);
  const [mounted, setMounted] = useState(false);
  const [apiPost, setApiPost] = useState(null);
  const [apiLoading, setApiLoading] = useState(!!slug);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!slug) return;
    setApiLoading(true);
    getBlogPostBySlug(slug)
      .then((p) => setApiPost(p))
      .catch(() => setApiPost(null))
      .finally(() => setApiLoading(false));
  }, [slug]);

  const postFromStore = useMemo(() => (slug ? storePosts.find((p) => p.slug === slug) : null), [storePosts, slug]);
  const post = apiPost ?? postFromStore;

  if (!mounted || (slug && apiLoading && !apiPost && !postFromStore)) {
    return (
      <div className="min-h-screen bg-neutral-50/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="h-5 w-24 rounded bg-neutral-200 animate-pulse" />
          <div className="mt-8 h-10 w-3/4 rounded bg-neutral-200 animate-pulse" />
          <div className="mt-4 h-4 w-1/2 rounded bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!slug || !post) {
    return (
      <div className="min-h-screen bg-neutral-50/40">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <Link href="/blog" className="text-sm font-medium text-neutral-500 hover:text-gold-600 transition-colors inline-flex items-center gap-1">
            ← Journal
          </Link>
          <p className="mt-8 text-neutral-500">Post not found.</p>
        </div>
      </div>
    );
  }

  const relatedProducts = post.relatedProductIds?.length
    ? products.filter((p) => post.relatedProductIds.includes(p.id))
    : [];

  return (
    <div className="min-h-screen bg-neutral-50/40">
      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <Link href="/blog" className="text-sm font-medium text-neutral-500 hover:text-gold-600 transition-colors inline-flex items-center gap-1 mb-10">
          ← Journal
        </Link>

        <header className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
            {getTemplateLabel(post.template)}
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-neutral-900 tracking-tight leading-[1.15]">
            {post.title}
          </h1>
          <p className="mt-5 text-sm text-neutral-500">
            {post.author?.name}
            <span className="mx-2">·</span>
            {post.publishedAt ? format(new Date(post.publishedAt), 'MMMM d, yyyy') : 'Draft'}
            <span className="mx-2">·</span>
            {post.readTimeMinutes || 0} min read
          </p>
        </header>

        {post.image && (
          <div className="aspect-[16/9] rounded-2xl overflow-hidden bg-neutral-100 mb-12 ring-1 ring-neutral-200/60 shadow-soft">
            <Image src={post.image} alt="" width={1200} height={675} className="h-full w-full object-cover" priority />
          </div>
        )}

        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {relatedProducts.length > 0 && (
          <aside className="mt-16 pt-12 border-t border-neutral-200">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-4">Related products</p>
            <div className="flex flex-wrap gap-4">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/shop/${p.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-soft hover:border-gold-400/40 hover:shadow-gold-sm transition-all duration-200"
                >
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                    {p.images?.[0] && <Image src={p.images[0]} alt="" fill className="object-cover" sizes="48px" />}
                  </div>
                  <span className="font-medium text-neutral-900 text-sm">{p.name}</span>
                </Link>
              ))}
            </div>
          </aside>
        )}

        <div className="mt-16 rounded-2xl border border-neutral-200 bg-white p-8 sm:p-10 text-center shadow-soft">
          <div className="inline-block w-10 h-px bg-gold-400/50 mb-5" aria-hidden />
          <h3 className="text-lg font-semibold text-neutral-900">Stay in the loop</h3>
          <p className="mt-2 text-sm text-neutral-500 max-w-md mx-auto">Tips, ingredients, and updates—no clutter.</p>
          <form className="mt-6 flex flex-col sm:flex-row gap-3 max-w-sm mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-400/50"
            />
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </article>
    </div>
  );
}
