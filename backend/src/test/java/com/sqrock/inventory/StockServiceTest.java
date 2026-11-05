package com.sqrock.inventory;

import com.sqrock.inventory.dto.StockInRequest;
import com.sqrock.inventory.dto.StockOutRequest;
import com.sqrock.inventory.dto.StockTransactionResponse;
import com.sqrock.inventory.entity.*;
import com.sqrock.inventory.exception.BusinessRuleException;
import com.sqrock.inventory.exception.InsufficientStockException;
import com.sqrock.inventory.exception.ResourceNotFoundException;
import com.sqrock.inventory.repository.*;
import com.sqrock.inventory.service.StockService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Pure unit tests of the stock rules (no database, repositories are mocked). */
@ExtendWith(MockitoExtension.class)
class StockServiceTest {

    @Mock ProductRepository products;
    @Mock SupplierRepository suppliers;
    @Mock UserRepository users;
    @Mock StockTransactionRepository transactions;

    StockService service;
    Product product;

    @BeforeEach
    void setUp() {
        service = new StockService(products, suppliers, users, transactions);
        product = new Product();
        product.setName("Wireless Mouse");
        product.setSku("ELEC-001");
        product.setPurchasePrice(new BigDecimal("450.00"));
        product.setSellingPrice(new BigDecimal("699.00"));
        product.setQuantity(10);
        product.setMinimumStockLevel(5);
        lenient().when(products.findByIdForUpdate(1L)).thenReturn(Optional.of(product));
        lenient().when(users.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
        lenient().when(transactions.save(any(StockTransaction.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void stockInIncreasesQuantityAndRecordsLedgerRow() {
        StockTransactionResponse res = service.stockIn(new StockInRequest(1L, 15, null, null, "delivery", null), "staff@test.local");

        assertEquals(25, product.getQuantity());
        assertEquals(10, res.previousQuantity());
        assertEquals(25, res.newQuantity());
        assertEquals(TransactionType.STOCK_IN, res.transactionType());
        ArgumentCaptor<StockTransaction> saved = ArgumentCaptor.forClass(StockTransaction.class);
        verify(transactions).save(saved.capture());
        assertEquals(15, saved.getValue().getQuantity());
    }

    @Test
    void stockOutDecreasesQuantity() {
        StockTransactionResponse res = service.stockOut(new StockOutRequest(1L, 4, "SALE", null, null), "staff@test.local");

        assertEquals(6, product.getQuantity());
        assertEquals(TransactionType.STOCK_OUT, res.transactionType());
        assertEquals("SALE", res.reason());
    }

    @Test
    void stockOutOfExactlyAvailableQuantityReachesZero() {
        service.stockOut(new StockOutRequest(1L, 10, "SALE", null, null), "staff@test.local");
        assertEquals(0, product.getQuantity());
    }

    @Test
    void stockOutBeyondAvailableQuantityIsRejectedAndNothingChanges() {
        assertThrows(InsufficientStockException.class,
                () -> service.stockOut(new StockOutRequest(1L, 11, "SALE", null, null), "staff@test.local"));

        assertEquals(10, product.getQuantity(), "quantity must stay untouched");
        verify(transactions, never()).save(any());
    }

    @Test
    void unknownProductIsRejected() {
        assertThrows(ResourceNotFoundException.class,
                () -> service.stockIn(new StockInRequest(99L, 1, null, null, null, null), "staff@test.local"));
    }

    @Test
    void archivedProductCannotBeStocked() {
        product.setActive(false);
        assertThrows(BusinessRuleException.class,
                () -> service.stockIn(new StockInRequest(1L, 1, null, null, null, null), "staff@test.local"));
    }

    @Test
    void repeatedRequestIdReturnsTheOriginalTransactionWithoutChangingStockAgain() {
        StockTransaction original = new StockTransaction();
        original.setProduct(product);
        original.setTransactionType(TransactionType.STOCK_OUT);
        original.setQuantity(3);
        original.setPreviousQuantity(13);
        original.setNewQuantity(10);
        when(transactions.findByRequestId("req-1")).thenReturn(Optional.of(original));

        StockTransactionResponse res = service.stockOut(new StockOutRequest(1L, 3, "SALE", null, "req-1"), "staff@test.local");

        assertEquals(10, product.getQuantity(), "a replayed request must not decrease stock again");
        assertEquals(3, res.quantity());
        verify(transactions, never()).save(any());
    }
}
