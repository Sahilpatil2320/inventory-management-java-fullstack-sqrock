package com.sqrock.inventory.dto;

import java.time.LocalDateTime;

public record SupplierResponse(Long id, String supplierName, String companyName, String email, String phone,
                               String address, long productCount, LocalDateTime createdAt) { }
