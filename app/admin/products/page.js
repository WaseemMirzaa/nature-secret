'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useProductsStore, useCurrencyStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/dummy-data';
import { formatPrice } from '@/lib/currency';
import { TableSkeleton } from '@/components/ui/PageLoader';

const PAGE_SIZE = 50;

export default function AdminProductsPage() {
  const router = useRouter();
  const products = useProductsStore((s) => s.products);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const currency = useCurrencyStore((s) => s.currency);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => setMounted(true), []);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') list = list.filter((p) => p.categoryId === categoryFilter);
    if (stockFilter === 'in') list = list.filter((p) => (p.inventory ?? 0) > 0);
    if (stockFilter === 'out') list = list.filter((p) => (p.inventory ?? 0) === 0);
    return list;
  }, [products, search, categoryFilter, stockFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIndex = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((pageIndex - 1) * PAGE_SIZE, pageIndex * PAGE_SIZE),
    [filtered, pageIndex]
  );
  useEffect(() => setPage(1), [search, categoryFilter, stockFilter]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-neutral-900">Products</h1>
        <Link href="/admin/products/new" className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium">Add product</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search by name or slug"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-xl border border-neutral-200 px-4 py-2 text-sm w-56"
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className="rounded-xl border border-neutral-200 px-4 py-2 text-sm">
          <option value="all">All stock</option>
          <option value="in">In stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>
      <p className="mt-2 text-sm text-neutral-500">
        Showing {(pageIndex - 1) * PAGE_SIZE + 1}–{Math.min(pageIndex * PAGE_SIZE, total)} of {total.toLocaleString()}
      </p>
      <div className="mt-4 rounded-2xl border border-neutral-200 bg-white overflow-hidden flex flex-col max-h-[calc(100vh-16rem)]">
        <div className="overflow-y-auto overflow-x-auto min-h-0 flex-1">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 sticky top-0 z-10">
              <tr>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Product</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Category</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Price</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Stock</th>
                <th className="p-4 font-medium text-neutral-900 bg-neutral-50">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!mounted ? <TableSkeleton rows={8} cols={5} /> : paginated.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                      <Image src={p.images?.[0] || ''} alt="" fill className="object-cover" sizes="48px" />
                    </div>
                    <span className="font-medium text-neutral-900">{p.name}</span>
                  </div>
                </td>
                <td className="p-4 text-neutral-600">{CATEGORIES.find((c) => c.id === p.categoryId)?.name ?? p.categoryId}</td>
                <td className="p-4">{formatPrice(p.price, currency)}</td>
                <td className="p-4">{p.inventory ?? 0}</td>
                <td className="p-4">
                  <Link href={`/admin/products/${p.id}/view`} className="text-neutral-600 hover:text-neutral-900 mr-3">View</Link>
                  <Link href={`/admin/products/${p.id}`} className="text-neutral-600 hover:text-neutral-900 mr-3">Edit</Link>
                  <button type="button" onClick={() => { if (confirm('Delete this product?')) { deleteProduct(p.id); router.refresh(); } }} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 p-4 border-t border-neutral-200 bg-neutral-50/50">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageIndex <= 1} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-neutral-600">Page {pageIndex} of {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={pageIndex >= totalPages} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
