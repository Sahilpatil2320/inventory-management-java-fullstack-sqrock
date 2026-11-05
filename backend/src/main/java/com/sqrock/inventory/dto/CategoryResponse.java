package com.sqrock.inventory.dto;

import java.time.LocalDateTime;

public record CategoryResponse(Long id, String name, String description, long productCount, LocalDateTime createdAt) { }
