package com.campuscarpool.service;

import com.campuscarpool.dto.Dtos.AuthResponse;
import com.campuscarpool.dto.Dtos.LoginRequest;
import com.campuscarpool.dto.Dtos.RegisterRequest;
import com.campuscarpool.dto.Dtos.UserView;
import java.sql.Types;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.SqlParameterValue;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(JdbcTemplate jdbc, PasswordEncoder encoder, JwtService jwt) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    /** Duplicate email or enrollment number surfaces as a unique-key violation, mapped to 409 by ApiExceptionHandler. */
    public AuthResponse register(RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        Integer id = jdbc.queryForObject(
                "SET NOCOUNT ON; INSERT dbo.Users (EnrollmentNo, FullName, Email, Phone, PasswordHash) "
                        + "VALUES (?, ?, ?, ?, ?); SELECT CAST(SCOPE_IDENTITY() AS INT);",
                Integer.class,
                r.enrollmentNo().trim(), r.fullName().trim(), email,
                new SqlParameterValue(Types.VARCHAR, blankToNull(r.phone())),   // typed so a NULL binds cleanly on SQL Server
                encoder.encode(r.password()));
        UserView user = new UserView(Objects.requireNonNull(id), r.fullName().trim(), email, "Student");
        return new AuthResponse(jwt.issue(user.userId(), user.role()), user);
    }

    public AuthResponse login(LoginRequest r) {
        record Row(int id, String name, String email, String hash, String role) {
        }
        Row row = jdbc.query(
                        "SELECT UserId, FullName, Email, PasswordHash, Role FROM dbo.Users WHERE Email = ? AND IsActive = 1",
                        (rs, i) -> new Row(rs.getInt("UserId"), rs.getString("FullName"), rs.getString("Email"),
                                rs.getString("PasswordHash"), rs.getString("Role")),
                        r.email().trim().toLowerCase())
                .stream().findFirst().orElse(null);

        // same message for unknown email and wrong password: don't reveal which accounts exist
        if (row == null || !encoder.matches(r.password(), row.hash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect email or password.");
        }
        UserView user = new UserView(row.id(), row.name(), row.email(), row.role());
        return new AuthResponse(jwt.issue(user.userId(), user.role()), user);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
