package com.sqrock.inventory.dto;

import com.sqrock.inventory.entity.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record StockTransactionResponse(Long id, Long productId, String productName, String productSku, String categoryName,
                                       Long userId, String userName, Long supplierId, String supplierName,
                                       TransactionType transactionType, int quantity, BigDecimal unitPrice, String reason,
                                       int previousQuantity, int newQuantity, String notes, LocalDateTime transactionDate) { }
