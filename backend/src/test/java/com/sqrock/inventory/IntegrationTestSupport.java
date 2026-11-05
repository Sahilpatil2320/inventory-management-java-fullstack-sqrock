package com.sqrock.inventory;

import com.jayway.jsonpath.JsonPath;
import com.sqrock.inventory.entity.Role;
import com.sqrock.inventory.entity.User;
import com.sqrock.inventory.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Shared helpers: full application context, in-memory H2 database, real Spring Security. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
abstract class IntegrationTestSupport {

    static final String PASSWORD = "Passw0rd!123";

    @Autowired protected MockMvc mvc;
    @Autowired protected UserRepository userRepository;
    @Autowired protected PasswordEncoder encoder;

    protected User createUser(String email, Role role) {
        return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User u = new User();
            u.setName(role.name() + " Test");
            u.setEmail(email);
            u.setPasswordHash(encoder.encode(PASSWORD));
            u.setRole(role);
            u.setActive(true);
            return userRepository.save(u);
        });
    }

    protected String loginAndGetToken(String email) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }
}
