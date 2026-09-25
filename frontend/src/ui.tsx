import { useState, type FormEvent, type ReactNode } from 'react';
import { api, errorMessage } from './api';
import type { NoticeState } from './hooks';
import type { RouteStop } from './types';

export const fmtTime = (t: string) => t.slice(0, 5);

export function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const money = (v: number) => `Rs ${Number(v).toLocaleString()}`;

export function isoDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Notice({ notice }: { notice: NoticeState | null }) {
  if (!notice) return null;
  return (
    <div className={`notice notice-${notice.kind}`} role={notice.kind === 'err' ? 'alert' : 'status'}>
      {notice.text}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** The ordered stops of a trip drawn as a route line. Used for real sequences only: routes and pickup to dropoff. */
export function Trip({ stops }: { stops: { name: string; note?: string }[] }) {
  return (
    <ol className="trip">
      {stops.map((s, i) => (
        <li key={`${s.name}-${i}`}>
          <span className="trip-name">{s.name}</span>
          {s.note && <span className="trip-note">{s.note}</span>}
        </li>
      ))}
    </ol>
  );
}

export function RouteLine({ stops }: { stops: RouteStop[] }) {
  return <Trip stops={stops.map((s) => ({ name: s.areaName, note: s.minutesFromStart === 0 ? 'start' : `+${s.minutesFromStart} min` }))} />;
}

export function RateForm({ bookingId, target, onDone }: { bookingId: number; target: string; onDone: () => void }) {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post('/ratings', { bookingId, score, comment });
      onDone();
    } catch (ex) {
      setError(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        Rate {target}
        <select value={score} onChange={(e) => setScore(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} of 5</option>
          ))}
        </select>
      </label>
      <input aria-label="Comment" placeholder="Comment (optional)" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
      <button className="btn btn-primary" disabled={busy}>Submit rating</button>
      {error && <span className="field-error" role="alert">{error}</span>}
    </form>
  );
}
