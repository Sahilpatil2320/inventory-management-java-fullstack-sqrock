package com.sqrock.inventory.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

/** quantity is only used when a product is created (it becomes the opening stock). */
public record ProductRequest(
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 50) @Pattern(regexp = "^[A-Za-z0-9._/-]+$", message = "SKU may contain letters, digits and . _ - / only") String sku,
        @Size(max = 1000) String description,
        @NotNull(message = "Category is required") Long categoryId,
        Long supplierId,
        @NotNull @DecimalMin(value = "0.00", message = "Purchase price cannot be negative") @Digits(integer = 10, fraction = 2) BigDecimal purchasePrice,
        @NotNull @DecimalMin(value = "0.00", message = "Selling price cannot be negative") @Digits(integer = 10, fraction = 2) BigDecimal sellingPrice,
        @Min(value = 0, message = "Quantity cannot be negative") @Max(100000000) Integer quantity,
        @NotNull @Min(value = 0, message = "Minimum stock level cannot be negative") @Max(100000000) Integer minimumStockLevel) { }
