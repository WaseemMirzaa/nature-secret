/** Client-only helpers to mirror structured sections from rich product descriptions (mobile PDP). */

export function extractIntroParagraphsFromDescription(html) {
  if (!html || typeof html !== 'string') return [];
  const paras = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html)) !== null && paras.length < 3) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) paras.push(text);
  }
  return paras;
}

export function extractHowToUseSteps(html) {
  if (!html || typeof html !== 'string') return [];
  const idx = html.search(/<h3[^>]*>[\s\S]*?How to Use[\s\S]*?<\/h3>/i);
  if (idx < 0) return [];
  const slice = html.slice(idx);
  const olMatch = slice.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
  if (!olMatch) return [];
  const items = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(olMatch[1])) !== null) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) items.push(text);
  }
  return items;
}

export function extractKeyBenefitLines(html) {
  if (!html || typeof html !== 'string') return [];
  const m = html.match(/<h3[^>]*>[\s\S]*?Key Benefits[\s\S]*?<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i);
  if (!m) return [];
  const items = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let x;
  while ((x = liRe.exec(m[1])) !== null) {
    const text = x[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) items.push(text);
  }
  return items;
}

export function parseHighlightLine(raw) {
  const t = String(raw || '')
    .replace(/\*\*/g, '')
    .trim();
  const segs = t.split(/\s+—\s+|\s+–\s+/);
  const head = (segs[0] || t).trim();
  const desc = segs.slice(1).join(' — ').trim();
  const arr = Array.from(head);
  const first = arr[0];
  const startsEmoji = first && /[^\w\d\s]/.test(first);
  if (startsEmoji) {
    return { icon: first, title: arr.slice(1).join('').trim() || head, desc };
  }
  return { icon: '🌿', title: head, desc };
}

export function reviewerInitials(name) {
  const s = String(name || '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function pickBestValueVariantId(variants) {
  if (!Array.isArray(variants) || variants.length < 2) return null;
  let bestId = null;
  let bestMl = -1;
  for (const v of variants) {
    const n = `${v.name || ''} ${v.volume || ''}`;
    const ml = parseInt(n.replace(/[^0-9]/g, ''), 10) || 0;
    if (ml >= bestMl) {
      bestMl = ml;
      bestId = v.id;
    }
  }
  return bestMl > 0 ? bestId : null;
}
