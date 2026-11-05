package com.sqrock.inventory.dto;

import java.math.BigDecimal;

public record ValuationRow(Long productId, String name, String sku, String categoryName, int quantity,
                           BigDecimal purchasePrice, BigDecimal sellingPrice,
                           BigDecimal costValue, BigDecimal retailValue, BigDecimal potentialProfit) { }
