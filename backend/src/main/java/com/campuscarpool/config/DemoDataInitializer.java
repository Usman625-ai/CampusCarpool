package com.campuscarpool.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Dev only (app.seed-demo-passwords=true): the SQL seed script stores a placeholder instead of a real
 * BCrypt hash. This swaps the placeholder for the hash of "Demo@1234" so the sample users can log in.
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo-passwords", havingValue = "true")
class DemoDataInitializer implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    DemoDataInitializer(JdbcTemplate jdbc, PasswordEncoder encoder) {
        this.jdbc = jdbc;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        jdbc.update("UPDATE dbo.Users SET PasswordHash = ? WHERE PasswordHash = 'HASH_PLACEHOLDER'",
                encoder.encode("Demo@1234"));
    }
}
