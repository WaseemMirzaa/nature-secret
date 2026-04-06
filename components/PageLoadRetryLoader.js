'use client';

/** Spinner only during automatic reload retries; error copy only after exhaustion. */
export function PageLoadRetryLoader() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-50/95 backdrop-blur-sm px-6"
      aria-hidden
    >
      <div className="h-10 w-10 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
    </div>
  );
}
