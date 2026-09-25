import { api } from '../api';
import { useLoad, useNotice } from '../hooks';
import type { Booking, MyOffer } from '../types';
import { Empty, Notice, RateForm, StatusBadge, Trip, fmtDate, fmtDateTime, fmtTime, money } from '../ui';

export default function DriverInbox() {
  const bookings = useLoad(() => api.get<Booking[]>('/me/driver-bookings'));
  const offers = useLoad(() => api.get<MyOffer[]>('/me/offers'));
  const { notice, ok, err, clear } = useNotice();

  const refresh = () => {
    bookings.reload();
    offers.reload();
  };

  async function run(action: () => Promise<unknown>, done: string) {
    clear();
    try {
      await action();
      ok(done);
      refresh();
    } catch (ex) {
      err(ex);
      refresh();
    }
  }

  const respond = (id: number, accept: boolean) =>
    run(() => api.post(`/bookings/${id}/respond`, { accept }), accept ? 'Booking confirmed.' : 'Booking declined. The seat is free again.');

  const cancelBooking = (id: number) => {
    if (window.confirm('Cancel this passenger’s booking?')) run(() => api.post(`/bookings/${id}/cancel`), 'Booking cancelled.');
  };

  const completeRide = (id: number) => {
    if (window.confirm('Mark this ride as completed? Confirmed passengers can then rate it.')) run(() => api.post(`/offers/${id}/complete`), 'Ride completed.');
  };

  const cancelOffer = (id: number) => {
    if (window.confirm('Cancel this ride? All passenger bookings on it will be cancelled.')) run(() => api.post(`/offers/${id}/cancel`), 'Ride cancelled.');
  };

  return (
    <>
      <h1>Driver inbox</h1>
      <Notice notice={notice} />

      <h2>Passenger requests</h2>
      {bookings.data && bookings.data.length === 0 && <Empty>No one has requested a seat on your rides yet.</Empty>}
      <ul className="list">
        {bookings.data?.map((b) => (
          <li key={b.bookingId} className="item">
            <div className="item-time">
              <strong>{fmtTime(b.departureTime)}</strong>
              <span>{fmtDate(b.rideDate)}</span>
            </div>
            <div className="item-body">
              <Trip stops={[{ name: b.pickup }, { name: b.dropoff }]} />
              <p className="meta">
                {b.counterpart} · {b.seats} {b.seats === 1 ? 'seat' : 'seats'}
                {b.status === 'Pending' && ` · answer before ${fmtDateTime(b.expiresAt)} or the request expires`}
              </p>
              {b.status === 'Completed' && !b.rated && (
                <RateForm bookingId={b.bookingId} target={b.counterpart} onDone={() => { ok('Thanks for rating your passenger.'); refresh(); }} />
              )}
            </div>
            <div className="item-side">
              <StatusBadge status={b.status} />
              {b.status === 'Pending' && (
                <span className="btn-row">
                  <button className="btn btn-primary" onClick={() => respond(b.bookingId, true)}>Confirm</button>
                  <button className="btn btn-ghost" onClick={() => respond(b.bookingId, false)}>Decline</button>
                </span>
              )}
              {b.status === 'Confirmed' && <button className="btn btn-danger" onClick={() => cancelBooking(b.bookingId)}>Cancel booking</button>}
            </div>
          </li>
        ))}
      </ul>

      <h2>Your rides</h2>
      {offers.data && offers.data.length === 0 && <Empty>You have not posted a ride yet. Use Offer a ride to post one.</Empty>}
      <ul className="list">
        {offers.data?.map((o) => (
          <li key={o.offerId} className="item">
            <div className="item-time">
              <strong>{fmtTime(o.departureTime)}</strong>
              <span>{fmtDate(o.rideDate)}</span>
            </div>
            <div className="item-body">
              <p className="item-title">{o.routeName}</p>
              <p className="meta">{o.availableSeats} of {o.totalSeats} seats free · {money(o.pricePerSeat)} per seat</p>
            </div>
            <div className="item-side">
              <StatusBadge status={o.status} />
              {(o.status === 'Open' || o.status === 'Full') && (
                <span className="btn-row">
                  <button className="btn btn-primary" onClick={() => completeRide(o.offerId)}>Complete ride</button>
                  <button className="btn btn-danger" onClick={() => cancelOffer(o.offerId)}>Cancel ride</button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
