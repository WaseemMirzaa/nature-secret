'use client';

/** @type {{ id: string, close: () => void }[]} */
const stack = [];
let ignoreNextPop = false;
let listenerAttached = false;

function attachListener() {
  if (typeof window === 'undefined' || listenerAttached) return;
  listenerAttached = true;
  window.addEventListener('popstate', () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    const entry = stack.pop();
    if (entry) entry.close();
  });
}

/**
 * Push a history entry so mobile Back closes this overlay before leaving the page.
 * Call once when the overlay opens (see ref pattern in callers).
 */
export function overlayHistoryOpen(id, close) {
  if (typeof window === 'undefined') return;
  attachListener();
  const last = stack[stack.length - 1];
  if (last && last.id === id) return;
  window.history.pushState({ nsOverlay: id }, '', window.location.href);
  stack.push({ id, close });
}

/**
 * Overlay closed via UI (×, backdrop). Removes the synthetic entry without double-closing via popstate.
 */
export function overlayHistoryDismissIfTop(id, syncClose) {
  if (typeof window === 'undefined') {
    syncClose();
    return;
  }
  const top = stack[stack.length - 1];
  if (top && top.id === id) {
    ignoreNextPop = true;
    stack.pop();
    window.history.back();
  }
  syncClose();
}

/**
 * Pop overlay from stack without history.back() — use when a Link will navigate (history.back() can cancel client navigation).
 */
export function overlayHistoryDismissForNavigation(id, syncClose) {
  if (typeof window === 'undefined') {
    syncClose();
    return;
  }
  const top = stack[stack.length - 1];
  if (top && top.id === id) {
    stack.pop();
  }
  syncClose();
}
