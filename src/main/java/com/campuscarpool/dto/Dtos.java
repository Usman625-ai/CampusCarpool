package com.campuscarpool.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Request and response shapes for the REST API. */
public final class Dtos {
    private Dtos() {
    }

    // ---- auth
    public record RegisterRequest(
            @NotBlank @Size(max = 20) String enrollmentNo,
            @NotBlank @Size(max = 100) String fullName,
            @NotBlank @Email @Size(max = 150) String email,
            @Size(max = 20) String phone,
            @NotBlank @Size(min = 8, max = 72) String password) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record UserView(long userId, String fullName, String email, String role) {
    }

    public record AuthResponse(String token, UserView user) {
    }

    // ---- lookups, vehicles, routes
    public record Area(int areaId, String areaName) {
    }

    public record VehicleRequest(
            @NotBlank @Size(max = 15) String plateNo,
            @NotBlank @Size(max = 60) String model,
            @NotNull @Min(1) @Max(8) Integer capacity) {
    }

    public record Vehicle(int vehicleId, String plateNo, String model, int capacity) {
    }

    public record StopRequest(@NotNull Integer areaId, @NotNull @Min(0) Integer minutesFromStart) {
    }

    public record RouteRequest(
            @NotBlank @Size(max = 100) String routeName,
            @NotNull @Size(min = 2, max = 20) List<@Valid StopRequest> stops) {
    }

    public record RouteStop(int stopOrder, int areaId, String areaName, int minutesFromStart) {
    }

    public record Route(int routeId, String routeName, List<RouteStop> stops) {
    }

    // ---- offers
    public record OfferRequest(
            @NotNull Integer vehicleId,
            @NotNull Integer routeId,
            @NotNull LocalDate rideDate,
            @NotNull LocalTime departureTime,
            @NotNull @Min(1) @Max(8) Integer totalSeats,
            @NotNull @DecimalMin("0.00") BigDecimal pricePerSeat) {
    }

    public record OpenOffer(int offerId, LocalDate rideDate, LocalTime departureTime, String driverName,
                            String vehicle, String routeName, String origin, String destination,
                            int availableSeats, int totalSeats, BigDecimal pricePerSeat) {
    }

    public record MyOffer(int offerId, LocalDate rideDate, LocalTime departureTime, String routeName,
                          int totalSeats, int availableSeats, BigDecimal pricePerSeat, String status) {
    }

    // ---- requests and matching
    public record RideRequestForm(
            @NotNull Integer pickupAreaId,
            @NotNull Integer dropoffAreaId,
            @NotNull LocalDate rideDate,
            @NotNull LocalTime windowStart,
            @NotNull LocalTime windowEnd,
            @NotNull @Min(1) @Max(4) Integer seatsNeeded) {
    }

    public record Match(int offerId, String driverName, String vehicle, LocalDate rideDate, LocalTime pickupTime,
                        int availableSeats, BigDecimal pricePerSeat, BigDecimal totalFare, BigDecimal avgRating) {
    }

    // ---- bookings and ratings
    public record BookRequest(@NotNull Integer requestId, @NotNull Integer offerId) {
    }

    public record RespondRequest(@NotNull Boolean accept) {
    }

    /** counterpart = the driver's name in the passenger view, the passenger's name in the driver view. */
    public record BookingView(int bookingId, int offerId, String counterpart, LocalDate rideDate,
                              LocalTime departureTime, String pickup, String dropoff, int seats,
                              String status, LocalDateTime expiresAt, boolean rated) {
    }

    public record RatingRequest(
            @NotNull Integer bookingId,
            @NotNull @Min(1) @Max(5) Integer score,
            @Size(max = 500) String comment) {
    }

    public record Created(int id) {
    }

    // ---- admin reports
    public record DailySummary(LocalDate rideDate, int offersPosted, int offersCancelled, int offersCompleted,
                               int seatsOffered, int seatsReserved, BigDecimal fillRatePct,
                               int confirmedBookings, int pendingBookings) {
    }

    public record DriverRating(int driverId, String fullName, int ridesCompleted, int ratingsReceived,
                               BigDecimal avgScore) {
    }

    public record AuditRow(int auditId, int bookingId, String oldStatus, String newStatus,
                           LocalDateTime changedAt, String changedBy) {
    }
}
