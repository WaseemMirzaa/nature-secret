'use client';

import Link from '@/components/Link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useBlogStore, useProductsStore } from '@/lib/store';
import { BLOG_TEMPLATES } from '@/lib/constants';
import { format } from 'date-fns';
import { useMemo, useState, useEffect } from 'react';
import { getBlogPostBySlug, resolveImageUrl, productPath } from '@/lib/api';
import { sanitizeBlogHtml } from '@/lib/sanitizeHtml';

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
      <div className="min-h-screen bg-page-canvas">
        <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-6 sm:py-12 lg:py-16">
          <div className="h-5 w-24 rounded bg-neutral-200 animate-pulse" />
          <div className="mt-8 h-10 w-3/4 rounded bg-neutral-200 animate-pulse" />
          <div className="mt-4 h-4 w-1/2 rounded bg-neutral-100 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!slug || !post) {
    return (
      <div className="min-h-screen bg-page-canvas">
        <div className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-6 sm:py-12 lg:py-16">
          <Link href="/blog" className="text-xs sm:text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5 inline-flex items-center gap-1">
            ← Journal
          </Link>
          <p className="mt-5 sm:mt-8 text-sm sm:text-base text-neutral-600">This post isn&apos;t available or the content is updating. Try again later or browse the journal.</p>
        </div>
      </div>
    );
  }

  const relatedProducts = post.relatedProductIds?.length
    ? products.filter((p) => post.relatedProductIds.includes(p.id))
    : [];

  return (
    <div className="min-h-screen bg-page-canvas">
      <article className="mx-auto max-w-3xl px-3 sm:px-5 lg:px-8 py-5 sm:py-10 lg:py-20">
        <Link href="/blog" className="text-xs sm:text-sm font-medium text-neutral-500 hover:text-gold-600 transition-colors inline-flex items-center gap-1 mb-4 sm:mb-8 lg:mb-10">
          ← Journal
        </Link>

        <header className="mb-5 sm:mb-8 lg:mb-10">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
            {getTemplateLabel(post.template)}
          </p>
          <h1 className="mt-2 sm:mt-3 text-2xl sm:text-3xl lg:text-[2.75rem] font-semibold text-neutral-900 tracking-tight leading-[1.15]">
            {post.title}
          </h1>
          <p className="mt-3 sm:mt-5 text-xs sm:text-sm text-neutral-500">
            {post.author?.name}
            <span className="mx-2">·</span>
            {post.publishedAt ? format(new Date(post.publishedAt), 'MMMM d, yyyy') : 'Draft'}
            <span className="mx-2">·</span>
            {post.readTimeMinutes || 0} min read
          </p>
        </header>

        {post.image && (
          <div className="aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden bg-neutral-100 mb-5 sm:mb-10 lg:mb-12 ring-1 ring-neutral-200/60 shadow-soft">
            <Image src={resolveImageUrl(post.image)} alt={post.imageAlt || post.title || ''} width={1200} height={675} className="h-full w-full object-cover" priority />
          </div>
        )}

        <div
          className="blog-prose"
          dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.body || '') }}
        />

        {relatedProducts.length > 0 && (
          <aside className="mt-10 sm:mt-14 lg:mt-16 pt-8 sm:pt-10 lg:pt-12 border-t border-neutral-200">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3 sm:mb-4">Related products</p>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {relatedProducts.map((p) => {
                const img = p.images?.[0] || '/assets/nature-secret-logo.svg';
                const name = p.name ?? p.slug ?? 'Product';
                return (
                  <Link
                    key={p.id}
                    href={`/shop/${productPath(p)}`}
                    className="flex items-center gap-2 sm:gap-3 rounded-full sm:rounded-2xl border border-neutral-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-soft hover:border-gold-400/40 hover:shadow-gold-sm transition-all duration-200"
                  >
                    <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      <Image src={img} alt={name} fill className="object-cover" sizes="48px" unoptimized={!img.startsWith('http')} />
                    </div>
                    <span className="font-medium text-neutral-900 text-xs sm:text-sm">{name}</span>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}

        <div className="mt-10 sm:mt-14 lg:mt-16 rounded-xl sm:rounded-2xl border border-neutral-200 bg-white p-5 sm:p-8 lg:p-10 text-center shadow-soft">
          <div className="inline-block w-10 h-px bg-gold-400/50 mb-4 sm:mb-5" aria-hidden />
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900">Stay in the loop</h3>
          <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">Tips, ingredients, and updates—no clutter.</p>
          <form className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-sm mx-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 rounded-xl border border-neutral-600 sm:border-2 sm:border-neutral-600 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-600/25 focus:border-neutral-700"
            />
            <button
              type="submit"
              className="rounded-full sm:rounded-2xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              Subscribe
            </button>
          </form>
        </div>
      </article>
    </div>
  );
}
