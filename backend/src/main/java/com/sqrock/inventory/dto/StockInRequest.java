package com.sqrock.inventory.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record StockInRequest(
        @NotNull Long productId,
        @NotNull @Min(value = 1, message = "Quantity must be at least 1") @Max(1000000) Integer quantity,
        Long supplierId,
        @DecimalMin(value = "0.00", message = "Purchase price cannot be negative") @Digits(integer = 10, fraction = 2) BigDecimal purchasePrice,
        @Size(max = 500) String notes,
        @Size(max = 64) String requestId) { }
