'use client';

import { useState, useEffect } from 'react';
import { getAdminAnalyticsEvents } from '@/lib/api';

function isoOrUndefined(v) {
  if (v == null || v === '') return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/**
 * Load analytics events from API for admin UI.
 * @param {{ from?: string, to?: string, sessionId?: string, email?: string }} filters
 */
export function useAdminAnalyticsEvents(filters = {}) {
  const { from, to, sessionId, email } = filters;
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { limit: 25000 };
    const f = isoOrUndefined(from);
    const t = isoOrUndefined(to);
    if (f) params.from = f;
    if (t) params.to = t;
    if (sessionId) params.sessionId = sessionId;
    if (email) params.email = email;
    if (sessionId || email) {
      const y = new Date();
      y.setFullYear(y.getFullYear() - 1);
      if (!params.from) params.from = y.toISOString();
    }
    getAdminAnalyticsEvents(params)
      .then((r) => {
        if (cancelled) return;
        setEvents(Array.isArray(r?.events) ? r.events : []);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setEvents([]);
          setError(e);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, sessionId, email]);

  return { events, loading, error };
}
