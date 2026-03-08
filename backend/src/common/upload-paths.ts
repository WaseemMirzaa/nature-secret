import { join } from 'path';
import { existsSync, mkdirSync, accessSync, constants } from 'fs';

/**
 * Root directory for uploaded files (products, blog, slider).
 * Set UPLOAD_ROOT to an absolute path outside the app so images survive redeploys.
 * If UPLOAD_ROOT is set but missing or not writable, falls back to process.cwd() to avoid ERR_CONNECTION_RESET.
 */
export function getUploadRoot(): string {
  const cwd = process.cwd();
  const root = process.env.UPLOAD_ROOT?.trim();
  if (!root || !root.startsWith('/')) return cwd;
  const dir = root.replace(/\/$/, '');
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    accessSync(dir, constants.W_OK);
    return dir;
  } catch {
    console.warn('[upload-paths] UPLOAD_ROOT not usable:', dir, '- using app directory. Create the folder and set permissions, or fix UPLOAD_ROOT.');
    return cwd;
  }
}

export const UPLOAD_PATHS = {
  products: () => join(getUploadRoot(), 'products'),
  blog: () => join(getUploadRoot(), 'blog'),
  slider: () => join(getUploadRoot(), 'slider'),
};
