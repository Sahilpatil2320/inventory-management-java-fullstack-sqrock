package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.dto.SupplierRequest;
import com.sqrock.inventory.dto.SupplierResponse;
import com.sqrock.inventory.entity.Supplier;
import com.sqrock.inventory.exception.BusinessRuleException;
import com.sqrock.inventory.exception.DuplicateResourceException;
import com.sqrock.inventory.exception.ResourceNotFoundException;
import com.sqrock.inventory.repository.ProductRepository;
import com.sqrock.inventory.repository.StockTransactionRepository;
import com.sqrock.inventory.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class SupplierService {

    private final SupplierRepository suppliers;
    private final ProductRepository products;
    private final StockTransactionRepository transactions;

    public SupplierService(SupplierRepository suppliers, ProductRepository products,
                           StockTransactionRepository transactions) {
        this.suppliers = suppliers;
        this.products = products;
        this.transactions = transactions;
    }

    public List<SupplierResponse> list(String search) {
        List<Supplier> found = (search == null || search.isBlank())
                ? suppliers.findByActiveTrueOrderBySupplierNameAsc()
                : suppliers.search(search.trim());
        Map<Long, Long> counts = productCounts();
        return found.stream().map(s -> toResponse(s, counts.getOrDefault(s.getId(), 0L))).toList();
    }

    public SupplierResponse get(Long id) {
        Supplier s = find(id);
        return toResponse(s, products.countBySupplierIdAndActiveTrue(id));
    }

    @Transactional
    public SupplierResponse create(SupplierRequest req) {
        String email = req.email().trim().toLowerCase();
        if (suppliers.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("A supplier with email " + email + " already exists");
        }
        Supplier s = new Supplier();
        apply(s, req);
        return toResponse(suppliers.save(s), 0);
    }

    @Transactional
    public SupplierResponse update(Long id, SupplierRequest req) {
        Supplier s = find(id);
        String email = req.email().trim().toLowerCase();
        if (suppliers.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new DuplicateResourceException("A supplier with email " + email + " already exists");
        }
        apply(s, req);
        return toResponse(suppliers.save(s), products.countBySupplierIdAndActiveTrue(id));
    }

    /**
     * Blocks while active products use the supplier. A supplier that appears in the stock history is
     * archived instead of deleted so old transactions keep their supplier.
     */
    @Transactional
    public MessageResponse delete(Long id) {
        Supplier s = find(id);
        long inUse = products.countBySupplierIdAndActiveTrue(id);
        if (inUse > 0) {
            throw new BusinessRuleException("Cannot delete \"" + s.getCompanyName() + "\": " + inUse
                    + " product(s) are supplied by it. Reassign those products to another supplier first");
        }
        if (transactions.existsBySupplierId(id)) {
            s.setActive(false);
            suppliers.save(s);
            return new MessageResponse("Supplier archived because it appears in the stock history");
        }
        suppliers.delete(s);
        return new MessageResponse("Supplier deleted");
    }

    private Supplier find(Long id) {
        return suppliers.findById(id).filter(Supplier::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier", id));
    }

    private void apply(Supplier s, SupplierRequest req) {
        s.setSupplierName(req.supplierName().trim());
        s.setCompanyName(req.companyName().trim());
        s.setEmail(req.email().trim().toLowerCase());
        s.setPhone(req.phone().trim());
        s.setAddress(req.address() == null || req.address().isBlank() ? null : req.address().trim());
    }

    private Map<Long, Long> productCounts() {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : products.countActiveProductsGroupedBySupplier()) {
            map.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    private SupplierResponse toResponse(Supplier s, long count) {
        return new SupplierResponse(s.getId(), s.getSupplierName(), s.getCompanyName(), s.getEmail(),
                s.getPhone(), s.getAddress(), count, s.getCreatedAt());
    }
}
