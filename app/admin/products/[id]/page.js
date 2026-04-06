'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from '@/components/Link';
import { useRouter, useParams } from 'next/navigation';
import { useProductsStore } from '@/lib/store';
import {
  getCategories,
  uploadProductImage,
  updateProduct as updateProductApi,
  formatApiError,
  getAdminReviews,
  setProductRating,
  approveReview,
  createAdminReview,
  updateAdminReview,
  deleteAdminReview,
} from '@/lib/api';
import { compressReviewMediaFile } from '@/lib/compressReviewMedia';
import { Spinner } from '@/components/ui/PageLoader';

const emptyVariant = () => ({ id: `v-${Date.now()}`, name: '', volume: '', price: 0, compareAtPrice: null, images: [] });
const emptyFaq = () => ({ q: '', a: '' });
const emptyProductBadge = () => ({ label: '', imageUrl: '', href: '' });
const demoBadges = [
  { label: '100% Organic', imageUrl: 'https://img.shields.io/badge/100%25-Organic-2e7d32?style=for-the-badge' },
  { label: '100% Natural', imageUrl: 'https://img.shields.io/badge/100%25-Natural-388e3c?style=for-the-badge' },
  { label: 'Secure', imageUrl: 'https://img.shields.io/badge/Secure-SSL-1e88e5?style=for-the-badge' },
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const products = useProductsStore((s) => s.products);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const product = products.find((p) => p.id === params.id);
  const [categories, setCategories] = useState([]);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [advertisingId, setAdvertisingId] = useState('');
  const [categoryId, setCategoryId] = useState('herbal-oils');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState(['']);
  const [images, setImages] = useState(['']);
  const [imageAlts, setImageAlts] = useState(['']);
  const [uploadSlug, setUploadSlug] = useState('');
  const [inventory, setInventory] = useState(0);
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
  const [badgeUploadIndex, setBadgeUploadIndex] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [liveReviews, setLiveReviews] = useState([]);
  const [liveAuthor, setLiveAuthor] = useState('');
  const [liveRating, setLiveRating] = useState(5);
  const [liveBody, setLiveBody] = useState('');
  const [liveSort, setLiveSort] = useState(0);
  const [liveMedia, setLiveMedia] = useState([]);
  const [liveSaving, setLiveSaving] = useState(false);

  const apiBase = typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '') : '';
  async function handleImageUpload(e, index) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploadingIndex(index);
    setUploadError('');
    try {
      const res = await uploadProductImage(file, { slug: uploadSlug, alt: imageAlts[index] });
      const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
      updateImage(index, url);
      if (res.alt) updateImageAlt(index, res.alt);
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setUploadingIndex(null);
      e.target.value = '';
    }
  }
  async function handleProductBadgeImageUpload(e, index) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setBadgeUploadIndex(index);
    setUploadError('');
    try {
      const ready = await compressReviewMediaFile(file);
      const res = await uploadProductImage(ready, { slug: uploadSlug || slug });
      const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
      updateProductBadge(index, 'imageUrl', url);
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setBadgeUploadIndex(null);
      e.target.value = '';
    }
  }

  async function handleVariantImageUpload(e, variantIndex, imageIndex) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setUploadingIndex(`v-${variantIndex}-${imageIndex ?? 'new'}`);
    setUploadError('');
    try {
      const res = await uploadProductImage(file);
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
      e.target.value = '';
    }
  }

  useEffect(() => {
    getCategories().then((list) => setCategories(Array.isArray(list) ? list : [])).catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    if (!product) return;
    setName(product.name || '');
    setSlug(product.slug || '');
    setAdvertisingId(product.advertisingId || '');
    setCategoryId(product.categoryId || 'herbal-oils');
    setPrice(product.price != null ? (product.price / 100).toString() : '');
    setCompareAtPrice(product.compareAtPrice != null ? (product.compareAtPrice / 100).toString() : '');
    setDescription(product.description || '');
    setBenefits(product.benefits?.length ? product.benefits : ['']);
    setImages(product.images?.length ? product.images : ['']);
    setImageAlts(Array.from({ length: (product.images?.length || 0) || 1 }, (_, i) => product.imageAlts?.[i] || ''));
    setInventory(product.inventory ?? 0);
    setBadge(product.badge || '');
    setBadgeSub(product.badgeSub || '');
    setVariants(product.variants?.length ? product.variants.map((v) => ({ ...v, price: (v.price || 0) / 100, compareAtPrice: v.compareAtPrice != null ? (v.compareAtPrice / 100).toString() : null, images: Array.isArray(v.images) ? v.images : (v.image ? [v.image] : []) })) : [emptyVariant()]);
    setFaq(product.faq?.length ? product.faq : [emptyFaq()]);
    setShowDisclaimer(!!product.showDisclaimer);
    setDisclaimerTitle(product.disclaimerTitle || 'Important Note');
    setDisclaimerItems(
      Array.isArray(product.disclaimerItems) && product.disclaimerItems.length
        ? product.disclaimerItems
        : (product.disclaimerText ? [product.disclaimerText] : ['']),
    );
    setProductBadges(
      Array.isArray(product.productBadges) && product.productBadges.length
        ? product.productBadges.map((b) => ({ label: b.label || '', imageUrl: b.imageUrl || '', href: b.href || '' }))
        : [emptyProductBadge()],
    );
    setRating(product.rating ?? 4.5);
    setReviewCount(product.reviewCount ?? 0);
  }, [product]);

  const refreshProductReviews = useCallback(() => {
    if (!product?.id) return;
    setReviewsLoading(true);
    getAdminReviews({ productId: product.id })
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCustomerReviews(arr.filter((r) => r.collection === 'user'));
        setLiveReviews(arr.filter((r) => r.collection === 'live'));
      })
      .catch(() => {
        setCustomerReviews([]);
        setLiveReviews([]);
      })
      .finally(() => setReviewsLoading(false));
  }, [product?.id]);

  useEffect(() => {
    refreshProductReviews();
  }, [refreshProductReviews]);

  async function handleLiveImageUpload(e, index) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    setLiveSaving(true);
    setUploadError('');
    try {
      const ready = await compressReviewMediaFile(file);
      const res = await uploadProductImage(ready, { slug: uploadSlug || slug });
      const url = res.url?.startsWith('http') ? res.url : apiBase + (res.url || '');
      setLiveMedia((prev) => {
        const next = [...prev];
        next[index] = { type: 'image', url };
        return next;
      });
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setLiveSaving(false);
      e.target.value = '';
    }
  }

  async function handleAddLiveReview(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!product?.id || !liveBody.trim()) return;
    setLiveSaving(true);
    setUploadError('');
    try {
      const media = liveMedia
        .map((x) => ({ type: x.type === 'video' ? 'video' : 'image', url: String(x.url || '').trim() }))
        .filter((x) => x.url);
      await createAdminReview({
        authorName: liveAuthor.trim() || 'Customer',
        rating: Number(liveRating) || 5,
        body: liveBody.trim(),
        collection: 'live',
        productId: product.id,
        approved: true,
        media: media.length ? media : undefined,
        sortOrder: Number(liveSort) || 0,
      });
      setLiveAuthor('');
      setLiveRating(5);
      setLiveBody('');
      setLiveSort(0);
      setLiveMedia([]);
      refreshProductReviews();
    } catch (err) {
      setUploadError(formatApiError(err));
    } finally {
      setLiveSaving(false);
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
    if (!product) return;
    const basePrice = Math.round(parseFloat(price) * 100) || 0;
    const compare = compareAtPrice ? Math.round(parseFloat(compareAtPrice) * 100) : null;
    const updates = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      advertisingId: advertisingId.trim() || null,
      categoryId,
      price: basePrice,
      compareAtPrice: compare,
      description,
      benefits: benefits.filter(Boolean),
      images: images.filter(Boolean),
      imageAlts: imageAlts.slice(0, images.length).map((a, i) => images[i] ? (a || '') : '').filter((_, i) => images[i]),
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
        compareAtPrice: variants.length > 1 && v.compareAtPrice != null && v.compareAtPrice !== '' ? Math.round(parseFloat(v.compareAtPrice) * 100) : null,
        images: Array.isArray(v.images) ? v.images.filter(Boolean) : (v.image ? [v.image] : []),
      })),
      faq: faq.filter((f) => f.q && f.a),
      showDisclaimer: !!showDisclaimer,
      disclaimerTitle: disclaimerTitle?.trim() || undefined,
      disclaimerItems: disclaimerItems.map((x) => x.trim()).filter(Boolean),
      productBadges: productBadges
        .filter((b) => b?.label?.trim() && b?.imageUrl?.trim())
        .map((b) => ({ label: b.label.trim(), imageUrl: b.imageUrl.trim(), href: b.href?.trim() || undefined })),
    };
    if (!updates.variants.length) updates.variants = [{ id: `v-${Date.now()}`, name: 'Default', volume: '-', price: basePrice, images: images[0] ? [images[0]] : [] }];
    setSubmitError('');
    setSubmitting(true);
    try {
      const updated = await updateProductApi(product.id, updates);
      updateProduct(product.id, updated);
      router.push('/admin/products');
    } catch (err) {
      setSubmitError(formatApiError(err));
    } finally {
      setSubmitting(false);
    }
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
      {submitError && <p className="mt-4 text-sm text-red-600">{submitError}</p>}
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
          <label className="block text-sm font-medium text-neutral-700 mb-1">Advertising ID (Meta)</label>
          <input
            type="text"
            value={advertisingId}
            onChange={(e) => setAdvertisingId(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32))}
            placeholder="Short id for ads / content_ids"
            className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900"
          />
          <p className="mt-1 text-xs text-neutral-500">Optional. Pixel &amp; CAPI content_ids. Max 32 characters.</p>
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
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="<p>...</p>, <strong>, <ul><li>...</li></ul>" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900 font-mono text-sm" />
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
          <label className="block text-sm font-medium text-neutral-700 mb-1">Images (slug optional)</label>
          {uploadError && <p className="text-sm text-red-600 mb-2">{uploadError}</p>}
          <input type="text" value={uploadSlug} onChange={(e) => setUploadSlug(e.target.value)} placeholder="Slug for next upload (optional)" className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-sm mb-2" />
          {images.map((url, i) => (
            <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleImageUpload(e, i)} disabled={uploadingIndex !== null} className="text-sm file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs" />
              {uploadingIndex === i && <span className="text-xs text-neutral-500">Uploading…</span>}
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
            <input type="text" value={badge} onChange={(e) => setBadge(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Badge sub</label>
            <input type="text" value={badgeSub} onChange={(e) => setBadgeSub(e.target.value)} className="w-full rounded-xl border border-neutral-200 px-4 py-2 text-neutral-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Variants (name, volume, price ₹{variants.length > 1 ? ', compare at ₹' : ''}, images)</label>
          {variants.map((v, i) => (
            <div key={i} className="border border-neutral-200 rounded-xl p-3 mb-3 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <input type="text" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                <input type="text" value={v.volume} onChange={(e) => updateVariant(i, 'volume', e.target.value)} className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
                <input type="number" step="0.01" value={v.price || ''} onChange={(e) => updateVariant(i, 'price', e.target.value)} className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm" />
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
                    {uploadingIndex === `v-${i}-${imgIdx}` && <span className="text-xs text-neutral-500">Uploading…</span>}
                    <button type="button" onClick={() => removeVariantImage(i, imgIdx)} className="text-neutral-400 hover:text-red-600">×</button>
                  </div>
                ))}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => handleVariantImageUpload(e, i, null)} disabled={uploadingIndex !== null} className="text-xs file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-0.5" title="Add image" />
                {uploadingIndex === `v-${i}-new` && <span className="text-xs text-neutral-500">Uploading…</span>}
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
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-neutral-700">Product badges (optional)</label>
            <button type="button" onClick={addDemoBadges} className="text-xs text-neutral-600 hover:text-neutral-900">
              + Add demo badges
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {productBadges.map((b, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-12 items-start">
                <input
                  type="text"
                  value={b.label}
                  onChange={(e) => updateProductBadge(i, 'label', e.target.value)}
                  placeholder="Label"
                  className="sm:col-span-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
                <div className="sm:col-span-6 flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={b.imageUrl}
                    onChange={(e) => updateProductBadge(i, 'imageUrl', e.target.value)}
                    placeholder="Badge image URL"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      id={`badge-upload-${i}`}
                      className="hidden"
                      onChange={(e) => handleProductBadgeImageUpload(e, i)}
                    />
                    <label
                      htmlFor={`badge-upload-${i}`}
                      className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                    >
                      {badgeUploadIndex === i ? 'Uploading…' : 'Upload image'}
                    </label>
                    {b.imageUrl ? (
                      <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">Saved</span>
                    ) : null}
                  </div>
                </div>
                <input
                  type="text"
                  value={b.href || ''}
                  onChange={(e) => updateProductBadge(i, 'href', e.target.value)}
                  placeholder="Optional click URL"
                  className="sm:col-span-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900"
                />
                <button type="button" onClick={() => removeProductBadge(i)} className="sm:col-span-1 text-neutral-500 hover:text-red-600 self-center">×</button>
              </div>
            ))}
            <button type="button" onClick={addProductBadge} className="text-sm text-neutral-600 hover:text-neutral-900">+ Add badge</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">Reviews</label>
          <p className="text-xs text-neutral-500 mb-2">Overall rating, live stories (photos/video), and customer submissions.</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-sm text-neutral-600">Overall rating:</span>
            <input type="number" min="0" max="5" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} className="w-16 rounded-lg border border-neutral-200 px-2 py-1 text-sm" />
            <span className="text-sm text-neutral-500">Count: {reviewCount}</span>
            <button
              type="button"
              onClick={async () => {
                if (!product) return;
                try {
                  const approvedN = customerReviews.filter((r) => r.approved).length;
                  await setProductRating(product.id, 5, approvedN);
                  setRating(5);
                  setReviewCount(approvedN);
                } catch (_) {}
              }}
              className="rounded-lg bg-gold-500 text-white px-3 py-1 text-sm font-medium"
            >
              Set 5 star
            </button>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-neutral-200 p-4 bg-neutral-50/50">
          <h3 className="text-sm font-medium text-neutral-800 mb-1">Live reviews (photos &amp; video)</h3>
          <p className="text-xs text-neutral-500 mb-3">Shown first on the product page. Add image uploads or paste a video URL (YouTube, Vimeo, or direct .mp4).</p>
          {reviewsLoading && !liveReviews.length ? (
            <p className="text-sm text-neutral-500 flex items-center gap-2"><Spinner className="h-4 w-4" /> Loading…</p>
          ) : null}
          <ul className="space-y-3 mb-4 max-h-64 overflow-y-auto">
            {liveReviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-medium text-neutral-800">{r.authorName}</span>
                    <span className="text-neutral-400 ml-2">★{r.rating}</span>
                    <p className="text-neutral-600 mt-1 break-words">{r.body}</p>
                    {Array.isArray(r.media) && r.media.length > 0 ? (
                      <p className="text-xs text-neutral-400 mt-1">{r.media.length} media file(s)</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-neutral-500">
                      Order
                      <input
                        type="number"
                        min={0}
                        max={999}
                        defaultValue={r.sortOrder ?? 0}
                        className="ml-1 w-14 rounded border border-neutral-200 px-1 py-0.5 text-xs"
                        onBlur={async (ev) => {
                          const v = Number(ev.target.value);
                          if (Number.isNaN(v)) return;
                          try {
                            await updateAdminReview(r.id, { sortOrder: v });
                            refreshProductReviews();
                          } catch (_) {}
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="text-red-600 hover:underline text-xs"
                      onClick={async () => {
                        if (!window.confirm('Delete this live review?')) return;
                        try {
                          await deleteAdminReview(r.id);
                          refreshProductReviews();
                        } catch (_) {}
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <form onSubmit={handleAddLiveReview} className="space-y-3 border-t border-neutral-200 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={liveAuthor}
                onChange={(e) => setLiveAuthor(e.target.value)}
                placeholder="Name"
                className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
              />
              <div className="flex gap-2 items-center">
                <label className="text-xs text-neutral-600 shrink-0">Rating</label>
                <select value={liveRating} onChange={(e) => setLiveRating(Number(e.target.value))} className="rounded-lg border border-neutral-200 px-2 py-2 text-sm flex-1">
                  {[5, 4, 3, 2, 1].map((v) => (
                    <option key={v} value={v}>{v} stars</option>
                  ))}
                </select>
                <label className="text-xs text-neutral-600 shrink-0">Order</label>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={liveSort}
                  onChange={(e) => setLiveSort(Number(e.target.value))}
                  className="w-16 rounded-lg border border-neutral-200 px-2 py-2 text-sm"
                />
              </div>
            </div>
            <textarea
              value={liveBody}
              onChange={(e) => setLiveBody(e.target.value)}
              placeholder="Review text"
              rows={3}
              required
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            />
            <div className="space-y-2">
              <p className="text-xs font-medium text-neutral-600">Media</p>
              {liveMedia.map((row, idx) => (
                <div key={`live-m-${idx}`} className="flex flex-wrap items-center gap-2">
                  <select
                    value={row.type}
                    onChange={(e) => setLiveMedia((prev) => prev.map((x, i) => (i === idx ? { ...x, type: e.target.value } : x)))}
                    className="rounded border border-neutral-200 px-2 py-1 text-xs"
                  >
                    <option value="image">Image</option>
                    <option value="video">Video URL</option>
                  </select>
                  {row.type === 'image' ? (
                    <>
                      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-xs max-w-[200px]" onChange={(e) => handleLiveImageUpload(e, idx)} />
                      <input
                        type="text"
                        value={row.url}
                        onChange={(e) => setLiveMedia((prev) => prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)))}
                        placeholder="Or paste image URL"
                        className="flex-1 min-w-[120px] rounded border border-neutral-200 px-2 py-1 text-xs"
                      />
                    </>
                  ) : (
                    <input
                      type="text"
                      value={row.url}
                      onChange={(e) => setLiveMedia((prev) => prev.map((x, i) => (i === idx ? { ...x, url: e.target.value } : x)))}
                      placeholder="YouTube, Vimeo, or .mp4 URL"
                      className="flex-1 min-w-[160px] rounded border border-neutral-200 px-2 py-1 text-xs"
                    />
                  )}
                  <button type="button" className="text-neutral-500 hover:text-red-600 text-xs" onClick={() => setLiveMedia((prev) => prev.filter((_, i) => i !== idx))}>×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLiveMedia((prev) => [...prev, { type: 'image', url: '' }])}
                className="text-xs text-gold-700 hover:underline"
              >
                + Add media
              </button>
            </div>
            <button
              type="submit"
              disabled={liveSaving || !liveBody.trim()}
              className="rounded-full sm:rounded-2xl bg-neutral-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {liveSaving ? 'Saving…' : 'Add live review'}
            </button>
          </form>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-medium text-neutral-800 mb-2">Customer reviews (submitted on site)</h3>
          {reviewsLoading ? (
            <p className="text-sm text-neutral-500">Loading reviews…</p>
          ) : customerReviews.length === 0 ? (
            <p className="text-sm text-neutral-500">No customer reviews yet.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 p-2">
              {customerReviews.map((r) => (
                <li key={r.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-gold-600">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
                      <span className="text-xs text-neutral-500">{r.authorName}</span>
                      <span className="text-xs text-neutral-400">
                        {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-neutral-700 break-words">{r.body}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      r.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                    }`}>
                      {r.approved ? 'Approved' : 'Pending'}
                    </span>
                    {!r.approved ? (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const updated = await approveReview(r.id, true);
                              setCustomerReviews((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
                            } catch (_) {}
                          }}
                          className="rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-500"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const updated = await approveReview(r.id, false);
                              setCustomerReviews((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
                            } catch (_) {}
                          }}
                          className="rounded-lg border border-red-300 text-red-700 px-2.5 py-1 text-xs font-medium hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const updated = await approveReview(r.id, false);
                            setCustomerReviews((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
                          } catch (_) {}
                        }}
                        className="rounded-lg border border-neutral-300 text-neutral-700 px-2.5 py-1 text-xs font-medium hover:bg-neutral-50"
                      >
                        Mark pending
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <button type="submit" disabled={submitting} className="rounded-full sm:rounded-2xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium disabled:opacity-50">Save changes</button>
          <Link href="/admin/products" className="rounded-xl border border-neutral-300 px-6 py-2.5 text-sm font-medium text-neutral-900">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
