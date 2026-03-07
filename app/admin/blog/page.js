'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from '@/components/Link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useBlogStore } from '@/lib/store';
import { BLOG_TEMPLATES, BLOG_CATEGORIES } from '@/lib/constants';
import { format } from 'date-fns';
import { CardListSkeleton } from '@/components/ui/PageLoader';

const PAGE_SIZE = 50;

export default function AdminBlogPage() {
  const router = useRouter();
  const posts = useBlogStore((s) => s.posts);
  const deletePost = useBlogStore((s) => s.deletePost);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = posts;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') list = list.filter((p) => p.categoryId === categoryFilter);
    if (dateFrom) list = list.filter((p) => p.publishedAt && new Date(p.publishedAt) >= new Date(dateFrom));
    if (dateTo) list = list.filter((p) => p.publishedAt && new Date(p.publishedAt) <= new Date(dateTo + 'T23:59:59'));
    return list;
  }, [posts, search, categoryFilter, dateFrom, dateTo]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE),
    [filtered, pageIndex]
  );
  useEffect(() => setMounted(true), []);
  useEffect(() => setPage(1), [search, categoryFilter, dateFrom, dateTo]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Blog</h1>
        <Link href="/admin/blog/new" className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium">New post</Link>
      </div>
      <p className="mt-1 text-sm text-neutral-500">Templates: {BLOG_TEMPLATES.map((t) => t.name).join(', ')}</p>
      <div className="mt-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by title or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm w-56"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">
          <option value="all">All categories</option>
          {BLOG_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm" />
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Showing {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, total)} of {total.toLocaleString()}
      </p>
      <div className="mt-4 space-y-4">
        {!mounted ? <CardListSkeleton count={6} /> : paginated.map((post) => (
          <div key={post.id} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="relative h-16 w-24 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
              <Image src={post.image || ''} alt="" fill className="object-cover" sizes="96px" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900">{post.title}</p>
              <p className="text-xs text-neutral-500">{post.template} · {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : 'Draft'}</p>
            </div>
            <Link href={`/admin/blog/${post.id}`} className="text-sm font-medium text-neutral-600 hover:text-neutral-900 mr-3">Edit</Link>
            <button type="button" onClick={() => { if (confirm('Delete this post?')) { deletePost(post.id); router.refresh(); } }} className="text-sm text-red-600 hover:text-red-700">Delete</button>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageIndex <= 1} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-neutral-600">Page {pageIndex} of {totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageIndex >= totalPages} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
