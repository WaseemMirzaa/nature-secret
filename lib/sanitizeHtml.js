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
