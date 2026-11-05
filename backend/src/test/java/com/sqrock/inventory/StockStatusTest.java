package com.sqrock.inventory;

import com.sqrock.inventory.entity.StockStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Low-stock calculation: out = 0, low = 1..minimum, in stock = above minimum. */
class StockStatusTest {

    @Test
    void zeroQuantityIsOutOfStock() {
        assertEquals(StockStatus.OUT_OF_STOCK, StockStatus.of(0, 10));
    }

    @Test
    void quantityEqualToMinimumIsLowStock() {
        assertEquals(StockStatus.LOW_STOCK, StockStatus.of(10, 10));
        assertEquals(StockStatus.LOW_STOCK, StockStatus.of(1, 10));
    }

    @Test
    void quantityAboveMinimumIsInStock() {
        assertEquals(StockStatus.IN_STOCK, StockStatus.of(11, 10));
    }

    @Test
    void minimumOfZeroMeansAnyStockIsInStock() {
        assertEquals(StockStatus.IN_STOCK, StockStatus.of(1, 0));
        assertEquals(StockStatus.OUT_OF_STOCK, StockStatus.of(0, 0));
    }
}
