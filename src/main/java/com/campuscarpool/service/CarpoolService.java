package com.campuscarpool.service;

import com.campuscarpool.dto.Dtos.*;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameterValue;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thin service over the database. Business rules (matching, seat locking, expiry, rating eligibility)
 * live in SQL Server stored procedures, functions and triggers; this class only authorises the caller,
 * invokes them and maps rows to DTOs.
 */
@Service
public class CarpoolService {

    private final JdbcTemplate jdbc;

    public CarpoolService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    // ------------------------------------------------------------------ lookups

    public List<Area> areas() {
        return jdbc.query("SELECT AreaId, AreaName FROM dbo.Areas ORDER BY AreaName",
                (rs, i) -> new Area(rs.getInt("AreaId"), rs.getString("AreaName")));
    }

    // ------------------------------------------------------------------ vehicles

    public List<Vehicle> myVehicles(long uid) {
        return jdbc.query("SELECT VehicleId, PlateNo, Model, Capacity FROM dbo.Vehicles WHERE OwnerId = ? ORDER BY VehicleId",
                (rs, i) -> new Vehicle(rs.getInt("VehicleId"), rs.getString("PlateNo"), rs.getString("Model"),
                        rs.getInt("Capacity")),
                uid);
    }

    public Vehicle addVehicle(long uid, VehicleRequest r) {
        int id = newId("INSERT dbo.Vehicles (OwnerId, PlateNo, Model, Capacity) VALUES (?, ?, ?, ?)",
                uid, r.plateNo().trim().toUpperCase(), r.model().trim(), r.capacity());
        return new Vehicle(id, r.plateNo().trim().toUpperCase(), r.model().trim(), r.capacity());
    }

    // ------------------------------------------------------------------ routes

    private record StopRow(int routeId, RouteStop stop) {
    }

    public List<Route> myRoutes(long uid) {
        Map<Integer, List<RouteStop>> stopsByRoute = jdbc.query(
                        "SELECT s.RouteId, s.StopOrder, s.AreaId, a.AreaName, s.MinutesFromStart "
                                + "FROM dbo.RouteStops s JOIN dbo.Routes r ON r.RouteId = s.RouteId "
                                + "JOIN dbo.Areas a ON a.AreaId = s.AreaId "
                                + "WHERE r.DriverId = ? ORDER BY s.RouteId, s.StopOrder",
                        (rs, i) -> new StopRow(rs.getInt("RouteId"),
                                new RouteStop(rs.getInt("StopOrder"), rs.getInt("AreaId"), rs.getString("AreaName"),
                                        rs.getInt("MinutesFromStart"))),
                        uid)
                .stream()
                .collect(Collectors.groupingBy(StopRow::routeId, LinkedHashMap::new,
                        Collectors.mapping(StopRow::stop, Collectors.toList())));

        return jdbc.query("SELECT RouteId, RouteName FROM dbo.Routes WHERE DriverId = ? ORDER BY RouteId",
                (rs, i) -> new Route(rs.getInt("RouteId"), rs.getString("RouteName"),
                        stopsByRoute.getOrDefault(rs.getInt("RouteId"), List.of())),
                uid);
    }

    @Transactional
    public Route createRoute(long uid, RouteRequest r) {
        List<StopRequest> stops = r.stops();
        if (stops.get(0).minutesFromStart() != 0) {
            throw bad("The first stop must be at 0 minutes.");
        }
        Set<Integer> seen = new HashSet<>();
        int previous = -1;
        for (StopRequest s : stops) {
            if (!seen.add(s.areaId())) {
                throw bad("A route cannot visit the same area twice.");
            }
            if (s.minutesFromStart() <= previous) {
                throw bad("Each stop must come later than the one before it.");
            }
            previous = s.minutesFromStart();
        }

        int routeId = newId("INSERT dbo.Routes (DriverId, RouteName) VALUES (?, ?)", uid, r.routeName().trim());
        for (int i = 0; i < stops.size(); i++) {
            jdbc.update("INSERT dbo.RouteStops (RouteId, StopOrder, AreaId, MinutesFromStart) VALUES (?, ?, ?, ?)",
                    routeId, i + 1, stops.get(i).areaId(), stops.get(i).minutesFromStart());
        }
        return myRoutes(uid).stream().filter(x -> x.routeId() == routeId).findFirst().orElseThrow();
    }

    // ------------------------------------------------------------------ offers (driver side)

    public int createOffer(long uid, OfferRequest r) {
        return callForId("EXEC dbo.usp_CreateRideOffer @DriverId = ?, @VehicleId = ?, @RouteId = ?, @RideDate = ?, "
                        + "@DepartureTime = ?, @TotalSeats = ?, @PricePerSeat = ?, @OfferId = @id OUTPUT;",
                uid, r.vehicleId(), r.routeId(), r.rideDate(), r.departureTime(), r.totalSeats(), r.pricePerSeat());
    }

