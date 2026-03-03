'use client';

import { useState, useEffect } from 'react';
import { getProducts, getCategories, getBlogPosts } from '@/lib/api';
import { CATEGORIES as FALLBACK_CATEGORIES } from '@/lib/dummy-data';
import { useProductsStore, useBlogStore } from '@/lib/store';

/** Fetch products from API; returns { products: [], categories: [], loading, fromApi }. Caches to store when API returns. */
export function useProductsAndCategories(storeProducts, storeCategories = FALLBACK_CATEGORIES) {
  const hasCached = Array.isArray(storeProducts) && storeProducts.length > 0;
  const [products, setProducts] = useState(storeProducts || []);
  const [categories, setCategories] = useState(storeCategories || []);
  const [loading, setLoading] = useState(!hasCached);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    if (!fromApi && Array.isArray(storeProducts) && storeProducts.length) setProducts(storeProducts);
    if (!fromApi && Array.isArray(storeCategories) && storeCategories.length) setCategories(storeCategories);
  }, [fromApi, storeProducts, storeCategories]);

  useEffect(() => {
    let cancelled = false;
    if (!hasCached) setLoading(true);
    Promise.all([getProducts({ limit: 200 }).catch(() => null), getCategories().catch(() => null)])
      .then(([productsRes, categoriesRes]) => {
        if (cancelled) return;
        if (productsRes?.data?.length) {
          setProducts(productsRes.data);
          setFromApi(true);
          try {
            useProductsStore.getState().setProducts(productsRes.data);
          } catch (_) {}
        } else {
          setProducts(storeProducts || []);
        }
        if (Array.isArray(categoriesRes) && categoriesRes.length) {
          setCategories(categoriesRes);
          setFromApi((f) => f || true);
        } else {
          setCategories(storeCategories || FALLBACK_CATEGORIES);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts(storeProducts || []);
          setCategories(storeCategories || FALLBACK_CATEGORIES);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { products, categories, loading, fromApi };
}

/** Fetch blog posts from API; returns { posts: [], loading, fromApi }. Caches to store when API returns. */
export function useBlogPosts(storePosts = []) {
  const hasCached = Array.isArray(storePosts) && storePosts.length > 0;
  const [posts, setPosts] = useState(Array.isArray(storePosts) ? storePosts : []);
  const [loading, setLoading] = useState(!hasCached);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!hasCached) setLoading(true);
    getBlogPosts({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        if (res?.data?.length) {
          setPosts(res.data);
          setFromApi(true);
          try {
            useBlogStore.getState().setPosts(res.data);
          } catch (_) {}
        } else {
          setPosts(Array.isArray(storePosts) ? storePosts : []);
        }
      })
      .catch(() => { if (!cancelled) setPosts(Array.isArray(storePosts) ? storePosts : []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { posts, loading, fromApi };
}
