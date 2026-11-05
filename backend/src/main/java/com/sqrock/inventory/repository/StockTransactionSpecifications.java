package com.sqrock.inventory.repository;

import com.sqrock.inventory.entity.Product;
import com.sqrock.inventory.entity.StockTransaction;
import com.sqrock.inventory.entity.TransactionType;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Dynamic filters for the transaction history and the stock reports. */
public final class StockTransactionSpecifications {

    private StockTransactionSpecifications() { }

    public static Specification<StockTransaction> filter(Long productId, Long categoryId, Long supplierId,
                                                         TransactionType type, LocalDate from, LocalDate to,
                                                         String search) {
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            Join<StockTransaction, Product> product = root.join("product");

            if (productId != null) where.add(cb.equal(product.get("id"), productId));
            if (categoryId != null) where.add(cb.equal(product.get("category").get("id"), categoryId));
            if (supplierId != null) where.add(cb.equal(root.get("supplier").get("id"), supplierId));
            if (type != null) where.add(cb.equal(root.get("transactionType"), type));
            if (from != null) where.add(cb.greaterThanOrEqualTo(root.get("transactionDate"), from.atStartOfDay()));
            if (to != null) where.add(cb.lessThan(root.get("transactionDate"), to.plusDays(1).atStartOfDay()));
            if (search != null && !search.isBlank()) {
                String like = "%" + ProductSpecifications.escapeLike(search.trim().toLowerCase()) + "%";
                where.add(cb.or(
                        cb.like(cb.lower(product.get("name")), like, '\\'),
                        cb.like(cb.lower(product.get("sku")), like, '\\')));
            }
            return cb.and(where.toArray(new Predicate[0]));
        };
    }
}
