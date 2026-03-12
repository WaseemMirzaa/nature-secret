'use client';

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin" />
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    </div>
  );
}

export function Spinner({ className = '' }) {
  return (
    <div
      className={`h-6 w-6 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin ${className}`}
      aria-busy="true"
    />
  );
}

/** Inline loader: spinner + optional label for page content areas */
export function InlineLoader({ label = 'Loading', className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-8 text-neutral-500 ${className}`} aria-busy="true">
      <div className="h-6 w-6 flex-shrink-0 rounded-full border-2 border-neutral-200 border-t-neutral-600 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function CustomerPageLoader({ message = 'Loading...' }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 flex flex-col items-center justify-center" aria-busy="true">
      <div className="relative mb-6">
        <div className="w-12 h-12 rounded-full border-[3px] border-neutral-100" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-neutral-900 animate-spin" />
      </div>
      <p className="text-sm font-medium text-neutral-600 tracking-wide">{message}</p>
      <div className="mt-2 flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export function OrderCardSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-3">
              <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-neutral-100 animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-neutral-100 animate-pulse" />
          </div>
          <div className="p-4 sm:p-5 space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-neutral-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-neutral-50 animate-pulse" />
                </div>
                <div className="h-4 w-16 rounded bg-neutral-100 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
            <div className="h-5 w-20 rounded bg-neutral-200 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-xl bg-neutral-100 animate-pulse" />
              <div className="h-9 w-20 rounded-xl bg-neutral-200 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <div className="h-4 w-28 rounded bg-neutral-100 animate-pulse" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-neutral-200 animate-pulse" />
          <div className="h-4 w-36 rounded bg-neutral-100 animate-pulse" />
        </div>
        <div className="h-7 w-24 rounded-full bg-neutral-100 animate-pulse" />
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
          <div className="h-4 w-16 rounded bg-neutral-200 animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 sm:p-5 flex items-center gap-4 border-b border-neutral-100 last:border-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-neutral-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 rounded bg-neutral-100 animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-neutral-50 animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded bg-neutral-100 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
        <div className="h-4 w-28 rounded bg-neutral-200 animate-pulse" />
        <div className="h-3 w-full rounded bg-neutral-50 animate-pulse" />
        <div className="h-3 w-2/3 rounded bg-neutral-50 animate-pulse" />
        <div className="h-5 w-1/3 rounded bg-neutral-200 animate-pulse mt-2" />
      </div>
    </div>
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
