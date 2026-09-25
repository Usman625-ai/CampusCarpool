import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { useLoad, useNotice } from '../hooks';
import type { Area, Created, Route, Vehicle } from '../types';
import { Empty, Notice, RouteLine, isoDate } from '../ui';

interface StopDraft { areaId: string; minutes: string }

export default function OfferRide() {
  const areas = useLoad(() => api.get<Area[]>('/areas'));
  const vehicles = useLoad(() => api.get<Vehicle[]>('/me/vehicles'));
  const routes = useLoad(() => api.get<Route[]>('/me/routes'));
  const { notice, ok, err, clear } = useNotice();

  const [vehicle, setVehicle] = useState({ plateNo: '', model: '', capacity: 4 });
  const [routeName, setRouteName] = useState('');
  const [stops, setStops] = useState<StopDraft[]>([{ areaId: '', minutes: '0' }, { areaId: '', minutes: '15' }]);
  const [offer, setOffer] = useState({ vehicleId: '', routeId: '', rideDate: isoDate(1), departureTime: '07:30', totalSeats: 3, pricePerSeat: 150 });

  const selectedVehicle = vehicles.data?.find((v) => String(v.vehicleId) === offer.vehicleId);

  async function submit(action: () => Promise<unknown>, done: string, after: () => void) {
    clear();
    try {
      await action();
      ok(done);
      after();
    } catch (ex) {
      err(ex);
    }
  }

  const addVehicle = (e: FormEvent) => {
    e.preventDefault();
    return submit(() => api.post('/me/vehicles', vehicle), 'Vehicle added.', () => {
      setVehicle({ plateNo: '', model: '', capacity: 4 });
      vehicles.reload();
    });
  };

  const addRoute = (e: FormEvent) => {
    e.preventDefault();
    const body = { routeName, stops: stops.map((s) => ({ areaId: Number(s.areaId), minutesFromStart: Number(s.minutes) })) };
    return submit(() => api.post('/me/routes', body), 'Route saved.', () => {
      setRouteName('');
      setStops([{ areaId: '', minutes: '0' }, { areaId: '', minutes: '15' }]);
      routes.reload();
    });
  };

  const postOffer = (e: FormEvent) => {
    e.preventDefault();
    const body = { ...offer, vehicleId: Number(offer.vehicleId), routeId: Number(offer.routeId) };
    return submit(() => api.post<Created>('/offers', body), 'Ride posted. Passengers can now find it.', () => undefined);
  };

  const updateStop = (i: number, patch: Partial<StopDraft>) => setStops(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  return (
    <>
      <h1>Offer a ride</h1>
      <Notice notice={notice} />

      <div className="grid-2">
        <section className="panel">
          <h2>1. Your vehicles</h2>
          {vehicles.data?.length === 0 && <Empty>Add the car you drive to campus.</Empty>}
          <ul className="plain">
            {vehicles.data?.map((v) => <li key={v.vehicleId}>{v.model} · {v.plateNo} · {v.capacity} passenger seats</li>)}
          </ul>
          <form className="stack" onSubmit={addVehicle}>
            <label>Number plate<input required maxLength={15} value={vehicle.plateNo} onChange={(e) => setVehicle({ ...vehicle, plateNo: e.target.value })} /></label>
            <label>Make and model<input required maxLength={60} value={vehicle.model} onChange={(e) => setVehicle({ ...vehicle, model: e.target.value })} /></label>
            <label>Passenger seats (not counting you)
              <input type="number" required min={1} max={8} value={vehicle.capacity} onChange={(e) => setVehicle({ ...vehicle, capacity: Number(e.target.value) })} />
            </label>
            <button className="btn btn-ghost">Add vehicle</button>
          </form>
        </section>

        <section className="panel">
          <h2>2. Your routes</h2>
          {routes.data?.length === 0 && <Empty>A route lists the areas you pass, in order, with minutes from the start.</Empty>}
          {routes.data?.map((r) => (
            <div key={r.routeId} className="route-block">
              <p className="item-title">{r.routeName}</p>
              <RouteLine stops={r.stops} />
            </div>
          ))}
          <form className="stack" onSubmit={addRoute}>
            <label>Route name<input required maxLength={100} value={routeName} onChange={(e) => setRouteName(e.target.value)} /></label>
            {stops.map((s, i) => (
              <div key={i} className="stop-row">
                <select aria-label={`Stop ${i + 1} area`} required value={s.areaId} onChange={(e) => updateStop(i, { areaId: e.target.value })}>
                  <option value="">Stop {i + 1}</option>
                  {areas.data?.map((a) => <option key={a.areaId} value={a.areaId}>{a.areaName}</option>)}
                </select>
                <input aria-label={`Stop ${i + 1} minutes from start`} type="number" min={0} required disabled={i === 0} value={s.minutes} onChange={(e) => updateStop(i, { minutes: e.target.value })} />
                <span className="unit">min</span>
                <button type="button" className="btn btn-ghost" disabled={stops.length <= 2} onClick={() => setStops(stops.filter((_, idx) => idx !== i))} aria-label={`Remove stop ${i + 1}`}>Remove</button>
              </div>
            ))}
            <div className="btn-row">
              <button type="button" className="btn btn-ghost" disabled={stops.length >= 20} onClick={() => setStops([...stops, { areaId: '', minutes: String(Number(stops[stops.length - 1].minutes) + 10) }])}>Add stop</button>
              <button className="btn btn-ghost">Save route</button>
            </div>
          </form>
        </section>
      </div>

      <section className="panel">
        <h2>3. Post a ride</h2>
        <form className="form-grid" onSubmit={postOffer}>
          <label>Vehicle
            <select required value={offer.vehicleId} onChange={(e) => setOffer({ ...offer, vehicleId: e.target.value, totalSeats: Math.min(offer.totalSeats, vehicles.data?.find((v) => String(v.vehicleId) === e.target.value)?.capacity ?? offer.totalSeats) })}>
              <option value="">Choose a vehicle</option>
              {vehicles.data?.map((v) => <option key={v.vehicleId} value={v.vehicleId}>{v.model} ({v.plateNo})</option>)}
            </select>
          </label>
          <label>Route
            <select required value={offer.routeId} onChange={(e) => setOffer({ ...offer, routeId: e.target.value })}>
              <option value="">Choose a route</option>
              {routes.data?.map((r) => <option key={r.routeId} value={r.routeId}>{r.routeName}</option>)}
            </select>
          </label>
          <label>Date<input type="date" required min={isoDate(0)} value={offer.rideDate} onChange={(e) => setOffer({ ...offer, rideDate: e.target.value })} /></label>
          <label>Departure time<input type="time" required value={offer.departureTime} onChange={(e) => setOffer({ ...offer, departureTime: e.target.value })} /></label>
          <label>Seats to offer
            <input type="number" required min={1} max={selectedVehicle?.capacity ?? 8} value={offer.totalSeats} onChange={(e) => setOffer({ ...offer, totalSeats: Number(e.target.value) })} />
          </label>
          <label>Price per seat (Rs)
            <input type="number" required min={0} step={10} value={offer.pricePerSeat} onChange={(e) => setOffer({ ...offer, pricePerSeat: Number(e.target.value) })} />
          </label>
          <div className="form-actions">
            <button className="btn btn-primary">Post ride</button>
          </div>
        </form>
      </section>
    </>
  );
}
