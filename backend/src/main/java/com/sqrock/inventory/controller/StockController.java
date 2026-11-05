package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.PageResponse;
import com.sqrock.inventory.dto.StockInRequest;
import com.sqrock.inventory.dto.StockOutRequest;
import com.sqrock.inventory.dto.StockTransactionResponse;
import com.sqrock.inventory.entity.TransactionType;
import com.sqrock.inventory.service.StockService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/stock")
public class StockController {

    private final StockService stockService;

    public StockController(StockService stockService) { this.stockService = stockService; }

    @PostMapping("/in")
    @ResponseStatus(HttpStatus.CREATED)
    public StockTransactionResponse stockIn(@Valid @RequestBody StockInRequest request, Authentication auth) {
        return stockService.stockIn(request, auth.getName());
    }

    @PostMapping("/out")
    @ResponseStatus(HttpStatus.CREATED)
    public StockTransactionResponse stockOut(@Valid @RequestBody StockOutRequest request, Authentication auth) {
        return stockService.stockOut(request, auth.getName());
    }

    @GetMapping("/transactions")
    public PageResponse<StockTransactionResponse> transactions(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return stockService.list(productId, categoryId, supplierId, type, from, to, search, page, size);
    }

    @GetMapping("/transactions/{id}")
    public StockTransactionResponse transaction(@PathVariable Long id) { return stockService.get(id); }
}
