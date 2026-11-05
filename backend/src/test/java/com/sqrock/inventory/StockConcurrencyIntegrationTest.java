package com.sqrock.inventory;

import com.sqrock.inventory.dto.StockOutRequest;
import com.sqrock.inventory.entity.Category;
import com.sqrock.inventory.entity.Product;
import com.sqrock.inventory.entity.Role;
import com.sqrock.inventory.exception.InsufficientStockException;
import com.sqrock.inventory.repository.CategoryRepository;
import com.sqrock.inventory.repository.ProductRepository;
import com.sqrock.inventory.repository.StockTransactionRepository;
import com.sqrock.inventory.service.StockService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Simultaneous stock-outs: 12 threads each try to issue 1 unit from a product that has only 5.
 * With the row lock exactly 5 must succeed, 7 must be rejected, and stock must end at exactly 0.
 * (No test-level transaction here: every thread needs its own real transaction.)
 */
@SpringBootTest
@ActiveProfiles("test")
class StockConcurrencyIntegrationTest {

    @Autowired StockService stockService;
    @Autowired ProductRepository products;
    @Autowired CategoryRepository categories;
    @Autowired StockTransactionRepository transactions;

    @Test
    void simultaneousStockOutsNeverOversell() throws Exception {
        Category category = new Category();
        category.setName("Concurrency");
        category = categories.save(category);

        Product p = new Product();
        p.setName("Race Product");
        p.setSku("RACE-1");
        p.setCategory(category);
        p.setPurchasePrice(BigDecimal.TEN);
        p.setSellingPrice(BigDecimal.TEN);
        p.setQuantity(5);
        p.setMinimumStockLevel(1);
        Long productId = products.save(p).getId();

        int threads = 12;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger ok = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                try {
                    start.await();
                    stockService.stockOut(new StockOutRequest(productId, 1, "SALE", null, null), "nobody@test.local");
                    ok.incrementAndGet();
                } catch (InsufficientStockException e) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        assertEquals(5, ok.get(), "exactly the available units may be issued");
        assertEquals(7, rejected.get());
        assertEquals(0, products.findById(productId).orElseThrow().getQuantity());
        assertEquals(5, transactions.count(), "one ledger row per successful stock-out");
    }
}
