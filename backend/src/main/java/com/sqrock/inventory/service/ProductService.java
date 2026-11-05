package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.dto.PageResponse;
import com.sqrock.inventory.dto.ProductRequest;
import com.sqrock.inventory.dto.ProductResponse;
import com.sqrock.inventory.entity.*;
import com.sqrock.inventory.exception.BadRequestException;
import com.sqrock.inventory.exception.BusinessRuleException;
import com.sqrock.inventory.exception.DuplicateResourceException;
import com.sqrock.inventory.exception.ResourceNotFoundException;
import com.sqrock.inventory.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@Transactional(readOnly = true)
public class ProductService {

    /** Only these fields may be used for sorting (protects against arbitrary property names). */
    private static final Set<String> SORTABLE =
            Set.of("id", "name", "sku", "quantity", "purchasePrice", "sellingPrice", "createdAt");

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final SupplierRepository suppliers;
    private final StockTransactionRepository transactions;
    private final UserRepository users;

    public ProductService(ProductRepository products, CategoryRepository categories, SupplierRepository suppliers,
                          StockTransactionRepository transactions, UserRepository users) {
        this.products = products;
        this.categories = categories;
        this.suppliers = suppliers;
        this.transactions = transactions;
        this.users = users;
    }

    public PageResponse<ProductResponse> search(String search, Long categoryId, Long supplierId, StockStatus status,
                                                int page, int size, String sortBy, String direction) {
        String field = SORTABLE.contains(sortBy) ? sortBy : "name";
        Sort.Direction dir = "desc".equalsIgnoreCase(direction) ? Sort.Direction.DESC : Sort.Direction.ASC;
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 500),
                Sort.by(dir, field).and(Sort.by(Sort.Direction.ASC, "id")));
        return PageResponse.of(products
                .findAll(ProductSpecifications.filter(search, categoryId, supplierId, status), pageable)
                .map(Mappers::toResponse));
    }

    public ProductResponse get(Long id) {
        return Mappers.toResponse(find(id));
    }

    @Transactional
    public ProductResponse create(ProductRequest req, String userEmail) {
        String sku = normalizeSku(req.sku());
        if (products.existsBySkuIgnoreCase(sku)) {
            throw new DuplicateResourceException("SKU \"" + sku + "\" is already used by another product");
        }
        Product p = new Product();
        applyFields(p, req, sku);
        int openingStock = req.quantity() == null ? 0 : req.quantity();
        p.setQuantity(openingStock);
        p = products.save(p);

        // Keep the ledger complete: opening stock is recorded as a stock-in transaction.
        if (openingStock > 0) {
            StockTransaction t = new StockTransaction();
            t.setProduct(p);
            t.setUser(users.findByEmailIgnoreCase(userEmail).orElse(null));
            t.setSupplier(p.getSupplier());
            t.setTransactionType(TransactionType.STOCK_IN);
            t.setQuantity(openingStock);
            t.setUnitPrice(p.getPurchasePrice());
            t.setPreviousQuantity(0);
            t.setNewQuantity(openingStock);
            t.setNotes("Opening stock");
            transactions.save(t);
        }
        return Mappers.toResponse(p);
    }

    /** Edits product details. Quantity is NOT editable here: stock only changes through stock-in/out. */
    @Transactional
    public ProductResponse update(Long id, ProductRequest req) {
        // Row lock so this edit cannot overwrite a stock change that is happening at the same moment.
        Product p = products.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Product", id));
        if (!p.isActive()) {
            throw new BusinessRuleException("This product is archived and can no longer be edited");
        }
        String sku = normalizeSku(req.sku());
        if (products.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new DuplicateResourceException("SKU \"" + sku + "\" is already used by another product");
        }
        applyFields(p, req, sku);
        return Mappers.toResponse(products.save(p));
    }

    /**
     * Products without any stock history are deleted. A product that has history is archived
     * (hidden everywhere, history kept) so reports and the ledger stay correct.
     */
    @Transactional
    public MessageResponse delete(Long id) {
        Product p = products.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Product", id));
        if (transactions.existsByProductId(id)) {
            p.setActive(false);
            products.save(p);
            return new MessageResponse("Product archived because it has stock history. Its transactions are preserved");
        }
        products.delete(p);
        return new MessageResponse("Product deleted");
    }

    private Product find(Long id) {
        return products.findById(id).orElseThrow(() -> new ResourceNotFoundException("Product", id));
    }

    private String normalizeSku(String sku) {
        return sku.trim().toUpperCase();
    }

    private void applyFields(Product p, ProductRequest req, String sku) {
        Category category = categories.findById(req.categoryId())
                .orElseThrow(() -> new BadRequestException("The selected category does not exist"));
        Supplier supplier = null;
        if (req.supplierId() != null) {
            supplier = suppliers.findById(req.supplierId()).filter(Supplier::isActive)
                    .orElseThrow(() -> new BadRequestException("The selected supplier does not exist"));
        }
        p.setName(req.name().trim());
        p.setSku(sku);
        p.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
        p.setCategory(category);
        p.setSupplier(supplier);
        p.setPurchasePrice(req.purchasePrice());
        p.setSellingPrice(req.sellingPrice());
        p.setMinimumStockLevel(req.minimumStockLevel());
    }
}
