import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Admin from './pages/Admin';
import DriverInbox from './pages/DriverInbox';
import FindRide from './pages/FindRide';
import Login from './pages/Login';
import MyRides from './pages/MyRides';
import OfferRide from './pages/OfferRide';

function RequireAuth() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function Layout() {
  const { user, signOut } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'nav-link active' : 'nav-link');
  return (
    <>
      <header className="topbar">
        <span className="brand">Campus Carpool</span>
        <nav aria-label="Main">
          <NavLink to="/find" className={link}>Find a ride</NavLink>
          <NavLink to="/rides" className={link}>My rides</NavLink>
          <NavLink to="/offer" className={link}>Offer a ride</NavLink>
          <NavLink to="/inbox" className={link}>Driver inbox</NavLink>
          {user?.role === 'Admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
        </nav>
        <span className="who">
          {user?.fullName}
          <button className="btn btn-ghost" onClick={signOut}>Sign out</button>
        </span>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  );
}

function AdminOnly({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  return user?.role === 'Admin' ? children : <Navigate to="/find" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/find" element={<FindRide />} />
          <Route path="/rides" element={<MyRides />} />
          <Route path="/offer" element={<OfferRide />} />
          <Route path="/inbox" element={<DriverInbox />} />
          <Route path="/admin" element={<AdminOnly><Admin /></AdminOnly>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/find" replace />} />
    </Routes>
  );
}
