import { api } from '../api';
import { useLoad } from '../hooks';
import type { AuditRow, DailySummary, DriverRating } from '../types';
import { Empty, Notice, StatusBadge, fmtDate, fmtDateTime } from '../ui';

export default function Admin() {
  const summary = useLoad(() => api.get<DailySummary[]>('/admin/daily-summary'));
  const ratings = useLoad(() => api.get<DriverRating[]>('/admin/driver-ratings'));
  const audit = useLoad(() => api.get<AuditRow[]>('/admin/audit'));
  const failure = summary.error ?? ratings.error ?? audit.error;

  return (
    <>
      <h1>Admin reports</h1>
      {failure && <Notice notice={{ kind: 'err', text: failure }} />}

      <h2>Daily ride summary</h2>
      {summary.data?.length === 0 && <Empty>No rides have been posted yet.</Empty>}
      {summary.data && summary.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Date</th><th>Posted</th><th>Completed</th><th>Cancelled</th><th>Seats offered</th><th>Seats reserved</th><th>Fill rate</th><th>Confirmed</th><th>Pending</th></tr>
            </thead>
            <tbody>
              {summary.data.map((r) => (
                <tr key={r.rideDate}>
                  <td>{fmtDate(r.rideDate)}</td><td>{r.offersPosted}</td><td>{r.offersCompleted}</td><td>{r.offersCancelled}</td>
                  <td>{r.seatsOffered}</td><td>{r.seatsReserved}</td><td>{r.fillRatePct ?? 0}%</td><td>{r.confirmedBookings}</td><td>{r.pendingBookings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Driver ratings</h2>
      {ratings.data?.length === 0 && <Empty>No drivers yet.</Empty>}
      {ratings.data && ratings.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Driver</th><th>Rides completed</th><th>Ratings received</th><th>Average score</th></tr></thead>
            <tbody>
              {ratings.data.map((r) => (
                <tr key={r.driverId}><td>{r.fullName}</td><td>{r.ridesCompleted}</td><td>{r.ratingsReceived}</td><td>{r.avgScore ?? 'No ratings'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Booking status history</h2>
      {audit.data?.length === 0 && <Empty>No booking changes recorded yet.</Empty>}
      {audit.data && audit.data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Booking</th><th>From</th><th>To</th><th>Changed by</th></tr></thead>
            <tbody>
              {audit.data.map((a) => (
                <tr key={a.auditId}>
                  <td>{fmtDateTime(a.changedAt)}</td><td>#{a.bookingId}</td>
                  <td>{a.oldStatus ? <StatusBadge status={a.oldStatus} /> : 'New'}</td>
                  <td><StatusBadge status={a.newStatus} /></td><td>{a.changedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
