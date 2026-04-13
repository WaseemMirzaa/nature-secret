/**
 * Dev catalog when API is empty — same data as UI mock (includes Unsplash images).
 */
import { getUiMockCategories, getUiMockProducts } from '@/lib/uiMockData';

export function getDevFallbackCategories() {
  return getUiMockCategories();
}

export function getDevFallbackProducts() {
  return getUiMockProducts();
}
