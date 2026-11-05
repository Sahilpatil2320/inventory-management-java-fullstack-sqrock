package com.sqrock.inventory.repository;

import com.sqrock.inventory.entity.Product;
import com.sqrock.inventory.entity.StockStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/** Builds the dynamic WHERE clause for product search and filters. */
public final class ProductSpecifications {

    private ProductSpecifications() { }

    public static Specification<Product> filter(String search, Long categoryId, Long supplierId, StockStatus status) {
        return (root, query, cb) -> {
            List<Predicate> where = new ArrayList<>();
            where.add(cb.isTrue(root.get("active")));                       // archived products are hidden

            if (search != null && !search.isBlank()) {
                String like = "%" + escapeLike(search.trim().toLowerCase()) + "%";
                where.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like, '\\'),
                        cb.like(cb.lower(root.get("sku")), like, '\\')));
            }
            if (categoryId != null) where.add(cb.equal(root.get("category").get("id"), categoryId));
            if (supplierId != null) where.add(cb.equal(root.get("supplier").get("id"), supplierId));

            if (status != null) {
                switch (status) {
                    case OUT_OF_STOCK -> where.add(cb.equal(root.get("quantity"), 0));
                    case LOW_STOCK -> where.add(cb.and(
                            cb.greaterThan(root.<Integer>get("quantity"), 0),
                            cb.lessThanOrEqualTo(root.<Integer>get("quantity"), root.<Integer>get("minimumStockLevel"))));
                    case IN_STOCK -> where.add(
                            cb.greaterThan(root.<Integer>get("quantity"), root.<Integer>get("minimumStockLevel")));
                }
            }
            return cb.and(where.toArray(new Predicate[0]));
        };
    }

    /** Makes %, _ and \ in user input match literally. */
    static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
