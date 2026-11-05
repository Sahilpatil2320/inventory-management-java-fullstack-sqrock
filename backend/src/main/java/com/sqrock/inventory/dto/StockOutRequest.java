package com.sqrock.inventory.dto;

import jakarta.validation.constraints.*;

public record StockOutRequest(
        @NotNull Long productId,
        @NotNull @Min(value = 1, message = "Quantity must be at least 1") @Max(1000000) Integer quantity,
        @NotBlank @Size(max = 100) String reason,
        @Size(max = 500) String notes,
        @Size(max = 64) String requestId) { }
