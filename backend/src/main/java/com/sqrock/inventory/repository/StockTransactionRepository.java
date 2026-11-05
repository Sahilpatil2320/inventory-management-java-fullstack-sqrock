package com.sqrock.inventory.repository;

import com.sqrock.inventory.entity.StockTransaction;
import com.sqrock.inventory.entity.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface StockTransactionRepository
        extends JpaRepository<StockTransaction, Long>, JpaSpecificationExecutor<StockTransaction> {

    Optional<StockTransaction> findByRequestId(String requestId);

    boolean existsByProductId(Long productId);
    boolean existsBySupplierId(Long supplierId);
    boolean existsByUserId(Long userId);

    List<StockTransaction> findByTransactionDateGreaterThanEqual(LocalDateTime from);

    /** Total units received per supplier (for the supplier report). */
    @Query("""
           select t.supplier.id, sum(t.quantity) from StockTransaction t
           where t.transactionType = :type and t.supplier is not null group by t.supplier.id
           """)
    List<Object[]> sumQuantityBySupplier(@Param("type") TransactionType type);
}