    public List<OpenOffer> openOffers() {
        return jdbc.query("SELECT OfferId, RideDate, DepartureTime, DriverName, Vehicle, RouteName, Origin, Destination, "
                        + "AvailableSeats, TotalSeats, PricePerSeat FROM dbo.vw_OpenOffers ORDER BY RideDate, DepartureTime",
                (rs, i) -> new OpenOffer(rs.getInt("OfferId"), date(rs, "RideDate"), time(rs, "DepartureTime"),
                        rs.getString("DriverName"), rs.getString("Vehicle"), rs.getString("RouteName"),
                        rs.getString("Origin"), rs.getString("Destination"), rs.getInt("AvailableSeats"),
                        rs.getInt("TotalSeats"), rs.getBigDecimal("PricePerSeat")));
    }

    public List<MyOffer> myOffers(long uid) {
        return jdbc.query("SELECT o.OfferId, o.RideDate, o.DepartureTime, r.RouteName, o.TotalSeats, o.AvailableSeats, "
                        + "o.PricePerSeat, o.Status FROM dbo.RideOffers o JOIN dbo.Routes r ON r.RouteId = o.RouteId "
                        + "WHERE o.DriverId = ? ORDER BY o.RideDate DESC, o.DepartureTime DESC",
                (rs, i) -> new MyOffer(rs.getInt("OfferId"), date(rs, "RideDate"), time(rs, "DepartureTime"),
                        rs.getString("RouteName"), rs.getInt("TotalSeats"), rs.getInt("AvailableSeats"),
                        rs.getBigDecimal("PricePerSeat"), rs.getString("Status")),
                uid);
    }

    public void cancelOffer(long uid, int offerId) {
        jdbc.update("EXEC dbo.usp_CancelOffer @OfferId = ?, @DriverId = ?", offerId, uid);
    }

    public void completeRide(long uid, int offerId) {
        jdbc.update("EXEC dbo.usp_CompleteRide @OfferId = ?, @DriverId = ?", offerId, uid);
    }

    // ------------------------------------------------------------------ requests and matching (passenger side)

    public int postRequest(long uid, RideRequestForm r) {
        return callForId("EXEC dbo.usp_PostRideRequest @SeekerId = ?, @PickupAreaId = ?, @DropoffAreaId = ?, "
                        + "@RideDate = ?, @WindowStart = ?, @WindowEnd = ?, @SeatsNeeded = ?, @RequestId = @id OUTPUT;",
                uid, r.pickupAreaId(), r.dropoffAreaId(), r.rideDate(), r.windowStart(), r.windowEnd(), r.seatsNeeded());
    }

    public List<Match> matches(long uid, int requestId) {
        requireOwnRequest(uid, requestId);
        return jdbc.query("EXEC dbo.usp_FindMatches @RequestId = ?",
                (rs, i) -> new Match(rs.getInt("OfferId"), rs.getString("DriverName"), rs.getString("Vehicle"),
                        date(rs, "RideDate"), time(rs, "PickupTime"), rs.getInt("AvailableSeats"),
                        rs.getBigDecimal("PricePerSeat"), rs.getBigDecimal("TotalFare"), rs.getBigDecimal("AvgRating")),
                requestId);
    }

    // ------------------------------------------------------------------ bookings

    public int bookSeat(long uid, BookRequest r) {
        requireOwnRequest(uid, r.requestId());   // usp_BookSeat trusts the request id, so authorise here
        return callForId("EXEC dbo.usp_BookSeat @RequestId = ?, @OfferId = ?, @BookingId = @id OUTPUT;",
                r.requestId(), r.offerId());
    }

    public List<BookingView> myBookings(long uid) {
        return bookings(false, uid);
    }

    public List<BookingView> driverBookings(long uid) {
        return bookings(true, uid);
    }

    public void respond(long uid, int bookingId, boolean accept) {
        jdbc.update("EXEC dbo.usp_RespondToBooking @BookingId = ?, @DriverId = ?, @Accept = ?", bookingId, uid, accept);
    }

    public void cancelBooking(long uid, int bookingId) {
        jdbc.update("EXEC dbo.usp_CancelBooking @BookingId = ?, @UserId = ?", bookingId, uid);
    }

    public void rate(long uid, RatingRequest r) {
        jdbc.update("EXEC dbo.usp_SubmitRating @BookingId = ?, @RaterId = ?, @Score = ?, @Comment = ?",
                r.bookingId(), uid, r.score(),
                new SqlParameterValue(Types.NVARCHAR, r.comment() == null || r.comment().isBlank() ? null : r.comment().trim()));
    }

