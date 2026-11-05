package com.sqrock.inventory.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardSummary(long totalProducts, long totalCategories, long totalSuppliers,
                               long totalStockQuantity, BigDecimal totalInventoryValue,
                               long lowStockProducts, long outOfStockProducts, long inStockProducts,
                               List<CategoryCount> categoryDistribution, List<DailyMovement> stockMovement) { }
