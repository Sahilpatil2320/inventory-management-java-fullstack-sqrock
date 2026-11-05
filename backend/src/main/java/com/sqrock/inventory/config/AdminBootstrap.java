package com.sqrock.inventory.config;

import com.sqrock.inventory.entity.Role;
import com.sqrock.inventory.entity.User;
import com.sqrock.inventory.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Safe first-administrator setup. No password is stored in the code or in the SQL files.
 * When the application starts and the users table is EMPTY, the first admin is created from the
 * INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD environment variables. Once any user exists
 * this class does nothing, so the variables can (and should) be removed afterwards.
 */
@Component
public class AdminBootstrap implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final String name;
    private final String email;
    private final String password;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder,
                          @Value("${app.bootstrap.admin-name}") String name,
                          @Value("${app.bootstrap.admin-email}") String email,
                          @Value("${app.bootstrap.admin-password}") String password) {
        this.users = users;
        this.encoder = encoder;
        this.name = name;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(String... args) {
        if (users.count() > 0) return;

        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.warn("No users exist yet. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD and restart to create the first administrator.");
            return;
        }
        if (password.length() < 10) {
            throw new IllegalStateException("INITIAL_ADMIN_PASSWORD must be at least 10 characters long");
        }
        User admin = new User();
        admin.setName(name);
        admin.setEmail(email.trim().toLowerCase());
        admin.setPasswordHash(encoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setActive(true);
        users.save(admin);
        log.info("Created the initial administrator account '{}'. You can now remove INITIAL_ADMIN_PASSWORD.", admin.getEmail());
    }
}
