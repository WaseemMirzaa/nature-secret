'use client';

/** Spinner graphic only (no copy). */
export function PageLoadSpinner() {
  return (
    <div
      className="h-10 w-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin"
      aria-hidden
    />
  );
}

/** Full-screen overlay: spinner only during automatic reload retries (no text or buttons). */
export function PageLoadRetryLoader() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-50/95 backdrop-blur-sm supports-[backdrop-filter]:bg-neutral-50/80"
      aria-busy="true"
    >
      <PageLoadSpinner />
    </div>
  );
}
