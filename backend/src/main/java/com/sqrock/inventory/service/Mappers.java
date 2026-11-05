package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.ProductResponse;
import com.sqrock.inventory.dto.StockTransactionResponse;
import com.sqrock.inventory.dto.UserResponse;
import com.sqrock.inventory.entity.*;

import java.math.BigDecimal;

/** Entity -> DTO conversion. Call inside a transaction (lazy associations are read here). */
public final class Mappers {

    private Mappers() { }

    public static ProductResponse toResponse(Product p) {
        Category c = p.getCategory();
        Supplier s = p.getSupplier();
        BigDecimal stockValue = p.getPurchasePrice().multiply(BigDecimal.valueOf(p.getQuantity()));
        return new ProductResponse(p.getId(), p.getName(), p.getSku(), p.getDescription(),
                c == null ? null : c.getId(), c == null ? null : c.getName(),
                s == null ? null : s.getId(), s == null ? null : s.getSupplierName(),
                p.getPurchasePrice(), p.getSellingPrice(), p.getQuantity(), p.getMinimumStockLevel(),
                p.getStockStatus(), stockValue, p.isActive(), p.getCreatedAt(), p.getUpdatedAt());
    }

    public static StockTransactionResponse toResponse(StockTransaction t) {
        Product p = t.getProduct();
        User u = t.getUser();
        Supplier s = t.getSupplier();
        return new StockTransactionResponse(t.getId(), p.getId(), p.getName(), p.getSku(),
                p.getCategory() == null ? null : p.getCategory().getName(),
                u == null ? null : u.getId(), u == null ? null : u.getName(),
                s == null ? null : s.getId(), s == null ? null : s.getSupplierName(),
                t.getTransactionType(), t.getQuantity(), t.getUnitPrice(), t.getReason(),
                t.getPreviousQuantity(), t.getNewQuantity(), t.getNotes(), t.getTransactionDate());
    }

    public static UserResponse toResponse(User u) {
        return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive(), u.getCreatedAt());
    }
}
