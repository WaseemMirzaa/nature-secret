/** Server-only: parallel fetch for home (smaller product limit than shop listing). */

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
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHomePageData() {
  const [productsRes, categoriesRes, sliderRes, reviewsRes] = await Promise.all([
    fetchJson(`/products?limit=${HOME_PRODUCT_LIMIT}`),
    fetchJson('/categories'),
    fetchJson('/slider'),
    fetchJson('/reviews/highlights'),
  ]);

  const products = Array.isArray(productsRes?.data) ? productsRes.data : [];
  const categories = Array.isArray(categoriesRes) ? categoriesRes : [];
  const slider = Array.isArray(sliderRes) ? sliderRes : [];
  const highlightReviews = Array.isArray(reviewsRes) ? reviewsRes : [];

  return { products, categories, slider, highlightReviews };
}
