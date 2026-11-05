package com.sqrock.inventory.dto;

import com.sqrock.inventory.entity.Role;
import jakarta.validation.constraints.*;

public record UserCreateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters") String password,
        @NotNull Role role) { }
