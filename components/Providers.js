'use client';

import { useEffect } from 'react';
import { useCurrencyStore } from '@/lib/store';

export function Providers({ children }) {
  useEffect(() => {
    useCurrencyStore.getState().initFromLocale();
  }, []);
  return <>{children}</>;
}
