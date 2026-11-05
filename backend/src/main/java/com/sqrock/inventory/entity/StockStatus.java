package com.sqrock.inventory.entity;

/** Stock health of a product, derived from quantity and minimum stock level. */
public enum StockStatus {
    IN_STOCK, LOW_STOCK, OUT_OF_STOCK;

    public static StockStatus of(int quantity, int minimumStockLevel) {
        if (quantity <= 0) return OUT_OF_STOCK;
        if (quantity <= minimumStockLevel) return LOW_STOCK;
        return IN_STOCK;
    }
}
