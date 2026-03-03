'use client';

import Link from 'next/link';

const LOGO_SRC = '/assets/nature-secret-logo.svg';

/**
 * Site logo (includes brand name). Use everywhere for consistent branding.
 * @param {Object} props
 * @param {string} [props.className] - wrapper class (e.g. h-8, h-10)
 * @param {boolean} [props.link=true] - wrap in Link to /
 */
export function Logo({ className = 'h-8', link = true }) {
  const img = (
    <img
      src={LOGO_SRC}
      alt="Nature Secret"
      className={`w-auto object-contain object-left ${className}`}
    />
  );
  if (link) {
    return (
      <Link href="/" className={`flex items-center shrink-0 ${className}`} aria-label="Nature Secret home">
        {img}
      </Link>
    );
  }
  return <span className={`flex items-center shrink-0 ${className}`}>{img}</span>;
}
