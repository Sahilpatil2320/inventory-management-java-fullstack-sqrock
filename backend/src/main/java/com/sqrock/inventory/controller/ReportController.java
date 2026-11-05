package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.*;
import com.sqrock.inventory.entity.StockStatus;
import com.sqrock.inventory.entity.TransactionType;
import com.sqrock.inventory.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/**
 * Inventory / low-stock / out-of-stock / product reports  -> GET /inventory (with stockStatus)
 * Stock-in / stock-out / movement reports                  -> GET /stock-movements (with type)
 * Valuation and supplier reports (ADMIN only, see SecurityConfig).
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) { this.reportService = reportService; }

    @GetMapping("/inventory")
    public List<ProductResponse> inventory(@RequestParam(required = false) String search,
                                           @RequestParam(required = false) Long categoryId,
                                           @RequestParam(required = false) Long supplierId,
                                           @RequestParam(required = false) StockStatus stockStatus) {
        return reportService.inventory(search, categoryId, supplierId, stockStatus);
    }

    @GetMapping("/stock-movements")
    public List<StockTransactionResponse> stockMovements(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String search) {
        return reportService.stockMovements(productId, categoryId, type, from, to, search);
    }

    @GetMapping("/valuation")
    public ValuationReport valuation(@RequestParam(required = false) Long categoryId,
                                     @RequestParam(required = false) String search) {
        return reportService.valuation(categoryId, search);
    }

    @GetMapping("/suppliers")
    public List<SupplierReportRow> suppliers() { return reportService.suppliers(); }
}
