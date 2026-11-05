package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.PageResponse;
import com.sqrock.inventory.dto.StockInRequest;
import com.sqrock.inventory.dto.StockOutRequest;
import com.sqrock.inventory.dto.StockTransactionResponse;
import com.sqrock.inventory.entity.*;
import com.sqrock.inventory.exception.*;
import com.sqrock.inventory.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Objects;

/**
 * The heart of the system: every stock change goes through here.
 *
 * Safety measures
 *  1. One database transaction per operation (the quantity update and the ledger row commit together or not at all).
 *  2. The product row is locked with SELECT ... FOR UPDATE, so simultaneous requests for the same product
 *     are processed one at a time and each one sees the latest quantity.
 *  3. Stock-out is validated against the locked quantity on the server, so it can never go below zero
 *     (the database also has CHECK (quantity >= 0) as a last line of defence).
 *  4. An optional requestId makes a request idempotent: re-sending it (double click, retry) is ignored.
 */
@Service
@Transactional(readOnly = true)
public class StockService {

    private final ProductRepository products;
    private final SupplierRepository suppliers;
    private final UserRepository users;
    private final StockTransactionRepository transactions;

    public StockService(ProductRepository products, SupplierRepository suppliers, UserRepository users,
                        StockTransactionRepository transactions) {
        this.products = products;
        this.suppliers = suppliers;
        this.users = users;
        this.transactions = transactions;
    }

    @Transactional
    public StockTransactionResponse stockIn(StockInRequest req, String userEmail) {
        Product product = lockProduct(req.productId());          // lock first, then everything else
        Optional<StockTransaction> replay = findReplay(req.requestId(), product.getId());
        if (replay.isPresent()) return Mappers.toResponse(replay.get());

        Supplier supplier = product.getSupplier();
        if (req.supplierId() != null) {
            supplier = suppliers.findById(req.supplierId()).filter(Supplier::isActive)
                    .orElseThrow(() -> new BadRequestException("The selected supplier does not exist"));
        }
        BigDecimal unitPrice = req.purchasePrice() != null ? req.purchasePrice() : product.getPurchasePrice();

        int previous = product.getQuantity();
        long updated = (long) previous + req.quantity();
        if (updated > Integer.MAX_VALUE) {
            throw new BusinessRuleException("The resulting quantity is too large");
        }
        product.setQuantity((int) updated);
        products.save(product);

        return Mappers.toResponse(transactions.save(ledgerRow(product, TransactionType.STOCK_IN, req.quantity(),
                previous, (int) updated, supplier, unitPrice, null, req.notes(), req.requestId(), userEmail)));
    }

    @Transactional
    public StockTransactionResponse stockOut(StockOutRequest req, String userEmail) {
        Product product = lockProduct(req.productId());
        Optional<StockTransaction> replay = findReplay(req.requestId(), product.getId());
        if (replay.isPresent()) return Mappers.toResponse(replay.get());

        int previous = product.getQuantity();
        if (req.quantity() > previous) {
            throw new InsufficientStockException(product.getName(), previous, req.quantity());
        }
        int updated = previous - req.quantity();
        product.setQuantity(updated);
        products.save(product);

        return Mappers.toResponse(transactions.save(ledgerRow(product, TransactionType.STOCK_OUT, req.quantity(),
                previous, updated, null, null, req.reason().trim(), req.notes(), req.requestId(), userEmail)));
    }

    public PageResponse<StockTransactionResponse> list(Long productId, Long categoryId, Long supplierId,
                                                       TransactionType type, LocalDate from, LocalDate to,
                                                       String search, int page, int size) {
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200),
                Sort.by(Sort.Direction.DESC, "transactionDate").and(Sort.by(Sort.Direction.DESC, "id")));
        return PageResponse.of(transactions
                .findAll(StockTransactionSpecifications.filter(productId, categoryId, supplierId, type, from, to, search), pageable)
                .map(Mappers::toResponse));
    }

    public StockTransactionResponse get(Long id) {
        return transactions.findById(id).map(Mappers::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", id));
    }

    // ------------------------------------------------------------------ helpers

    private Product lockProduct(Long productId) {
        Product product = products.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", productId));
        if (!product.isActive()) {
            throw new BusinessRuleException("This product is archived. Stock can no longer be changed");
        }
        return product;
    }

    /** If this requestId was already processed, return that transaction instead of applying it twice. */
    private Optional<StockTransaction> findReplay(String requestId, Long productId) {
        if (requestId == null || requestId.isBlank()) return Optional.empty();
        Optional<StockTransaction> existing = transactions.findByRequestId(requestId.trim());
        if (existing.isPresent() && !Objects.equals(existing.get().getProduct().getId(), productId)) {
            throw new DuplicateResourceException("This request id was already used for a different transaction");
        }
        return existing;
    }

    private StockTransaction ledgerRow(Product product, TransactionType type, int quantity, int previous, int updated,
                                       Supplier supplier, BigDecimal unitPrice, String reason, String notes,
                                       String requestId, String userEmail) {
        StockTransaction t = new StockTransaction();
        t.setProduct(product);
        t.setUser(users.findByEmailIgnoreCase(userEmail).orElse(null));
        t.setSupplier(supplier);
        t.setTransactionType(type);
        t.setQuantity(quantity);
        t.setUnitPrice(unitPrice);
        t.setReason(reason);
        t.setPreviousQuantity(previous);
        t.setNewQuantity(updated);
        t.setNotes(notes == null || notes.isBlank() ? null : notes.trim());
        t.setRequestId(requestId == null || requestId.isBlank() ? null : requestId.trim());
        return t;
    }
}
