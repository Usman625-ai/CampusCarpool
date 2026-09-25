# 🚗 Campus Carpool & Ride-Sharing Coordination System

A full-stack ride-matching platform built for university students: drivers post rides along a route, passengers request a seat between two stops, and the system matches them by route overlap, date and pickup time — with atomic seat booking, auto-expiring holds, and a full audit trail.

Built as a DBMS course project at **UBIT, University of Karachi**, then extended into a complete three-tier application (database → REST API → web UI).

---

## ✨ Features

- **Smart matching** — a passenger's pickup/drop-off request is matched against every driver's route, checking that both stops exist on the route *in the correct order*, and that the pickup time falls inside the passenger's preferred window.
- **Race-safe seat booking** — booking a seat is a single atomic, row-locked SQL operation, so two passengers competing for the last seat can never double-book it.
- **Auto-expiring holds** — a requested seat is held for a limited window; if the driver doesn't respond, it's automatically released back to the pool.
- **Driver ↔ passenger ratings** — both sides can rate each other after a completed ride.
- **Full audit trail** — every booking status change (pending → confirmed → completed, etc.) is logged automatically by a database trigger.
- **Admin dashboard** — daily ride summaries, fill rates, and driver rating leaderboards, backed by SQL views.
- **JWT authentication** — stateless auth with role-based access (`Student` / `Admin`).

## 🏗️ Architecture

```
┌─────────────────────┐      REST/JSON       ┌──────────────────────┐      JDBC       ┌────────────────────┐
│   React + TypeScript │  ───────────────────▶ │   Spring Boot 3 API   │ ──────────────▶ │  SQL Server         │
│   (Vite, React Router)│                        │   (Java 17, Spring   │                  │  (stored procs,     │
│                       │ ◀─────────────────── │   Security, JWT)      │ ◀────────────── │  triggers, views)    │
└─────────────────────┘                       └──────────────────────┘                  └────────────────────┘
```

**Design choice worth noting:** business logic (matching, seat locking, expiry, audit) lives in the **database layer** — stored procedures, functions and triggers — not in Java. The API layer stays thin: it authorizes the caller, invokes a procedure or queries a view, and maps rows to DTOs. This keeps the data invariants enforced no matter what calls the database.

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Database | Microsoft SQL Server — stored procedures, functions, triggers, views |
| Backend | Java 17, Spring Boot 3, Spring Security (JWT / OAuth2 Resource Server), Spring JDBC, springdoc-openapi |
| Frontend | React 18, TypeScript, Vite, React Router |
| Auth | Stateless JWT (HS256) |

## 📁 Project structure

```
database/
  CampusCarpool.sql      # schema, functions, triggers, procedures, views, seed data
backend/
  src/main/java/com/campuscarpool/
    config/               # security, OpenAPI, dev data seeding
    dto/                  # request/response records
    service/              # business logic wrapper over stored procedures
    web/                  # REST controllers + global exception handling
  src/main/resources/
    application.yml
frontend/
  src/
    pages/                # Login, FindRide, MyRides, OfferRide, DriverInbox, Admin
    api.ts                # typed fetch client
    auth.tsx              # auth context
    ui.tsx                # shared UI components
    styles.css
```

## 🚀 Getting started

### 1. Database
Open `database/CampusCarpool.sql` in SSMS (SQL Server 2016+) and run the whole script. It's idempotent — safe to re-run. Ends with a small seed dataset (sample users, vehicles, routes, one ride).

### 2. Backend
```bash
cd backend
export DB_URL="jdbc:sqlserver://<host>:1433;databaseName=CampusCarpool;encrypt=true;trustServerCertificate=true"
export DB_USER=<your-sql-login>
export DB_PASSWORD=<your-password>
mvn spring-boot:run
```
Runs on `http://localhost:8080`. API docs at `/swagger-ui.html`.

Set `SEED_DEMO_PASSWORDS=true` once to give every seeded sample user the password `Demo@1234`, for quick manual testing.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`, proxying `/api` to the backend — no CORS setup needed in dev.

## 📡 API overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | Account creation and sign-in |
| GET | `/api/areas` | Lookup list of campus/city areas |
| GET/POST | `/api/me/vehicles`, `/api/me/routes` | Manage a driver's vehicles and routes |
| GET/POST | `/api/offers`, `/api/me/offers` | Browse / post ride offers |
| POST | `/api/offers/{id}/cancel`, `/api/offers/{id}/complete` | Manage a posted ride |
| POST | `/api/requests` | Post a ride request |
| GET | `/api/requests/{id}/matches` | Find matching offers |
| POST | `/api/bookings` | Request a seat |
| GET | `/api/me/bookings`, `/api/me/driver-bookings` | View bookings, as passenger / driver |
| POST | `/api/bookings/{id}/respond`, `/{id}/cancel` | Confirm/decline/cancel a booking |
| POST | `/api/ratings` | Rate a completed ride |
| GET | `/api/admin/*` | Daily summary, driver ratings, audit log (Admin only) |

## 🗄️ Database design highlights

- **3NF schema**, 10 tables — `RouteStops` resolves the ordered many-to-many between routes and areas, which is what makes route-overlap matching possible.
- **`usp_BookSeat`** — the seat-decrement and availability check happen in one atomic `UPDATE ... WHERE AvailableSeats >= @seats`, under a row lock, preventing overbooking under concurrent requests.
- **Triggers** — one releases seats and writes an audit row whenever a booking is rejected/cancelled/expired; another validates that a posted vehicle belongs to the driver and fits the route.
- **Views** — `vw_OpenOffers`, `vw_DailyRideSummary`, `vw_DriverRatings` power the browsing and admin screens without duplicating query logic in the app layer.

## 👥 Team

Built by Usman and team ([Meesum Hussain](#), [Bilal ul Haq](#), [Haris Farooqui](#)) — BS Computer Science, UBIT, University of Karachi.

## 📄 License

For academic use. Add a license of your choice (MIT is a common default for student portfolio projects) before making the repo public if you want to state usage terms explicitly.
