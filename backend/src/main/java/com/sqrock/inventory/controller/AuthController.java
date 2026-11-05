package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.*;
import com.sqrock.inventory.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) { this.authService = authService; }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication auth) {
        return authService.me(auth.getName());
    }

    @PostMapping("/change-password")
    public MessageResponse changePassword(Authentication auth, @Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(auth.getName(), request);
    }
}
