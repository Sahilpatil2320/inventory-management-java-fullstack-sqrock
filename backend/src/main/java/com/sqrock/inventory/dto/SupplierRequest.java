package com.sqrock.inventory.dto;

import jakarta.validation.constraints.*;

public record SupplierRequest(
        @NotBlank @Size(max = 100) String supplierName,
        @NotBlank @Size(max = 150) String companyName,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Pattern(regexp = "^\\+?[0-9][0-9 ()-]{5,22}[0-9]$", message = "Enter a valid phone number, e.g. +91 98765 43210") String phone,
        @Size(max = 300) String address) { }
