'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-neutral-50 text-neutral-900">
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-neutral-600 text-sm mb-6 text-center max-w-md">The page could not load. This can happen when the API is unavailable or there is a temporary error.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl bg-neutral-900 text-white px-6 py-2.5 text-sm font-medium hover:bg-neutral-800"
      >
        Try again
      </button>
    </div>
  );
}
