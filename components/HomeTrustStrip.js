'use client';

/** Full-width trust + conversion strip for the home hero (no CMS copy). */
export function HomeTrustStrip() {
  const items = [
    { title: 'Cash on delivery', sub: 'Pay securely when your order arrives' },
    { title: 'Nationwide delivery', sub: 'Most orders in 3–7 business days' },
    { title: 'Easy returns', sub: '7-day return window on qualifying orders' },
  ];
  return (
    <div
      className="rounded-2xl border border-neutral-200/40 bg-white/40 py-5 shadow-sm backdrop-blur-md sm:py-6 px-4 sm:px-6"
      role="region"
      aria-label="Why customers trust us"
    >
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex gap-3.5 rounded-xl border border-white/50 bg-white/50 p-3.5 shadow-[0_1px_0_rgba(0,0,0,0.03)] sm:flex-col sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none"
          >
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-200/80 bg-accent-cream text-[11px] font-semibold text-neutral-800 shadow-sm"
              aria-hidden
            >
              ✓
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-800">{item.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-neutral-600">{item.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
