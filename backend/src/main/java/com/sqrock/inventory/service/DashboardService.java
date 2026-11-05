package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.*;
import com.sqrock.inventory.entity.StockTransaction;
import com.sqrock.inventory.entity.TransactionType;
import com.sqrock.inventory.repository.CategoryRepository;
import com.sqrock.inventory.repository.ProductRepository;
import com.sqrock.inventory.repository.StockTransactionRepository;
import com.sqrock.inventory.repository.SupplierRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/** Every number on the dashboard is computed from the database here. */
@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final int MOVEMENT_DAYS = 14;

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final SupplierRepository suppliers;
    private final StockTransactionRepository transactions;

    public DashboardService(ProductRepository products, CategoryRepository categories,
                            SupplierRepository suppliers, StockTransactionRepository transactions) {
        this.products = products;
        this.categories = categories;
        this.suppliers = suppliers;
        this.transactions = transactions;
    }

    public DashboardSummary summary() {
        long total = products.countByActiveTrue();
        long low = products.countLowStock();
        long out = products.countOutOfStock();

        List<CategoryCount> distribution = products.countProductsPerCategory().stream()
                .map(r -> new CategoryCount((String) r[0], ((Number) r[1]).longValue()))
                .toList();

        return new DashboardSummary(total, categories.count(), suppliers.countByActiveTrue(),
                Optional.ofNullable(products.sumQuantity()).orElse(0L),
                Optional.ofNullable(products.sumInventoryValue()).orElse(BigDecimal.ZERO),
                low, out, total - low - out, distribution, stockMovement());
    }

    public List<ProductResponse> lowStock(int limit) {
        return products.findLowAndOutOfStock(PageRequest.of(0, clamp(limit)))
                .stream().map(Mappers::toResponse).toList();
    }

    public List<StockTransactionResponse> recentTransactions(int limit) {
        return transactions.findAll(PageRequest.of(0, clamp(limit),
                        Sort.by(Sort.Direction.DESC, "transactionDate").and(Sort.by(Sort.Direction.DESC, "id"))))
                .map(Mappers::toResponse).getContent();
    }

    /** Units received and issued per day for the last 14 days (days without movement are zero). */
    private List<DailyMovement> stockMovement() {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(MOVEMENT_DAYS - 1L);
        Map<LocalDate, long[]> perDay = new TreeMap<>();
        for (LocalDate d = start; !d.isAfter(today); d = d.plusDays(1)) perDay.put(d, new long[2]);

        for (StockTransaction t : transactions.findByTransactionDateGreaterThanEqual(start.atStartOfDay())) {
            long[] bucket = perDay.get(t.getTransactionDate().toLocalDate());
            if (bucket == null) continue;
            bucket[t.getTransactionType() == TransactionType.STOCK_IN ? 0 : 1] += t.getQuantity();
        }
        return perDay.entrySet().stream()
                .map(e -> new DailyMovement(e.getKey(), e.getValue()[0], e.getValue()[1])).toList();
    }

    private int clamp(int limit) {
        return Math.min(Math.max(limit, 1), 50);
    }
}
