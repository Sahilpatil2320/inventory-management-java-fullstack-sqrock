package com.sqrock.inventory.dto;

import com.sqrock.inventory.entity.Role;
import java.time.LocalDateTime;

public record UserResponse(Long id, String name, String email, Role role, boolean active, LocalDateTime createdAt) { }
