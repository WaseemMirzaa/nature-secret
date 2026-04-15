/**
 * Stable cart line keys for product + variant across PDP, listing quick-add, and Order Now.
 * Avoids duplicate rows when API omits variant.id on PDP but includes it on listing (or vice versa).
 */

/** @param {object|null|undefined} product */
/** @param {object|null|undefined} variant */
export function canonicalVariantId(product, variant) {
  const v = variant && typeof variant === 'object' ? variant : null;
  if (v?.id != null && String(v.id).trim()) return String(v.id).trim();
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 1) {
    const only = variants[0];
    if (only?.id != null && String(only.id).trim()) return String(only.id).trim();
  }
  return '';
}

/**
 * Collapse legacy duplicate rows: same `productId` with one line `variantId` empty and others sharing one non-empty id (single-variant mismatch).
 * @param {Array<object>} items
 */
export function mergeLegacyEmptyVsIdConflicts(items) {
  if (!Array.isArray(items) || items.length < 2) return items;
  const byPid = new Map();
  for (const raw of items) {
    if (!raw || raw.productId == null) continue;
    const pid = String(raw.productId);
    if (!byPid.has(pid)) byPid.set(pid, []);
    byPid.get(pid).push(raw);
  }
  const out = [];
  for (const list of byPid.values()) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    const keys = new Set(list.map((i) => canonicalVariantKey(i.variantId)));
    const nonEmpty = [...keys].filter(Boolean);
    if (nonEmpty.length === 1 && keys.has('')) {
      const vid = nonEmpty[0];
      let qty = 0;
      const template = list.find((r) => canonicalVariantKey(r.variantId) === vid) || list[0];
      for (const row of list) qty += Math.max(1, Math.round(Number(row.qty)) || 1);
      out.push({ ...template, productId: template.productId, variantId: vid, qty });
      continue;
    }
    out.push(...list);
  }
  return out;
}

/**
 * Merge rows with same productId + normalized variantId (sum qty), then fix legacy '' vs id pairs.
 * @param {Array<{ productId?: string, variantId?: string, qty?: number, [k: string]: unknown }>} items
 */
export function mergeDuplicateCartLines(items) {
  if (!Array.isArray(items) || !items.length) return [];
  const prepped = mergeLegacyEmptyVsIdConflicts(items);
  /** @type {Map<string, object>} */
  const map = new Map();
  for (const raw of prepped) {
    if (!raw || raw.productId == null) continue;
    const pid = String(raw.productId);
    const vid = canonicalVariantKey(raw.variantId);
    const key = `${pid}::${vid}`;
    const q = Math.max(1, Math.round(Number(raw.qty)) || 1);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...raw, productId: pid, variantId: vid || undefined, qty: q });
    } else {
      map.set(key, { ...prev, qty: (prev.qty || 1) + q });
    }
  }
  return [...map.values()];
}

/** @param {unknown} variantId */
export function canonicalVariantKey(variantId) {
  return String(variantId ?? '').trim();
}
