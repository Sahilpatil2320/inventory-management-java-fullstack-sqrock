package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.DashboardSummary;
import com.sqrock.inventory.dto.ProductResponse;
import com.sqrock.inventory.dto.StockTransactionResponse;
import com.sqrock.inventory.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) { this.dashboardService = dashboardService; }

    @GetMapping("/summary")
    public DashboardSummary summary() { return dashboardService.summary(); }

    @GetMapping("/low-stock")
    public List<ProductResponse> lowStock(@RequestParam(defaultValue = "8") int limit) {
        return dashboardService.lowStock(limit);
    }

    @GetMapping("/recent-transactions")
    public List<StockTransactionResponse> recent(@RequestParam(defaultValue = "8") int limit) {
        return dashboardService.recentTransactions(limit);
    }
}
