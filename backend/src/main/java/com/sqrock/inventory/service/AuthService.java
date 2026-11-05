package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.*;
import com.sqrock.inventory.entity.User;
import com.sqrock.inventory.exception.BadRequestException;
import com.sqrock.inventory.exception.ResourceNotFoundException;
import com.sqrock.inventory.repository.UserRepository;
import com.sqrock.inventory.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, UserRepository users,
                       PasswordEncoder encoder, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase();
        // Throws BadCredentialsException / DisabledException, which the global handler turns into 401.
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, req.password()));
        User user = findByEmail(email);
        return new AuthResponse(jwtService.generateToken(user.getEmail(), user.getRole()), "Bearer",
                jwtService.expiresInSeconds(), Mappers.toResponse(user));
    }

    public UserResponse me(String email) {
        return Mappers.toResponse(findByEmail(email));
    }

    @Transactional
    public MessageResponse changePassword(String email, ChangePasswordRequest req) {
        User user = findByEmail(email);
        if (!encoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPasswordHash(encoder.encode(req.newPassword()));
        users.save(user);
        return new MessageResponse("Password updated");
    }

    private User findByEmail(String email) {
        return users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", 0L));
    }
}
