package com.campuscarpool.web;

import com.campuscarpool.dto.Dtos.AuditRow;
import com.campuscarpool.dto.Dtos.DailySummary;
import com.campuscarpool.dto.Dtos.DriverRating;
import com.campuscarpool.service.CarpoolService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin dashboard: read-only reports backed by database views. Secured by hasRole("ADMIN") in SecurityConfig. */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final CarpoolService service;

    public AdminController(CarpoolService service) {
        this.service = service;
    }

    @GetMapping("/daily-summary")
    public List<DailySummary> dailySummary() {
        return service.dailySummary();
    }

    @GetMapping("/driver-ratings")
    public List<DriverRating> driverRatings() {
        return service.driverRatings();
    }

    @GetMapping("/audit")
    public List<AuditRow> audit() {
        return service.audit();
    }
}
