import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useLoad, useNotice } from '../hooks';
import type { Area, Created, Match } from '../types';
import { Empty, Notice, Trip, fmtDate, fmtTime, isoDate, money } from '../ui';

export default function FindRide() {
  const nav = useNavigate();
  const areas = useLoad(() => api.get<Area[]>('/areas'));
  const [form, setForm] = useState({
    pickupAreaId: '', dropoffAreaId: '', rideDate: isoDate(1), windowStart: '07:00', windowEnd: '08:30', seatsNeeded: 1,
  });
  const [requestId, setRequestId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [busy, setBusy] = useState(false);
  const { notice, err, clear } = useNotice();

  const sameArea = form.pickupAreaId !== '' && form.pickupAreaId === form.dropoffAreaId;
  const areaName = (id: string) => areas.data?.find((a) => String(a.areaId) === id)?.areaName ?? '';

  async function search(e: FormEvent) {
    e.preventDefault();
    clear();
    setBusy(true);
    try {
      const created = await api.post<Created>('/requests', {
        pickupAreaId: Number(form.pickupAreaId),
        dropoffAreaId: Number(form.dropoffAreaId),
        rideDate: form.rideDate,
        windowStart: form.windowStart,
        windowEnd: form.windowEnd,
        seatsNeeded: form.seatsNeeded,
      });
      setRequestId(created.id);
      setMatches(await api.get<Match[]>(`/requests/${created.id}/matches`));
    } catch (ex) {
      err(ex);
    } finally {
      setBusy(false);
    }
  }

  async function book(offerId: number) {
    if (requestId === null) return;
    clear();
    try {
      await api.post('/bookings', { requestId, offerId });
      nav('/rides');
    } catch (ex) {
      err(ex);
      // seats may have just been taken: refresh the list so the person sees what is still available
      try {
        setMatches(await api.get<Match[]>(`/requests/${requestId}/matches`));
      } catch (refreshError) {
        err(refreshError);
      }
    }
  }

  return (
    <>
      <h1>Find a ride</h1>
      <form className="panel form-grid" onSubmit={search}>
        <label>Pickup
          <select required value={form.pickupAreaId} onChange={(e) => setForm({ ...form, pickupAreaId: e.target.value })}>
            <option value="">Choose an area</option>
            {areas.data?.map((a) => <option key={a.areaId} value={a.areaId}>{a.areaName}</option>)}
          </select>
        </label>
        <label>Drop-off
          <select required value={form.dropoffAreaId} onChange={(e) => setForm({ ...form, dropoffAreaId: e.target.value })}>
            <option value="">Choose an area</option>
            {areas.data?.map((a) => <option key={a.areaId} value={a.areaId}>{a.areaName}</option>)}
          </select>
        </label>
        <label>Date<input type="date" required min={isoDate(0)} value={form.rideDate} onChange={(e) => setForm({ ...form, rideDate: e.target.value })} /></label>
        <label>Seats
          <select value={form.seatsNeeded} onChange={(e) => setForm({ ...form, seatsNeeded: Number(e.target.value) })}>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Pickup from<input type="time" required value={form.windowStart} onChange={(e) => setForm({ ...form, windowStart: e.target.value })} /></label>
        <label>Pickup until<input type="time" required value={form.windowEnd} onChange={(e) => setForm({ ...form, windowEnd: e.target.value })} /></label>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || sameArea || form.windowStart >= form.windowEnd}>
            {busy ? 'Searching…' : 'Find matching rides'}
          </button>
          {sameArea && <span className="field-error">Pickup and drop-off must be different.</span>}
          {form.windowStart >= form.windowEnd && <span className="field-error">The pickup window must end after it starts.</span>}
        </div>
      </form>

      <Notice notice={notice} />

      {matches && (
        <section aria-live="polite">
          <h2>{matches.length === 0 ? 'No matching rides yet' : `${matches.length} matching ${matches.length === 1 ? 'ride' : 'rides'}`}</h2>
          {matches.length === 0 && <Empty>No driver passes both stops inside that window. Widen the pickup window or try another date.</Empty>}
          <ul className="list">
            {matches.map((m) => (
              <li key={m.offerId} className="item">
                <div className="item-time">
                  <strong>{fmtTime(m.pickupTime)}</strong>
                  <span>{fmtDate(m.rideDate)}</span>
                </div>
                <div className="item-body">
                  <Trip stops={[{ name: areaName(form.pickupAreaId) }, { name: areaName(form.dropoffAreaId) }]} />
                  <p className="meta">
                    {m.driverName} · {m.vehicle} · {m.avgRating ? `${m.avgRating.toFixed(1)} rating` : 'New driver'} · {m.availableSeats} {m.availableSeats === 1 ? 'seat' : 'seats'} left
                  </p>
                </div>
                <div className="item-side">
                  <strong>{money(m.totalFare)}</strong>
                  <button className="btn btn-primary" onClick={() => book(m.offerId)}>Request seat</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
