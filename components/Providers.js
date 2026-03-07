'use client';

import { useEffect } from 'react';
import { useCurrencyStore } from '@/lib/store';
import { ChunkLoadErrorHandler } from '@/components/ChunkLoadErrorHandler';

export function Providers({ children }) {
  useEffect(() => {
    useCurrencyStore.getState().initFromLocale();
  }, []);
  return (
    <ChunkLoadErrorHandler>
      {children}
    </ChunkLoadErrorHandler>
  );
}
