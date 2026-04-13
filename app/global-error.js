'use client';

import { RecoverableLoadErrorClient } from '@/components/RecoverableLoadErrorClient';

/** Root layout failures only — same retry UX as `app/error.js` (spinner until retries exhausted). */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased bg-neutral-50">
        <RecoverableLoadErrorClient error={error} reset={reset} />
      </body>
    </html>
  );
}
