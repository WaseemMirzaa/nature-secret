/** Server-only: parallel fetch for home (smaller product limit than shop listing). */

import { getApiRequestTimeoutMs } from '@/lib/apiTimeout';

const HOME_PRODUCT_LIMIT = 48;

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');
}

async function fetchJson(path) {
  const url = `${apiBase()}/api/v1${path}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
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
    fetchJson('/slider'),
    fetchJson('/settings/content'),
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

  return { products, categories, slider, homeContent };
}
