'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useBlogStore } from '@/lib/store';
import { useBlogPosts } from '@/lib/useApiData';
import { BLOG_TEMPLATES } from '@/lib/constants';
import { format } from 'date-fns';

function getTemplateLabel(templateSlug) {
  return BLOG_TEMPLATES.find((t) => t.slug === templateSlug || t.id === templateSlug)?.name || templateSlug || 'Article';
}

export default function BlogPage() {
  const storePosts = useBlogStore((s) => s.posts);
  const { posts, loading } = useBlogPosts(storePosts);
  const sortedPosts = [...(posts || [])].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  return (
    <div className="min-h-screen">
      <section className="border-b border-neutral-200 bg-neutral-50/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="absolute left-4 sm:left-6 lg:left-8 top-[7rem] w-16 h-px bg-gradient-to-r from-gold-400/50 to-transparent" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-600 mb-3">Journal</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">Stories & insights</h1>
          <p className="mt-4 max-w-xl text-neutral-600 leading-relaxed">
            Ingredients, wellness tips, and updates from Nature Secret. Clean, minimal, honest.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {loading && (!posts || posts.length === 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-white border border-neutral-200/80">
                  <div className="aspect-[4/3] bg-neutral-200 animate-pulse" />
                  <div className="p-6 space-y-3">
                    <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
                    <div className="h-5 w-full rounded bg-neutral-200 animate-pulse" />
                    <div className="h-4 w-2/3 rounded bg-neutral-100 animate-pulse" />
                    <div className="h-3 w-24 rounded bg-neutral-100 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
              <p className="text-neutral-500">No posts yet. Check back soon.</p>
              <Link href="/" className="mt-4 inline-block text-sm font-medium text-gold-700 hover:text-gold-600 border-b border-gold-500/40 pb-0.5">Back to home</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
              {sortedPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-white border border-neutral-200/80 shadow-soft hover:shadow-premium hover:border-gold-400/30 transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
                    {post.image ? (
                      <Image
                        src={post.image}
                        alt=""
                        width={600}
                        height={450}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-neutral-400 text-sm">No image</div>
                    )}
                  </div>
                  <div className="p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                      {getTemplateLabel(post.template)}
                    </p>
                    <h2 className="mt-3 text-lg font-semibold text-neutral-900 tracking-tight line-clamp-2 group-hover:text-gold-700/90 transition-colors">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="mt-2 text-sm text-neutral-500 line-clamp-2 leading-relaxed">{post.excerpt}</p>
                    )}
                    <p className="mt-4 text-xs text-neutral-400">
                      {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Draft'}
                      <span className="mx-1.5">·</span>
                      {post.readTimeMinutes || 0} min read
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
