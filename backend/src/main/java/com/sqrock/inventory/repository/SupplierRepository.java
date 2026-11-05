package com.sqrock.inventory.repository;

import com.sqrock.inventory.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    boolean existsByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
    long countByActiveTrue();
    List<Supplier> findByActiveTrueOrderBySupplierNameAsc();

    @Query("""
           select s from Supplier s
           where s.active = true
             and (lower(s.supplierName) like lower(concat('%', :q, '%'))
               or lower(s.companyName)  like lower(concat('%', :q, '%'))
               or lower(s.email)        like lower(concat('%', :q, '%')))
           order by s.supplierName asc
           """)
    List<Supplier> search(@Param("q") String q);
}
