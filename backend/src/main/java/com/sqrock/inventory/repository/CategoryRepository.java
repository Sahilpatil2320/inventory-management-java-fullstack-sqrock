package com.sqrock.inventory.repository;

import com.sqrock.inventory.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    List<Category> findByNameContainingIgnoreCaseOrderByNameAsc(String name);
}
