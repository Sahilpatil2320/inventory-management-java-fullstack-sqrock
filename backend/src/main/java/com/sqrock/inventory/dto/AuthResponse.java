package com.sqrock.inventory.dto;

public record AuthResponse(String token, String tokenType, long expiresInSeconds, UserResponse user) { }
