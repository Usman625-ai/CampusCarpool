export interface User { userId: number; fullName: string; email: string; role: 'Student' | 'Admin' }
export interface AuthResponse { token: string; user: User }
export interface Area { areaId: number; areaName: string }
export interface Vehicle { vehicleId: number; plateNo: string; model: string; capacity: number }
export interface RouteStop { stopOrder: number; areaId: number; areaName: string; minutesFromStart: number }
export interface Route { routeId: number; routeName: string; stops: RouteStop[] }
export interface MyOffer {
  offerId: number; rideDate: string; departureTime: string; routeName: string;
  totalSeats: number; availableSeats: number; pricePerSeat: number; status: string;
}
export interface Match {
  offerId: number; driverName: string; vehicle: string; rideDate: string; pickupTime: string;
  availableSeats: number; pricePerSeat: number; totalFare: number; avgRating: number | null;
}
export interface Booking {
  bookingId: number; offerId: number; counterpart: string; rideDate: string; departureTime: string;
  pickup: string; dropoff: string; seats: number; status: string; expiresAt: string; rated: boolean;
}
export interface Created { id: number }
export interface DailySummary {
  rideDate: string; offersPosted: number; offersCancelled: number; offersCompleted: number;
  seatsOffered: number; seatsReserved: number; fillRatePct: number | null;
  confirmedBookings: number; pendingBookings: number;
}
export interface DriverRating {
  driverId: number; fullName: string; ridesCompleted: number; ratingsReceived: number; avgScore: number | null;
}
export interface AuditRow {
  auditId: number; bookingId: number; oldStatus: string | null; newStatus: string; changedAt: string; changedBy: string;
}
