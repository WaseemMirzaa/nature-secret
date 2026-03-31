'use client';

import { useState, useEffect } from 'react';
import Link from '@/components/Link';
import { useRouter } from 'next/navigation';
import { useProductsStore } from '@/lib/store';
import { getCategories, uploadProductImage, createProduct, formatApiError, formatApiErrorFull } from '@/lib/api';

const emptyVariant = () => ({ id: `v-${Date.now()}`, name: '', volume: '', price: 0, compareAtPrice: null, images: [] });
const emptyFaq = () => ({ q: '', a: '' });
const emptyProductBadge = () => ({ label: '', imageUrl: '', href: '' });
const demoBadges = [
  { label: '100% Organic', imageUrl: 'https://img.shields.io/badge/100%25-Organic-2e7d32?style=for-the-badge' },
  { label: '100% Natural', imageUrl: 'https://img.shields.io/badge/100%25-Natural-388e3c?style=for-the-badge' },
  { label: 'Secure', imageUrl: 'https://img.shields.io/badge/Secure-SSL-1e88e5?style=for-the-badge' },
];

export default function NewProductPage() {
  const router = useRouter();
  const products = useProductsStore((s) => s.products);
  const setProducts = useProductsStore((s) => s.setProducts);
  const [categories, setCategories] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  useEffect(() => {
    getCategories().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setCategories(arr);
      setCategoryId((prev) => (prev === '' && arr.length ? arr[0].id : prev));
    }).catch(() => setCategories([]));
  }, []);
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState(['']);
  const [images, setImages] = useState(['']);
  const [imageAlts, setImageAlts] = useState(['']);
  const [uploadSlug, setUploadSlug] = useState('');
  const [inventory, setInventory] = useState(0);
  const [manufacturingCost, setManufacturingCost] = useState('');
  const [boxPrice, setBoxPrice] = useState('');
  const [stickerPrice, setStickerPrice] = useState('');
  const [badge, setBadge] = useState('');
  const [badgeSub, setBadgeSub] = useState('');
  const [variants, setVariants] = useState([emptyVariant()]);
  const [faq, setFaq] = useState([emptyFaq()]);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerTitle, setDisclaimerTitle] = useState('Important Note');
  const [disclaimerItems, setDisclaimerItems] = useState(['']);
  const [productBadges, setProductBadges] = useState([emptyProductBadge()]);
  const [rating, setRating] = useState(4.5);
  const [reviewCount, setReviewCount] = useState(0);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  const apiBase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : '';
  async function handleImageUpload(e, index) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploadingIndex(index);
    setUploadProgress(0);
    setUploadError('');
    try {
      const res = await uploadProductImage(file, { slug: uploadSlug, alt: imageAlts[index], onProgress: setUploadProgress });
      const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
      updateImage(index, url);
      if (res.alt) updateImageAlt(index, res.alt);
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
      e.target.value = '';
    }
  }
  async function handleVariantImageUpload(e, variantIndex, imageIndex) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploadingIndex(`v-${variantIndex}-${imageIndex ?? 'new'}`);
    setUploadProgress(0);
    setUploadError('');
    try {
      const res = await uploadProductImage(file, { onProgress: setUploadProgress });
      const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
      const v = variants[variantIndex];
      const imgs = [...(v.images || [])];
      if (imageIndex != null && imageIndex < imgs.length) {
        imgs[imageIndex] = url;
      } else {
        imgs.push(url);
      }
      setVariantImages(variantIndex, imgs);
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setUploadingIndex(null);
      setUploadProgress(0);
      e.target.value = '';
    }
  }

  function addBenefit() { setBenefits((b) => [...b, '']); }
  function updateBenefit(i, v) { setBenefits((b) => { const n = [...b]; n[i] = v; return n; }); }
  function removeBenefit(i) { setBenefits((b) => b.filter((_, j) => j !== i)); }
  function addImage() { setImages((i) => [...i, '']); setImageAlts((a) => [...a, '']); }
  function updateImage(i, v) { setImages((im) => { const n = [...im]; n[i] = v; return n; }); }
  function updateImageAlt(i, v) { setImageAlts((a) => { const n = [...a]; n[i] = v; return n; }); }
  function removeImageAt(i) {
    setImages((im) => im.filter((_, j) => j !== i));
    setImageAlts((a) => a.filter((_, j) => j !== i));
  }
  function addVariant() { setVariants((v) => [...v, emptyVariant()]); }
  function updateVariant(i, field, value) {
    setVariants((v) => {
      const n = v.map((x, j) => {
        if (j !== i) return x;
        if (field === 'price') return { ...x, price: Number(value) || 0 };
        if (field === 'compareAtPrice') return { ...x, compareAtPrice: value === '' || value == null ? null : value };
        return { ...x, [field]: value };
      });
      return n;
    });
  }
  function removeVariant(i) { setVariants((v) => v.filter((_, j) => j !== i)); }
  function setVariantImages(variantIndex, imageList) {
    setVariants((v) => v.map((x, j) => j === variantIndex ? { ...x, images: Array.isArray(imageList) ? imageList : (x.images || []) } : x));
  }
  function addVariantImage(variantIndex) {
    setVariants((v) => v.map((x, j) => j === variantIndex ? { ...x, images: [...(x.images || []), ''] } : x));
  }
  function updateVariantImage(variantIndex, imageIndex, url) {
    setVariants((v) => v.map((x, j) => {
      if (j !== variantIndex) return x;
      const imgs = [...(x.images || [])];
      imgs[imageIndex] = url;
      return { ...x, images: imgs };
    }));
  }
  function removeVariantImage(variantIndex, imageIndex) {
    setVariants((v) => v.map((x, j) => j === variantIndex ? { ...x, images: (x.images || []).filter((_, idx) => idx !== imageIndex) } : x));
  }
  function addFaq() { setFaq((f) => [...f, emptyFaq()]); }
  function updateFaq(i, field, value) { setFaq((f) => { const n = [...f]; n[i] = { ...n[i], [field]: value }; return n; }); }
  function removeFaq(i) { setFaq((f) => f.filter((_, j) => j !== i)); }
  function addDisclaimerItem() { setDisclaimerItems((list) => [...list, '']); }
  function updateDisclaimerItem(i, value) { setDisclaimerItems((list) => list.map((x, idx) => (idx === i ? value : x))); }
  function removeDisclaimerItem(i) { setDisclaimerItems((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : [''])); }
  function addProductBadge() { setProductBadges((list) => [...list, emptyProductBadge()]); }
  function updateProductBadge(i, field, value) {
    setProductBadges((list) => list.map((x, idx) => (idx === i ? { ...x, [field]: value } : x)));
  }
  function removeProductBadge(i) {
    setProductBadges((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : [emptyProductBadge()]));
  }
  function addDemoBadges() {
    setProductBadges((list) => {
      const existing = list.filter((x) => x.label || x.imageUrl);
      return [...existing, ...demoBadges.map((b) => ({ ...b, href: '' }))];
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError('');
    setSubmitting(true);
    try {
      if (!categoryId || !name?.trim()) {
        setSubmitError('Please enter name and select a category.');
        return;
      }
      const basePrice = Math.round(parseFloat(price) * 100) || 0;
      const compare = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : null;
      const safeVariants = Array.isArray(variants) ? variants : [{ id: `v-${Date.now()}`, name: 'Default', volume: '-', price: 0, images: [] }];
      const product = {
        name: name.trim(),
        slug: (slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')).trim() || 'product',
        categoryId,
        price: basePrice,
        compareAtPrice: compare,
        description: description || undefined,
        benefits: Array.isArray(benefits) ? benefits.filter(Boolean) : [],
        images: Array.isArray(images) ? images.filter(Boolean) : [],
        imageAlts: Array.isArray(imageAlts) && Array.isArray(images) ? imageAlts.slice(0, images.length).map((a, i) => images[i] ? (a || '') : '').filter((_, i) => images[i]) : [],
        inventory: Number(inventory) || 0,
        manufacturingCost: manufacturingCost ? Math.round(parseFloat(manufacturingCost) * 100) : 0,
        boxPrice: boxPrice ? Math.round(parseFloat(boxPrice) * 100) : 0,
        stickerPrice: stickerPrice ? Math.round(parseFloat(stickerPrice) * 100) : 0,
        rating: Number(rating) || 0,
        reviewCount: Number(reviewCount) || 0,
        badge: badge || undefined,
        badgeSub: badgeSub || undefined,
        variants: safeVariants.filter((v) => v && v.name && v.volume).map((v, i) => ({
          id: v.id || `v-${Date.now()}-${i}`,
          name: v.name,
          volume: v.volume,
          price: Math.round((v.price || 0) * 100) || basePrice,
          compareAtPrice: safeVariants.length > 1 && v.compareAtPrice != null && v.compareAtPrice !== '' ? Math.round(parseFloat(v.compareAtPrice) * 100) : null,
          images: Array.isArray(v.images) ? v.images.filter(Boolean) : (v.image ? [v.image] : []),
        })),
        faq: Array.isArray(faq) ? faq.filter((f) => f && f.q && f.a) : [],
        showDisclaimer: !!showDisclaimer,
        disclaimerTitle: disclaimerTitle?.trim() || undefined,
        disclaimerItems: disclaimerItems.map((x) => x.trim()).filter(Boolean),
        productBadges: productBadges
          .filter((b) => b?.label?.trim() && b?.imageUrl?.trim())
          .map((b) => ({ label: b.label.trim(), imageUrl: b.imageUrl.trim(), href: b.href?.trim() || undefined })),
      };
      if (!product.variants.length) product.variants = [{ id: `v-${Date.now()}`, name: 'Default', volume: '-', price: basePrice, images: (Array.isArray(images) && images[0]) ? [images[0]] : [] }];
      const created = await createProduct(product);
      setProducts([created, ...(products || [])]);
      router.push('/admin/products');
    } catch (err) {
      setSubmitError(formatApiErrorFull(err, err?.message || 'Request failed. Check network and login.'));
      if (typeof console !== 'undefined' && console.error) console.error('Create product error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-neutral-500 hover:text-neutral-900 mb-6 inline-block">← Products</Link>
      <h1 className="text-2xl font-semibold text-neutral-900">Add product</h1>
      {submitError && (
        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm" role="alert">
          <p className="font-medium">Product was not saved to the database.</p>
          <p className="mt-1">{submitError}</p>
          <p className="mt-2 text-red-600">Fix the error above and submit again. If it says 401, log out and log back in.</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Slug (URL)</label>
          <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="auto from name" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
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
          <label className="block text-sm font-medium text-neutral-700 mb-1">Description (HTML allowed)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder={'e.g. <p>...</p>, <strong>, <ul><li>...</li></ul>, <a href="...">'} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 font-mono text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Benefits (one per line)</label>
          {benefits.map((b, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input type="text" value={b} onChange={(e) => updateBenefit(i, e.target.value)} className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
              <button type="button" onClick={() => removeBenefit(i)} className="text-neutral-500 hover:text-red-600">×</button>
            </div>
          ))}
          <button type="button" onClick={addBenefit} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add benefit</button>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Images (slug for filename optional)</label>
          {uploadError && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}
          <input type="text" value={uploadSlug} onChange={(e) => setUploadSlug(e.target.value)} placeholder="Slug for next upload (optional)" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm mb-2" />
          {images.map((url, i) => (
            <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleImageUpload(e, i)} disabled={uploadingIndex !== null} className="text-sm file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs" />
              {uploadingIndex === i && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-200 overflow-hidden max-w-[100px]">
                    <div className="h-full bg-neutral-700 rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-xs text-neutral-600">{uploadProgress}%</span>
                </div>
              )}
              <input type="text" value={url} onChange={(e) => updateImage(i, e.target.value)} placeholder="Or paste URL" className="flex-1 min-w-[180px] rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
              <input type="text" value={imageAlts[i] || ''} onChange={(e) => updateImageAlt(i, e.target.value)} placeholder="Alt (SEO)" className="w-28 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
              <button type="button" onClick={() => removeImageAt(i)} className="text-neutral-500 hover:text-red-600">×</button>
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
            <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. Bestseller" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Badge sub</label>
            <input type="text" value={badgeSub} onChange={(e) => setBadgeSub(e.target.value)} placeholder="e.g. Top selling" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Variants (name, volume, price ₹{variants.length > 1 ? ', compare at ₹' : ''}, images)</label>
          {variants.map((v, i) => (
            <div key={i} className="border border-neutral-200 rounded-xl p-3 mb-3 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input type="text" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} placeholder="e.g. 50 ml" className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                <input type="text" value={v.volume} onChange={(e) => updateVariant(i, 'volume', e.target.value)} placeholder="50ml" className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                <input type="number" step="0.01" value={v.price || ''} onChange={(e) => updateVariant(i, 'price', e.target.value)} placeholder="499" className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                {variants.length > 1 && (
                  <input type="number" step="0.01" value={v.compareAtPrice ?? ''} onChange={(e) => updateVariant(i, 'compareAtPrice', e.target.value)} placeholder="Was ₹" className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" title="Original price for this variant" />
                )}
                <button type="button" onClick={() => removeVariant(i)} className="text-neutral-500 hover:text-red-600 ml-1">× Remove variant</button>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-neutral-500 w-full">Images:</span>
                {(v.images || []).map((url, imgIdx) => (
                  <div key={imgIdx} className="flex items-center gap-1">
                    <input type="text" value={url} onChange={(e) => updateVariantImage(i, imgIdx, e.target.value)} placeholder="URL" className="w-32 rounded-lg border border-neutral-200 px-2 py-1 text-xs" />
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleVariantImageUpload(e, i, imgIdx)} disabled={uploadingIndex !== null} className="text-xs file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-0.5" title="Upload" />
                    {uploadingIndex === `v-${i}-${imgIdx}` && <span className="text-xs text-neutral-500">{uploadProgress}%</span>}
                    <button type="button" onClick={() => removeVariantImage(i, imgIdx)} className="text-neutral-400 hover:text-red-600">×</button>
                  </div>
                ))}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleVariantImageUpload(e, i, null)} disabled={uploadingIndex !== null} className="text-xs file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-0.5" title="Add image" />
                {uploadingIndex === `v-${i}-new` && <span className="text-xs text-neutral-500">{uploadProgress}%</span>}
                <button type="button" onClick={() => addVariantImage(i)} className="text-xs text-neutral-600 hover:text-neutral-900 border border-dashed border-neutral-300 rounded-lg px-2 py-1">+ Add image</button>
              </div>
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
        <div className="rounded-xl border border-neutral-200 p-4">
          <label className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <input
              type="checkbox"
              checked={showDisclaimer}
              onChange={(e) => setShowDisclaimer(e.target.checked)}
            />
            Show disclaimer section on product page
          </label>
          <div className="mt-3 grid gap-3">
            <input
              type="text"
              value={disclaimerTitle}
              onChange={(e) => setDisclaimerTitle(e.target.value)}
              placeholder="Disclaimer title"
              className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900"
            />
            <div className="space-y-2">
              {disclaimerItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateDisclaimerItem(i, e.target.value)}
                    placeholder={`Point ${i + 1}`}
                    className="flex-1 rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900"
                  />
                  <button type="button" onClick={() => removeDisclaimerItem(i)} className="text-neutral-500 hover:text-red-600">×</button>
                </div>
              ))}
              <button type="button" onClick={addDisclaimerItem} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add point</button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-neutral-700">Product badges (optional)</label>
            <button type="button" onClick={addDemoBadges} className="text-xs text-neutral-600 hover:text-neutral-900">
              + Add demo badges
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {productBadges.map((b, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-12">
                <input
                  type="text"
                  value={b.label}
                  onChange={(e) => updateProductBadge(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="sm:col-span-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
                <input
                  type="text"
                  value={b.imageUrl}
                  onChange={(e) => updateProductBadge(i, 'imageUrl', e.target.value)}
                  placeholder="Badge image URL"
                  className="sm:col-span-6 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
                <input
                  type="text"
                  value={b.href || ''}
                  onChange={(e) => updateProductBadge(i, 'href', e.target.value)}
                  placeholder="Optional click URL"
                  className="sm:col-span-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
                <button type="button" onClick={() => removeProductBadge(i)} className="sm:col-span-1 text-neutral-500 hover:text-red-600">×</button>
              </div>
            ))}
            <button type="button" onClick={addProductBadge} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add badge</button>
          </div>
        </div>
        <div className="flex gap-4">
          <button type="submit" disabled={submitting} className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium disabled:opacity-50">Save product</button>
          <Link href="/admin/products" className="rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-900">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
