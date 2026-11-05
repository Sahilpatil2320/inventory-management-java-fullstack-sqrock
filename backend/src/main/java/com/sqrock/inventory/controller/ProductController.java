package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.dto.PageResponse;
import com.sqrock.inventory.dto.ProductRequest;
import com.sqrock.inventory.dto.ProductResponse;
import com.sqrock.inventory.entity.StockStatus;
import com.sqrock.inventory.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) { this.productService = productService; }

    @GetMapping
    public PageResponse<ProductResponse> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(required = false) StockStatus stockStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction) {
        return productService.search(search, categoryId, supplierId, stockStatus, page, size, sortBy, direction);
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable Long id) { return productService.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request, Authentication auth) {
        return productService.create(request, auth.getName());
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable Long id) { return productService.delete(id); }
}
