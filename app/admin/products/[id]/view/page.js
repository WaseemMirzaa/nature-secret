'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useProductsStore, useCurrencyStore } from '@/lib/store';
import { getCategories } from '@/lib/api';
import { formatPrice } from '@/lib/currency';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

export default function AdminProductDetailPage() {
  const params = useParams();
  const products = useProductsStore((s) => s.products);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const currency = useCurrencyStore((s) => s.currency);
  const product = products.find((p) => p.id === params.id);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories().then((list) => setCategories(Array.isArray(list) ? list : [])).catch(() => setCategories([]));
  }, []);

  if (!product) {
    return (
      <div>
        <Link href="/admin/products" className="text-sm text-neutral-500 hover:text-neutral-900">← Products</Link>
        <p className="mt-4 text-neutral-500">Product not found.</p>
      </div>
    );
  }

  const categoryName = categories.find((c) => c.id === product.categoryId)?.name ?? product.categoryId;

  return (
    <div className="max-w-3xl">
      <Link href="/admin/products" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Products</Link>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">{product.name}</h1>
        <Link href={`/admin/products/${product.id}`} className="rounded-xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium">Edit product</Link>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
        <section className="p-6 flex gap-6">
          <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
            <Image src={product.images?.[0] || ''} alt="" fill className="object-cover" sizes="160px" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-neutral-500">Slug: {product.slug}</p>
            <p className="text-neutral-700 mt-1">Category: {categoryName}</p>
            <p className="mt-2 font-medium">{formatPrice(product.price, currency)}</p>
            {product.compareAtPrice && <p className="text-sm text-neutral-500">Compare at: {formatPrice(product.compareAtPrice, currency)}</p>}
            <p className="mt-2 text-sm text-neutral-600">Rating: {product.rating ?? '—'} ({product.reviewCount ?? 0} reviews)</p>
          </div>
        </section>

        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-3">Quick actions</h2>
          <div className="flex flex-wrap gap-6 items-center">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!product.badge}
                onChange={(e) => updateProduct(product.id, { badge: e.target.checked ? 'Bestseller' : undefined })}
                className="rounded border-neutral-300"
              />
              Bestseller
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(product.inventory ?? 0) === 0}
                onChange={(e) => updateProduct(product.id, { inventory: e.target.checked ? 0 : 1 })}
                className="rounded border-neutral-300"
              />
              Out of stock
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-600">Quantity:</span>
              <input
                type="number"
                min="0"
                value={product.inventory ?? 0}
                onChange={(e) => updateProduct(product.id, { inventory: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Description</h2>
          {product.description ? (
            <div className="text-neutral-700 product-description" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
          ) : (
            <p className="text-neutral-500">—</p>
          )}
        </section>
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Benefits</h2>
          <ul className="list-disc list-inside text-neutral-700">{(product.benefits || []).map((b, i) => <li key={i}>{b}</li>)}</ul>
        </section>
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Variants</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Volume</th>
                <th className="pb-2 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {(product.variants || []).map((v, i) => (
                <tr key={i} className="border-t border-neutral-100">
                  <td className="py-2">{v.name}</td>
                  <td className="py-2">{v.volume}</td>
                  <td className="py-2 text-right">{formatPrice(v.price, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">FAQ</h2>
          <ul className="space-y-2">
            {(product.faq || []).map((f, i) => (
              <li key={i}>
                <strong className="text-neutral-800">{f.q}</strong>
                <p className="text-neutral-600 text-sm mt-0.5">{f.a}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="p-6">
          <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider mb-2">Disclaimer</h2>
          <p className="text-sm text-neutral-700">Enabled: {product.showDisclaimer ? 'Yes' : 'No'}</p>
          {product.showDisclaimer ? (
            <>
              <p className="mt-2 text-sm font-medium text-neutral-800">{product.disclaimerTitle || 'Important Note'}</p>
              <ul className="mt-2 list-disc list-inside text-sm text-neutral-700 space-y-1">
                {(Array.isArray(product.disclaimerItems) ? product.disclaimerItems : []).map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
