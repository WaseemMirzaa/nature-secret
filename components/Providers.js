'use client';

import { useEffect } from 'react';
import { useCurrencyStore } from '@/lib/store';
import { ChunkLoadErrorHandler } from '@/components/ChunkLoadErrorHandler';
import { MetaPixelLoader } from '@/components/MetaPixelLoader';

export function Providers({ children }) {
  useEffect(() => {
    useCurrencyStore.getState().initFromLocale();
  }, []);
  return (
    <ChunkLoadErrorHandler>
      <MetaPixelLoader />
      {children}
    </ChunkLoadErrorHandler>
  );
}
