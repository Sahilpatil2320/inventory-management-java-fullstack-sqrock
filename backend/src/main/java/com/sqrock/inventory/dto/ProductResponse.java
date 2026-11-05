package com.sqrock.inventory.dto;

import com.sqrock.inventory.entity.StockStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ProductResponse(Long id, String name, String sku, String description,
                              Long categoryId, String categoryName, Long supplierId, String supplierName,
                              BigDecimal purchasePrice, BigDecimal sellingPrice, int quantity, int minimumStockLevel,
                              StockStatus stockStatus, BigDecimal stockValue, boolean active,
                              LocalDateTime createdAt, LocalDateTime updatedAt) { }