    private List<BookingView> bookings(boolean asDriver, long uid) {
        jdbc.execute("EXEC dbo.usp_ExpirePendingBookings");   // so stale holds never show as pending
        String counterpartJoin = asDriver
                ? "JOIN dbo.Users c ON c.UserId = b.SeekerId"
                : "JOIN dbo.Users c ON c.UserId = o.DriverId";
        String scope = asDriver ? "o.DriverId = ?" : "b.SeekerId = ?";
        String sql = "SELECT b.BookingId, b.OfferId, c.FullName AS Counterpart, o.RideDate, o.DepartureTime, "
                + "pa.AreaName AS Pickup, da.AreaName AS Dropoff, b.SeatsBooked, b.Status, b.ExpiresAt, "
                + "CAST(CASE WHEN EXISTS (SELECT 1 FROM dbo.Ratings x WHERE x.BookingId = b.BookingId AND x.RaterId = ?) "
                + "THEN 1 ELSE 0 END AS BIT) AS Rated "
                + "FROM dbo.Bookings b "
                + "JOIN dbo.RideOffers o ON o.OfferId = b.OfferId "
                + counterpartJoin + " "
                + "JOIN dbo.RideRequests r ON r.RequestId = b.RequestId "
                + "JOIN dbo.Areas pa ON pa.AreaId = r.PickupAreaId "
                + "JOIN dbo.Areas da ON da.AreaId = r.DropoffAreaId "
                + "WHERE " + scope + " ORDER BY b.CreatedAt DESC";
        return jdbc.query(sql,
                (rs, i) -> new BookingView(rs.getInt("BookingId"), rs.getInt("OfferId"), rs.getString("Counterpart"),
                        date(rs, "RideDate"), time(rs, "DepartureTime"), rs.getString("Pickup"), rs.getString("Dropoff"),
                        rs.getInt("SeatsBooked"), rs.getString("Status"), rs.getObject("ExpiresAt", LocalDateTime.class),
                        rs.getBoolean("Rated")),
                uid, uid);
    }

    // ------------------------------------------------------------------ admin reports (views)

    public List<DailySummary> dailySummary() {
        return jdbc.query("SELECT RideDate, OffersPosted, OffersCancelled, OffersCompleted, SeatsOffered, SeatsReserved, "
                        + "FillRatePct, ConfirmedBookings, PendingBookings FROM dbo.vw_DailyRideSummary ORDER BY RideDate DESC",
                (rs, i) -> new DailySummary(date(rs, "RideDate"), rs.getInt("OffersPosted"), rs.getInt("OffersCancelled"),
                        rs.getInt("OffersCompleted"), rs.getInt("SeatsOffered"), rs.getInt("SeatsReserved"),
                        rs.getBigDecimal("FillRatePct"), rs.getInt("ConfirmedBookings"), rs.getInt("PendingBookings")));
    }

    public List<DriverRating> driverRatings() {
        return jdbc.query("SELECT DriverId, FullName, RidesCompleted, RatingsReceived, AvgScore "
                        + "FROM dbo.vw_DriverRatings ORDER BY AvgScore DESC, RidesCompleted DESC",
                (rs, i) -> new DriverRating(rs.getInt("DriverId"), rs.getString("FullName"), rs.getInt("RidesCompleted"),
                        rs.getInt("RatingsReceived"), rs.getBigDecimal("AvgScore")));
    }

    public List<AuditRow> audit() {
        return jdbc.query("SELECT TOP (100) AuditId, BookingId, OldStatus, NewStatus, ChangedAt, ChangedBy "
                        + "FROM dbo.BookingAudit ORDER BY AuditId DESC",
                (rs, i) -> new AuditRow(rs.getInt("AuditId"), rs.getInt("BookingId"), rs.getString("OldStatus"),
                        rs.getString("NewStatus"), rs.getObject("ChangedAt", LocalDateTime.class),
                        rs.getString("ChangedBy")));
    }

    // ------------------------------------------------------------------ helpers

    private void requireOwnRequest(long uid, int requestId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM dbo.RideRequests WHERE RequestId = ? AND SeekerId = ?",
                Integer.class, requestId, uid);
        if (n == null || n == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Ride request not found.");
        }
    }

    /** Runs an INSERT and returns the identity it generated. */
    private int newId(String insertSql, Object... args) {
        return Objects.requireNonNull(jdbc.queryForObject(
                "SET NOCOUNT ON; " + insertSql + "; SELECT CAST(SCOPE_IDENTITY() AS INT);", Integer.class, args));
    }

    /** Runs a stored procedure that has an OUTPUT parameter named @id in the given EXEC and returns its value. */
    private int callForId(String exec, Object... args) {
        return Objects.requireNonNull(jdbc.queryForObject(
                "SET NOCOUNT ON; DECLARE @id INT; " + exec + " SELECT @id;", Integer.class, args));
    }

    private static ApiException bad(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    private static LocalDate date(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, LocalDate.class);
    }

    private static LocalTime time(ResultSet rs, String col) throws SQLException {
        return rs.getObject(col, LocalTime.class);
    }
}
