package com.sqrock.inventory.repository;

import com.sqrock.inventory.entity.Product;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    long countByCategoryIdAndActiveTrue(Long categoryId);
    long countBySupplierIdAndActiveTrue(Long supplierId);

    /**
     * SELECT ... FOR UPDATE. Every stock change takes this row lock first, so two
     * simultaneous updates of the same product are processed one after the other.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    // ---- dashboard / report aggregates (archived products are excluded) ----
    long countByActiveTrue();

    @Query("select count(p) from Product p where p.active = true and p.quantity = 0")
    long countOutOfStock();

    @Query("select count(p) from Product p where p.active = true and p.quantity > 0 and p.quantity <= p.minimumStockLevel")
    long countLowStock();

    /** SUM() is NULL when there are no rows, so these return null-able wrappers; see DashboardService. */
    @Query("select sum(p.quantity) from Product p where p.active = true")
    Long sumQuantity();

    @Query("select sum(p.quantity * p.purchasePrice) from Product p where p.active = true")
    BigDecimal sumInventoryValue();

    @Query("""
           select p from Product p
           where p.active = true and p.quantity <= p.minimumStockLevel
           order by p.quantity asc, p.name asc
           """)
    List<Product> findLowAndOutOfStock(Pageable pageable);

    @Query("""
           select c.name, count(p) from Product p join p.category c
           where p.active = true group by c.name order by count(p) desc, c.name asc
           """)
    List<Object[]> countProductsPerCategory();

    @Query("select p.category.id, count(p) from Product p where p.active = true and p.category is not null group by p.category.id")
    List<Object[]> countActiveProductsGroupedByCategory();

    @Query("select p.supplier.id, count(p) from Product p where p.active = true and p.supplier is not null group by p.supplier.id")
    List<Object[]> countActiveProductsGroupedBySupplier();
}
