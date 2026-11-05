package com.sqrock.inventory.exception;

public class InsufficientStockException extends BusinessRuleException {
    public InsufficientStockException(String productName, int available, int requested) {
        super("Insufficient stock for \"" + productName + "\": " + available + " available, " + requested + " requested");
    }
}
