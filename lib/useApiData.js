'use client';

import { useState, useEffect } from 'react';
import { getProducts, getCategories, getBlogPosts } from '@/lib/api';
import { useProductsStore, useBlogStore } from '@/lib/store';

const EMPTY_CATEGORIES = [];

/** Fetch products and categories from API; returns { products, categories, loading, error, fromApi }. */
export function useProductsAndCategories(storeProducts, storeCategories = EMPTY_CATEGORIES) {
  const [products, setProducts] = useState(Array.isArray(storeProducts) ? storeProducts : []);
  const [categories, setCategories] = useState(Array.isArray(storeCategories) ? storeCategories : EMPTY_CATEGORIES);
  const safeStoreCategories = Array.isArray(storeCategories) ? storeCategories : EMPTY_CATEGORIES;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    Promise.all([getProducts({ limit: 96 }).catch(() => null), getCategories().catch(() => null)])
      .then(([productsRes, categoriesRes]) => {
        if (cancelled) return;
        const productListRaw = Array.isArray(productsRes?.data) ? productsRes.data : [];
        const productsFailed = productsRes == null;
        const categoriesFailed = categoriesRes == null;
        if (productsFailed) setError(true);
        if (categoriesFailed) setError((e) => e || true);
        const categoryList = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes?.data && Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
        const categoryById = new Map((categoryList || []).map((c) => [String(c.id), c]));
        const productList = productListRaw.map((p) => {
          const c = categoryById.get(String(p.categoryId));
          return c?.advertisingId ? { ...p, categoryAdvertisingId: c.advertisingId } : p;
        });
        if (productsRes != null) {
          setProducts(productList);
          setFromApi(true);
          try {
            useProductsStore.getState().setProducts(productList);
          } catch (_) {}
        } else {
          setProducts(Array.isArray(storeProducts) ? storeProducts : []);
        }
        if (categoriesRes != null) {
          setCategories(categoryList.length ? categoryList : safeStoreCategories);
          setFromApi(true);
        } else {
          setCategories(safeStoreCategories);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts(Array.isArray(storeProducts) ? storeProducts : []);
          setCategories(safeStoreCategories);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // Intentional: one fetch on mount; store props only as fallbacks in async callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, []);

  return { products, categories, loading, error, fromApi };
}

/** Fetch blog posts from API; returns { posts, loading, error, fromApi }. */
export function useBlogPosts(storePosts = []) {
  const [posts, setPosts] = useState(Array.isArray(storePosts) ? storePosts : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fromApi, setFromApi] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getBlogPosts({ limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res?.data) ? res.data : (res?.data ? [res.data] : []);
        if (list.length > 0 || (res && res.data !== undefined)) {
          setPosts(list.length ? list : (Array.isArray(storePosts) ? storePosts : []));
          setFromApi(true);
          try {
            useBlogStore.getState().setPosts(list.length ? list : []);
          } catch (_) {}
        } else {
          setPosts(Array.isArray(storePosts) ? storePosts : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPosts(Array.isArray(storePosts) ? storePosts : []);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
    // Intentional: one fetch on mount; storePosts only as fallback in async paths.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, []);

  return { posts, loading, error, fromApi };
}
