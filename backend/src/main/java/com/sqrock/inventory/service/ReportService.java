package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.*;
import com.sqrock.inventory.entity.*;
import com.sqrock.inventory.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Report data comes straight from the database. The frontend turns these lists into tables, CSV
 * files and printable pages. Low-stock and out-of-stock reports use the inventory report with a
 * stockStatus filter.
 */
@Service
@Transactional(readOnly = true)
public class ReportService {

    private static final int MAX_ROWS = 10_000;

    private final ProductRepository products;
    private final SupplierRepository suppliers;
    private final StockTransactionRepository transactions;

    public ReportService(ProductRepository products, SupplierRepository suppliers,
                         StockTransactionRepository transactions) {
        this.products = products;
        this.suppliers = suppliers;
        this.transactions = transactions;
    }

    public List<ProductResponse> inventory(String search, Long categoryId, Long supplierId, StockStatus status) {
        return products.findAll(ProductSpecifications.filter(search, categoryId, supplierId, status),
                        PageRequest.of(0, MAX_ROWS, Sort.by("name")))
                .map(Mappers::toResponse).getContent();
    }

    public List<StockTransactionResponse> stockMovements(Long productId, Long categoryId, TransactionType type,
                                                         LocalDate from, LocalDate to, String search) {
        return transactions.findAll(StockTransactionSpecifications.filter(productId, categoryId, null, type, from, to, search),
                        PageRequest.of(0, MAX_ROWS, Sort.by(Sort.Direction.DESC, "transactionDate").and(Sort.by(Sort.Direction.DESC, "id"))))
                .map(Mappers::toResponse).getContent();
    }

    public ValuationReport valuation(Long categoryId, String search) {
        List<Product> all = products.findAll(ProductSpecifications.filter(search, categoryId, null, null),
                PageRequest.of(0, MAX_ROWS, Sort.by("name"))).getContent();

        List<ValuationRow> rows = new ArrayList<>();
        long units = 0;
        BigDecimal cost = BigDecimal.ZERO, retail = BigDecimal.ZERO;
        for (Product p : all) {
            BigDecimal qty = BigDecimal.valueOf(p.getQuantity());
            BigDecimal costValue = p.getPurchasePrice().multiply(qty);
            BigDecimal retailValue = p.getSellingPrice().multiply(qty);
            rows.add(new ValuationRow(p.getId(), p.getName(), p.getSku(),
                    p.getCategory() == null ? null : p.getCategory().getName(), p.getQuantity(),
                    p.getPurchasePrice(), p.getSellingPrice(), costValue, retailValue, retailValue.subtract(costValue)));
            units += p.getQuantity();
            cost = cost.add(costValue);
            retail = retail.add(retailValue);
        }
        return new ValuationReport(rows, units, cost, retail, retail.subtract(cost));
    }

    public List<SupplierReportRow> suppliers() {
        Map<Long, Long> received = new HashMap<>();
        for (Object[] r : transactions.sumQuantityBySupplier(TransactionType.STOCK_IN)) {
            received.put((Long) r[0], ((Number) r[1]).longValue());
        }
        Map<Long, long[]> units = new HashMap<>();          // [productCount, unitsInStock]
        Map<Long, BigDecimal> value = new HashMap<>();
        for (Product p : products.findAll(ProductSpecifications.filter(null, null, null, null))) {
            if (p.getSupplier() == null) continue;
            long[] u = units.computeIfAbsent(p.getSupplier().getId(), k -> new long[2]);
            u[0]++;
            u[1] += p.getQuantity();
            value.merge(p.getSupplier().getId(), p.getPurchasePrice().multiply(BigDecimal.valueOf(p.getQuantity())), BigDecimal::add);
        }
        return suppliers.findByActiveTrueOrderBySupplierNameAsc().stream().map(s -> {
            long[] u = units.getOrDefault(s.getId(), new long[2]);
            return new SupplierReportRow(s.getId(), s.getSupplierName(), s.getCompanyName(), s.getEmail(), s.getPhone(),
                    u[0], u[1], value.getOrDefault(s.getId(), BigDecimal.ZERO), received.getOrDefault(s.getId(), 0L));
        }).toList();
    }
}
