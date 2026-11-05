package com.sqrock.inventory.dto;

import java.math.BigDecimal;
import java.util.List;

public record ValuationReport(List<ValuationRow> rows, long totalQuantity,
                              BigDecimal totalCostValue, BigDecimal totalRetailValue, BigDecimal totalPotentialProfit) { }
