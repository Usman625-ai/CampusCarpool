import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from './api';

/** Loads data on mount and whenever deps change; call reload() after a mutation. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fn()
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => alive && setError(errorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}

export interface NoticeState { kind: 'ok' | 'err'; text: string }

export function useNotice() {
  const [notice, setNotice] = useState<NoticeState | null>(null);
  return {
    notice,
    ok: (text: string) => setNotice({ kind: 'ok', text }),
    err: (e: unknown) => setNotice({ kind: 'err', text: errorMessage(e) }),
    clear: () => setNotice(null),
  };
}
