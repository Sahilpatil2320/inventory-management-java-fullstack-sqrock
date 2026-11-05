package com.sqrock.inventory.dto;

import com.sqrock.inventory.entity.Role;
import jakarta.validation.constraints.*;

/** password is optional: leave it null or blank to keep the current password. */
public record UserUpdateRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull Role role,
        @NotNull Boolean active,
        @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters") String password) { }
