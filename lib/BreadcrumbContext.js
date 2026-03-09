'use client';

import { createContext, useContext, useState } from 'react';

const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const [lastSegmentLabel, setLastSegmentLabel] = useState(null);
  return (
    <BreadcrumbContext.Provider value={{ lastSegmentLabel, setLastSegmentLabel }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbLabel() {
  return useContext(BreadcrumbContext);
}
