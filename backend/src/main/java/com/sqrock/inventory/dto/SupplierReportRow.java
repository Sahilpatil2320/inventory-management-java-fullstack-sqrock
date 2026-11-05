package com.sqrock.inventory.dto;

import java.math.BigDecimal;

public record SupplierReportRow(Long supplierId, String supplierName, String companyName, String email, String phone,
                                long productCount, long unitsInStock, BigDecimal stockValue, long unitsReceived) { }
