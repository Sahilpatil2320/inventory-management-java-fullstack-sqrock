package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.CategoryRequest;
import com.sqrock.inventory.dto.CategoryResponse;
import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) { this.categoryService = categoryService; }

    @GetMapping
    public List<CategoryResponse> list(@RequestParam(required = false) String search) {
        return categoryService.list(search);
    }

    @GetMapping("/{id}")
    public CategoryResponse get(@PathVariable Long id) { return categoryService.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@Valid @RequestBody CategoryRequest request) { return categoryService.create(request); }

    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable Long id) { return categoryService.delete(id); }
}
