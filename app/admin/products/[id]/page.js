'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useProductsStore } from '@/lib/store';
import { getCategories } from '@/lib/api';

const emptyVariant = () => ({ id: `v-${Date.now()}`, name: '', volume: '', price: 0, image: '' });
const emptyFaq = () => ({ q: '', a: '' });

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const products = useProductsStore((s) => s.products);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const product = products.find((p) => p.id === params.id);
  const [categories, setCategories] = useState([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('herbal-oils');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState(['']);
  const [images, setImages] = useState(['']);
  const [inventory, setInventory] = useState(0);
  const [badge, setBadge] = useState('');
  const [badgeSub, setBadgeSub] = useState('');
  const [variants, setVariants] = useState([emptyVariant()]);
  const [faq, setFaq] = useState([emptyFaq()]);
  const [rating, setRating] = useState(4.5);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    getCategories().then((list) => setCategories(Array.isArray(list) ? list : [])).catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    if (!product) return;
    setName(product.name || '');
    setSlug(product.slug || '');
    setCategoryId(product.categoryId || 'herbal-oils');
    setPrice(product.price != null ? (product.price / 100).toString() : '');
    setCompareAtPrice(product.compareAtPrice != null ? (product.compareAtPrice / 100).toString() : '');
    setDescription(product.description || '');
    setBenefits(product.benefits?.length ? product.benefits : ['']);
    setImages(product.images?.length ? product.images : ['']);
    setInventory(product.inventory ?? 0);
    setBadge(product.badge || '');
    setBadgeSub(product.badgeSub || '');
    setVariants(product.variants?.length ? product.variants.map((v) => ({ ...v, price: (v.price || 0) / 100 })) : [emptyVariant()]);
    setFaq(product.faq?.length ? product.faq : [emptyFaq()]);
    setRating(product.rating ?? 4.5);
    setReviewCount(product.reviewCount ?? 0);
  }, [product]);

  function addBenefit() { setBenefits((b) => [...b, '']); }
  function updateBenefit(i, v) { setBenefits((b) => { const n = [...b]; n[i] = v; return n; }); }
  function removeBenefit(i) { setBenefits((b) => b.filter((_, j) => j !== i)); }
  function addImage() { setImages((i) => [...i, '']); }
  function updateImage(i, v) { setImages((im) => { const n = [...im]; n[i] = v; return n; }); }
  function addVariant() { setVariants((v) => [...v, emptyVariant()]); }
  function updateVariant(i, field, value) {
    setVariants((v) => { const n = v.map((x, j) => j === i ? { ...x, [field]: field === 'price' ? Number(value) || 0 : value } : x); return n; });
  }
  function removeVariant(i) { setVariants((v) => v.filter((_, j) => j !== i)); }
  function addFaq() { setFaq((f) => [...f, emptyFaq()]); }
  function updateFaq(i, field, value) { setFaq((f) => { const n = [...f]; n[i] = { ...n[i], [field]: value }; return n; }); }
  function removeFaq(i) { setFaq((f) => f.filter((_, j) => j !== i)); }

  function handleSubmit(e) {
    e.preventDefault();
    if (!product) return;
    const basePrice = Math.round(parseFloat(price) * 100) || 0;
    const compare = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : null;
    const updates = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      categoryId,
      price: basePrice,
      compareAtPrice: compare,
      description,
      benefits: benefits.filter(Boolean),
      images: images.filter(Boolean),
      inventory: Number(inventory) || 0,
      rating: Number(rating) || 0,
      reviewCount: Number(reviewCount) || 0,
      badge: badge || undefined,
      badgeSub: badgeSub || undefined,
      variants: variants.filter((v) => v.name && v.volume).map((v, i) => ({
        id: v.id || `v-${Date.now()}-${i}`,
        name: v.name,
        volume: v.volume,
        price: Math.round((v.price || 0) * 100) || basePrice,
        image: v.image || images[0] || '',
      })),
      faq: faq.filter((f) => f.q && f.a),
    };
    if (!updates.variants.length) updates.variants = [{ id: `v-${Date.now()}`, name: 'Default', volume: '-', price: basePrice, image: images[0] || '' }];
    updateProduct(product.id, updates);
    router.push('/admin/products');
  }

  if (!product) {
    return (
      <div>
        <Link href="/admin/products" className="text-sm text-neutral-500 hover:text-neutral-900">← Products</Link>
        <p className="mt-4 text-neutral-500">Product not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Products</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Edit product</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Slug (URL)</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Category *</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900">
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Price (₹) *</label>
            <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Compare at (₹)</label>
            <input type="number" step="0.01" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Benefits</label>
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input type="text" value={b} onChange={(e) => updateBenefit(i, e.target.value)} className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
              <button type="button" onClick={() => removeBenefit(i)} className="text-neutral-500 hover:text-red-600">×</button>
            </div>
          ))}
          <button type="button" onClick={addBenefit} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add benefit</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Image URLs</label>
          {images.map((url, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input type="text" value={url} onChange={(e) => updateImage(i, e.target.value)} className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
              <button type="button" onClick={() => setImages((im) => im.filter((_, j) => j !== i))} className="text-neutral-500 hover:text-red-600">×</button>
            </div>
          ))}
          <button type="button" onClick={addImage} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add image</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Inventory</label>
            <input type="number" value={inventory} onChange={(e) => setInventory(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Badge</label>
            <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Badge sub</label>
            <input type="text" value={badgeSub} onChange={(e) => setBadgeSub(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Variants (name, volume, price ₹, image URL)</label>
          {variants.map((v, i) => (
            <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
              <input type="text" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <input type="text" value={v.volume} onChange={(e) => updateVariant(i, 'volume', e.target.value)} className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <input type="number" step="0.01" value={v.price || ''} onChange={(e) => updateVariant(i, 'price', e.target.value)} className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <input type="text" value={v.image || ''} onChange={(e) => updateVariant(i, 'image', e.target.value)} className="flex-1 min-w-[120px] rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => removeVariant(i)} className="text-neutral-500 hover:text-red-600">×</button>
            </div>
          ))}
          <button type="button" onClick={addVariant} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add variant</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">FAQ</label>
          {faq.map((f, i) => (
            <div key={i} className="mb-3 flex gap-2">
              <input type="text" value={f.q} onChange={(e) => updateFaq(i, 'q', e.target.value)} placeholder="Question" className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <input type="text" value={f.a} onChange={(e) => updateFaq(i, 'a', e.target.value)} placeholder="Answer" className="flex-1 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => removeFaq(i)} className="text-neutral-500 hover:text-red-600">×</button>
            </div>
          ))}
          <button type="button" onClick={addFaq} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add FAQ</button>
        </div>
        <div className="flex gap-4">
          <button type="submit" className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium">Save changes</button>
          <Link href="/admin/products" className="rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-900">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
