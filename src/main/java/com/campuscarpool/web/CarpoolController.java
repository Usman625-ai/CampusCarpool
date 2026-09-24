package com.campuscarpool.web;

import com.campuscarpool.dto.Dtos.*;
import com.campuscarpool.service.CarpoolService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class CarpoolController {

    private final CarpoolService service;

    public CarpoolController(CarpoolService service) {
        this.service = service;
    }

    private static long uid(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }

    // ---- lookups, vehicles, routes
    @GetMapping("/areas")
    public List<Area> areas() {
        return service.areas();
    }

    @GetMapping("/me/vehicles")
    public List<Vehicle> vehicles(@AuthenticationPrincipal Jwt jwt) {
        return service.myVehicles(uid(jwt));
    }

    @PostMapping("/me/vehicles")
    @ResponseStatus(HttpStatus.CREATED)
    public Vehicle addVehicle(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody VehicleRequest body) {
        return service.addVehicle(uid(jwt), body);
    }

    @GetMapping("/me/routes")
    public List<Route> routes(@AuthenticationPrincipal Jwt jwt) {
        return service.myRoutes(uid(jwt));
    }

    @PostMapping("/me/routes")
    @ResponseStatus(HttpStatus.CREATED)
    public Route createRoute(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RouteRequest body) {
        return service.createRoute(uid(jwt), body);
    }

    // ---- offers
    @GetMapping("/offers")
    public List<OpenOffer> openOffers() {
        return service.openOffers();
    }

    @GetMapping("/me/offers")
    public List<MyOffer> myOffers(@AuthenticationPrincipal Jwt jwt) {
        return service.myOffers(uid(jwt));
    }

    @PostMapping("/offers")
    @ResponseStatus(HttpStatus.CREATED)
    public Created createOffer(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody OfferRequest body) {
        return new Created(service.createOffer(uid(jwt), body));
    }

    @PostMapping("/offers/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOffer(@AuthenticationPrincipal Jwt jwt, @PathVariable int id) {
        service.cancelOffer(uid(jwt), id);
    }

    @PostMapping("/offers/{id}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void completeRide(@AuthenticationPrincipal Jwt jwt, @PathVariable int id) {
        service.completeRide(uid(jwt), id);
    }

    // ---- requests and matching
    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public Created postRequest(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RideRequestForm body) {
        return new Created(service.postRequest(uid(jwt), body));
    }

    @GetMapping("/requests/{id}/matches")
    public List<Match> matches(@AuthenticationPrincipal Jwt jwt, @PathVariable int id) {
        return service.matches(uid(jwt), id);
    }

    // ---- bookings and ratings
    @PostMapping("/bookings")
    @ResponseStatus(HttpStatus.CREATED)
    public Created book(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody BookRequest body) {
        return new Created(service.bookSeat(uid(jwt), body));
    }

    @GetMapping("/me/bookings")
    public List<BookingView> myBookings(@AuthenticationPrincipal Jwt jwt) {
        return service.myBookings(uid(jwt));
    }

    @GetMapping("/me/driver-bookings")
    public List<BookingView> driverBookings(@AuthenticationPrincipal Jwt jwt) {
        return service.driverBookings(uid(jwt));
    }

    @PostMapping("/bookings/{id}/respond")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void respond(@AuthenticationPrincipal Jwt jwt, @PathVariable int id, @Valid @RequestBody RespondRequest body) {
        service.respond(uid(jwt), id, body.accept());
    }

    @PostMapping("/bookings/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelBooking(@AuthenticationPrincipal Jwt jwt, @PathVariable int id) {
        service.cancelBooking(uid(jwt), id);
    }

    @PostMapping("/ratings")
    @ResponseStatus(HttpStatus.CREATED)
    public void rate(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody RatingRequest body) {
        service.rate(uid(jwt), body);
    }
}
