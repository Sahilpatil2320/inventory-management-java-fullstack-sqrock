package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.*;
import com.sqrock.inventory.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User management (ADMIN only). Creating a user here is the application's "registration":
 * there is no public sign-up, so nobody can give themselves an account.
 */
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('ADMIN')")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) { this.userService = userService; }

    @GetMapping
    public List<UserResponse> list() { return userService.list(); }

    @GetMapping("/{id}")
    public UserResponse get(@PathVariable Long id) { return userService.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody UserCreateRequest request) { return userService.create(request); }

    @PutMapping("/{id}")
    public UserResponse update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request, Authentication auth) {
        return userService.update(id, request, auth.getName());
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable Long id, Authentication auth) {
        return userService.delete(id, auth.getName());
    }
}
