package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.CategoryRequest;
import com.sqrock.inventory.dto.CategoryResponse;
import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.entity.Category;
import com.sqrock.inventory.exception.BusinessRuleException;
import com.sqrock.inventory.exception.DuplicateResourceException;
import com.sqrock.inventory.exception.ResourceNotFoundException;
import com.sqrock.inventory.repository.CategoryRepository;
import com.sqrock.inventory.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class CategoryService {

    private final CategoryRepository categories;
    private final ProductRepository products;

    public CategoryService(CategoryRepository categories, ProductRepository products) {
        this.categories = categories;
        this.products = products;
    }

    public List<CategoryResponse> list(String search) {
        List<Category> found = categories.findByNameContainingIgnoreCaseOrderByNameAsc(search == null ? "" : search.trim());
        Map<Long, Long> counts = productCounts();
        return found.stream().map(c -> toResponse(c, counts.getOrDefault(c.getId(), 0L))).toList();
    }

    public CategoryResponse get(Long id) {
        Category c = find(id);
        return toResponse(c, products.countByCategoryIdAndActiveTrue(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest req) {
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCase(name)) {
            throw new DuplicateResourceException("A category named \"" + name + "\" already exists");
        }
        Category c = new Category();
        apply(c, req);
        return toResponse(categories.save(c), 0);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest req) {
        Category c = find(id);
        String name = req.name().trim();
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new DuplicateResourceException("A category named \"" + name + "\" already exists");
        }
        apply(c, req);
        return toResponse(categories.save(c), products.countByCategoryIdAndActiveTrue(id));
    }

    @Transactional
    public MessageResponse delete(Long id) {
        Category c = find(id);
        long inUse = products.countByCategoryIdAndActiveTrue(id);
        if (inUse > 0) {
            throw new BusinessRuleException("Cannot delete \"" + c.getName() + "\": " + inUse
                    + " product(s) still use it. Reassign those products to another category first");
        }
        categories.delete(c);
        return new MessageResponse("Category deleted");
    }

    private Category find(Long id) {
        return categories.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category", id));
    }

    private void apply(Category c, CategoryRequest req) {
        c.setName(req.name().trim());
        c.setDescription(req.description() == null || req.description().isBlank() ? null : req.description().trim());
    }

    private Map<Long, Long> productCounts() {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : products.countActiveProductsGroupedByCategory()) {
            map.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return map;
    }

    private CategoryResponse toResponse(Category c, long count) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDescription(), count, c.getCreatedAt());
    }
}
