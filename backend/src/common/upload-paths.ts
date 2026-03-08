import { join } from 'path';

/**
 * Root directory for uploaded files (products, blog, slider).
 * Set UPLOAD_ROOT to an absolute path outside the app (e.g. /var/data/nature-secret)
 * so images survive redeploys. If unset, uses process.cwd() (uploads live in app dir).
 */
export function getUploadRoot(): string {
  const root = process.env.UPLOAD_ROOT;
  if (root && root.startsWith('/')) return root.replace(/\/$/, '');
  return process.cwd();
}

export const UPLOAD_PATHS = {
  products: () => join(getUploadRoot(), 'products'),
  blog: () => join(getUploadRoot(), 'blog'),
  slider: () => join(getUploadRoot(), 'slider'),
};
