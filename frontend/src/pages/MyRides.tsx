import { api } from '../api';
import { useLoad, useNotice } from '../hooks';
import type { Booking } from '../types';
import { Empty, Notice, RateForm, StatusBadge, Trip, fmtDate, fmtDateTime, fmtTime } from '../ui';

export default function MyRides() {
  const { data, error, loading, reload } = useLoad(() => api.get<Booking[]>('/me/bookings'));
  const { notice, ok, err, clear } = useNotice();

  async function cancel(id: number) {
    if (!window.confirm('Cancel this booking? Your seat goes back to the driver.')) return;
    clear();
    try {
      await api.post(`/bookings/${id}/cancel`);
      ok('Booking cancelled.');
      reload();
    } catch (ex) {
      err(ex);
    }
  }

  return (
    <>
      <h1>My rides</h1>
      <Notice notice={notice} />
      {error && <Notice notice={{ kind: 'err', text: error }} />}
      {loading && !data && <p className="empty">Loading…</p>}
      {data && data.length === 0 && <Empty>You have no bookings yet. Find a ride to request your first seat.</Empty>}
      <ul className="list">
        {data?.map((b) => (
          <li key={b.bookingId} className="item">
            <div className="item-time">
              <strong>{fmtTime(b.departureTime)}</strong>
              <span>{fmtDate(b.rideDate)}</span>
            </div>
            <div className="item-body">
              <Trip stops={[{ name: b.pickup }, { name: b.dropoff }]} />
              <p className="meta">
                Driver {b.counterpart} · {b.seats} {b.seats === 1 ? 'seat' : 'seats'}
                {b.status === 'Pending' && ` · seat held until ${fmtDateTime(b.expiresAt)}`}
              </p>
              {b.status === 'Completed' && !b.rated && (
                <RateForm bookingId={b.bookingId} target={b.counterpart} onDone={() => { ok('Thanks for rating your driver.'); reload(); }} />
              )}
            </div>
            <div className="item-side">
              <StatusBadge status={b.status} />
              {(b.status === 'Pending' || b.status === 'Confirmed') && (
                <button className="btn btn-danger" onClick={() => cancel(b.bookingId)}>Cancel booking</button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
