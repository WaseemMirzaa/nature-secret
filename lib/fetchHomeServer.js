/** Server-only: parallel fetch for home (smaller product limit than shop listing). */

import { getApiRequestTimeoutMs } from '@/lib/apiTimeout';
import { getServerApiOrigin } from '@/lib/serverApiOrigin';

const HOME_PRODUCT_LIMIT = 48;

async function fetchJson(path, { revalidate = 60 } = {}) {
  const url = `${getServerApiOrigin()}/api/v1${path}`;
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
    /** Was `revalidate: 0` (no cache) — hurt TTFB; slider rarely needs sub-minute freshness. */
    fetchJson('/slider', { revalidate: 120 }),
    /** Home hero copy — align with public `settings/content` cache; avoids cold home blocking on CMS. */
    fetchJson('/settings/content', { revalidate: 300 }),
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
