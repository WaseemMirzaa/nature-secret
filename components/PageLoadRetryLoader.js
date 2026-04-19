'use client';

/** Indeterminate circular loader (no attempt count or linear progress). */
export function PageLoadCircularIndeterminate({ className = '' } = {}) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <svg
        className="h-12 w-12 text-neutral-900 animate-spin"
        style={{ animationDuration: '0.75s' }}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
      >
        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="2.5" className="text-neutral-200" />
        <circle
          cx="24"
          cy="24"
          r="20"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="31.4 94.2"
          className="text-neutral-800"
        />
      </svg>
    </div>
  );
}

/** Same ring as full-page retry loader (legacy export). */
export function PageLoadSpinner() {
  return <PageLoadCircularIndeterminate />;
}

/**
 * Full-screen overlay during automatic reload retries: circular loader only (no copy, no retry fraction).
 */
export function PageLoadRetryLoader() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-50/95 px-6 backdrop-blur-sm supports-[backdrop-filter]:bg-neutral-50/80"
      aria-busy="true"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <PageLoadCircularIndeterminate />
    </div>
  );
}
