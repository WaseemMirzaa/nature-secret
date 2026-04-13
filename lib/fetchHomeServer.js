/** Server-only: parallel fetch for home (smaller product limit than shop listing). */

import { getApiRequestTimeoutMs } from '@/lib/apiTimeout';
import { getDevFallbackCategories, getDevFallbackProducts } from '@/lib/devCatalogFallback';

const HOME_PRODUCT_LIMIT = 48;

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

async function fetchJson(path, { revalidate = 60 } = {}) {
  const url = `${apiBase()}/api/v1${path}`;
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(getApiRequestTimeoutMs()),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHomePageData() {
  const [productsRes, categoriesRes, sliderRes, contentRes] = await Promise.all([
    fetchJson(`/products?limit=${HOME_PRODUCT_LIMIT}`),
    fetchJson('/categories'),
    fetchJson('/slider', { revalidate: 0 }),
    fetchJson('/settings/content', { revalidate: 0 }),
  ]);

  const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
  const categories = Array.isArray(categoriesRes) ? categoriesRes : [];
  const slider = Array.isArray(sliderRes) ? sliderRes : [];
  const homeContent =
    contentRes && typeof contentRes === 'object'
      ? {
          homeHeroIntro: contentRes.homeHeroIntro || '',
          homeStoryLabel: contentRes.homeStoryLabel || '',
          homeStoryHeading: contentRes.homeStoryHeading || '',
          homeStoryHtml: contentRes.homeStoryHtml || '',
        }
      : null;

  if (process.env.NODE_ENV === 'development' && products.length === 0) {
    return {
      products: getDevFallbackProducts(),
      categories: categories.length ? categories : getDevFallbackCategories(),
      slider,
      homeContent,
    };
  }

  return { products, categories, slider, homeContent };
}
