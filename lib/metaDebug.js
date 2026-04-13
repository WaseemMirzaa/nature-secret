/**
 * Opt-in Meta Pixel / CAPI diagnostics only. Default: **no console output**.
 * Enable with `NEXT_PUBLIC_META_DEBUG=true` at **build** time, then rebuild.
 * @see lib/meta-pixel-gate.js — Pixel script loads only when the session gate opens (or OPEN_PIXEL_GATE / test code on localhost).
 */

export function isMetaDebugEnabled() {
  return typeof process !== 'undefined' && String(process.env.NEXT_PUBLIC_META_DEBUG || '').toLowerCase() === 'true';
}

export function metaDebug(label, detail) {
  if (!isMetaDebugEnabled() || typeof console === 'undefined' || !console.info) return;
  if (detail !== undefined) console.info(`[Meta] ${label}`, detail);
  else console.info(`[Meta] ${label}`);
}
