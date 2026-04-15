import DOMPurify from 'isomorphic-dompurify';

/** Allowed tags for product description / rich text. */
const ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a', 'span', 'h2', 'h3', 'h4', 'blockquote'];

/**
 * Sanitize HTML for safe rendering (e.g. product description).
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: ['href', 'target', 'rel'] });
}

/** Richer allowlist for blog posts (still XSS-safe via DOMPurify). */
const BLOG_ALLOWED_TAGS = [
  ...ALLOWED_TAGS,
  'h1',
  'div',
  'section',
  'article',
  'pre',
  'code',
  'hr',
  'img',
  'figure',
  'figcaption',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

/** @param {string} html */
export function sanitizeBlogHtml(html) {
  if (typeof html !== 'string' || !html.trim()) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: BLOG_ALLOWED_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'colspan', 'rowspan'],
  });
}
