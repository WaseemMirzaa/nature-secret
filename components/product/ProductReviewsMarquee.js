'use client';

import { useMemo } from 'react';
import { ReviewMediaBlock } from '@/components/product/ReviewMediaBlock';

/** Seamless horizontal loop: duplicated track, translate -50%. */
export default function ProductReviewsMarquee({ reviews, resolveImageUrl, scrubMedicalTerms }) {
  const scrub = scrubMedicalTerms || ((t) => t);

  const { sequence, durationSec } = useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return { sequence: [], durationSec: 60 };
    }
    const minUnique = 3;
    let base = reviews;
    if (reviews.length < minUnique) {
      base = [];
      const n = reviews.length * Math.ceil(minUnique / reviews.length);
      for (let i = 0; i < n; i++) base.push(reviews[i % reviews.length]);
    }
    const sec = Math.min(100, Math.max(28, base.length * 6.5));
    return { sequence: base, durationSec: sec };
  }, [reviews]);

  const doubled = useMemo(() => [...sequence, ...sequence], [sequence]);

  if (sequence.length === 0) return null;

  return (
    <div
      className="ns-reviews-marquee-viewport rounded-xl sm:rounded-2xl border border-neutral-100 bg-gradient-to-b from-neutral-50/90 to-white py-3 shadow-sm [contain:layout_style]"
      tabIndex={0}
      aria-label="Customer reviews, auto-scrolling horizontally"
    >
      <div
        className="ns-reviews-marquee-track gap-3 sm:gap-4 px-2 sm:px-2"
        style={{ '--ns-marquee-sec': `${durationSec}s` }}
      >
        {doubled.map((r, i) => (
          <article
            key={`${r.id}-${i}`}
            className="w-[min(17.5rem,calc(100vw-3rem))] shrink-0 sm:w-[300px] rounded-lg sm:rounded-xl border border-neutral-100 bg-neutral-50/50 p-3 sm:p-4"
          >
            {Array.isArray(r.media) && r.media.length > 0 ? (
              <div className="mb-2 space-y-2 sm:mb-3">
                {r.media.map((m, mi) => (
                  <ReviewMediaBlock
                    key={`${r.id}-um-${i}-${mi}`}
                    item={m}
                    resolveImageUrl={resolveImageUrl}
                  />
                ))}
              </div>
            ) : null}
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
              <span className="text-sm text-gold-600 sm:text-base">{'★'.repeat(Math.min(5, r.rating || 0))}</span>
              <span className="text-sm text-neutral-400 sm:text-base">{'★'.repeat(5 - Math.min(5, r.rating || 0))}</span>
              <span className="text-xs font-medium text-neutral-700 sm:text-sm">{r.authorName}</span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-600 sm:text-sm sm:leading-relaxed">{scrub(r.body)}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
