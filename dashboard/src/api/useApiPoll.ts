import { useEffect, useRef, useState } from 'react';

export interface ApiPollState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Polls `fetchFn` every `intervalMs`. Chosen over SSE/WebSocket because the
 * documented backend contract (BUILD_SPEC.md Section 5) exposes only plain
 * REST routes — no `/stream` or WS endpoint — and inventing one would mean
 * inventing a backend contract, out of scope for a frontend-restructure task.
 *
 * On failure, `error` is set and left for the caller to render (loading/empty/
 * error state) — this hook never falls back to mock data on its own; that
 * switch lives entirely in client.ts via USE_MOCK_DATA (see api/config.ts).
 */
export function useApiPoll<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = [],
): ApiPollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const result = await fetchFnRef.current();
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    const timer = setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, loading, error };
}
