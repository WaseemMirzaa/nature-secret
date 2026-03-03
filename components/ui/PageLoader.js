'use client';

/** Full-page loader for initial load / hydration */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-neutral-200 border-t-gold-600 animate-spin" />
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    </div>
  );
}

/** Inline spinner */
export function Spinner({ className = '' }) {
  return (
    <div
      className={`h-6 w-6 rounded-full border-2 border-neutral-200 border-t-gold-600 animate-spin ${className}`}
      aria-busy="true"
    />
  );
}

/** Skeleton row for table */
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr className="border-b border-neutral-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 w-full max-w-[120px] rounded bg-neutral-200 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for admin list (multiple rows). Use inside <tbody>. */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRowSkeleton key={i} cols={cols} />
      ))}
    </>
  );
}

/** Card/section skeleton for blog/products style lists */
export function CardListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="h-16 w-24 rounded-lg bg-neutral-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-neutral-200 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-neutral-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
