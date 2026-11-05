package com.sqrock.inventory.controller;

import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.dto.SupplierRequest;
import com.sqrock.inventory.dto.SupplierResponse;
import com.sqrock.inventory.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) { this.supplierService = supplierService; }

    @GetMapping
    public List<SupplierResponse> list(@RequestParam(required = false) String search) {
        return supplierService.list(search);
    }

    @GetMapping("/{id}")
    public SupplierResponse get(@PathVariable Long id) { return supplierService.get(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SupplierResponse create(@Valid @RequestBody SupplierRequest request) { return supplierService.create(request); }

    @PutMapping("/{id}")
    public SupplierResponse update(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return supplierService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public MessageResponse delete(@PathVariable Long id) { return supplierService.delete(id); }
}
