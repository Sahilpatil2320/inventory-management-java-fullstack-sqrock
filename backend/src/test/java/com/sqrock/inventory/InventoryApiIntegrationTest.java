package com.sqrock.inventory;

import com.jayway.jsonpath.JsonPath;
import com.sqrock.inventory.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end API tests through the real security filter chain, services and an in-memory database.
 * Each test rolls back, so tests do not affect each other.
 */
@Transactional
class InventoryApiIntegrationTest extends IntegrationTestSupport {

    String admin;
    String staff;

    @BeforeEach
    void users() throws Exception {
        createUser("admin@test.local", Role.ADMIN);
        createUser("staff@test.local", Role.STAFF);
        admin = bearer(loginAndGetToken("admin@test.local"));
        staff = bearer(loginAndGetToken("staff@test.local"));
    }

    // ------------------------------------------------------------ authentication

    @Test
    void loginWithWrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginReturnsTokenAndUserWithoutPasswordHash() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@test.local\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token", not(emptyString())))
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
    }

    @Test
    void passwordsAreStoredHashedNotPlaintext() {
        String hash = userRepository.findByEmailIgnoreCase("admin@test.local").orElseThrow().getPasswordHash();
        org.junit.jupiter.api.Assertions.assertNotEquals(PASSWORD, hash);
        org.junit.jupiter.api.Assertions.assertTrue(hash.startsWith("$2"), "expected a BCrypt hash");
    }

    // ------------------------------------------------------------ authorization

    @Test
    void requestsWithoutTokenAreUnauthorized() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/dashboard/summary")).andExpect(status().isUnauthorized());
    }

    @Test
    void invalidTokenIsUnauthorized() throws Exception {
        mvc.perform(get("/api/products").header("Authorization", "Bearer not.a.real.token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void staffCannotManageCatalogUsersOrFinancialReports() throws Exception {
        mvc.perform(post("/api/categories").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Nope\"}")).andExpect(status().isForbidden());
        mvc.perform(delete("/api/products/1").header("Authorization", staff)).andExpect(status().isForbidden());
        mvc.perform(post("/api/suppliers").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{}")).andExpect(status().isForbidden());
        mvc.perform(get("/api/users").header("Authorization", staff)).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/valuation").header("Authorization", staff)).andExpect(status().isForbidden());
        mvc.perform(get("/api/reports/suppliers").header("Authorization", staff)).andExpect(status().isForbidden());
    }

    @Test
    void staffCanReadCatalogAndDashboardAndInventoryReport() throws Exception {
        mvc.perform(get("/api/products").header("Authorization", staff)).andExpect(status().isOk());
        mvc.perform(get("/api/categories").header("Authorization", staff)).andExpect(status().isOk());
        mvc.perform(get("/api/suppliers").header("Authorization", staff)).andExpect(status().isOk());
        mvc.perform(get("/api/dashboard/summary").header("Authorization", staff)).andExpect(status().isOk());
        mvc.perform(get("/api/reports/inventory").header("Authorization", staff)).andExpect(status().isOk());
    }

    @Test
    void adminCanOpenAdminOnlyEndpoints() throws Exception {
        mvc.perform(get("/api/users").header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/reports/valuation").header("Authorization", admin)).andExpect(status().isOk());
    }

    // ------------------------------------------------------------ category / supplier CRUD

    @Test
    void categoryCrudAndDuplicateNameRejected() throws Exception {
        long id = createCategory("Gadgets");

        mvc.perform(post("/api/categories").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"gadgets\"}")).andExpect(status().isConflict());

        mvc.perform(put("/api/categories/" + id).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Gadgets & Tools\",\"description\":\"d\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Gadgets & Tools"));

        mvc.perform(get("/api/categories/" + id).header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.productCount").value(0));

        mvc.perform(delete("/api/categories/" + id).header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/categories/" + id).header("Authorization", admin)).andExpect(status().isNotFound());
    }

    @Test
    void categoryWithProductsCannotBeDeleted() throws Exception {
        long cat = createCategory("Protected");
        createProduct("PROT-1", cat, 5);
        mvc.perform(delete("/api/categories/" + cat).header("Authorization", admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Reassign")));
    }

    @Test
    void supplierCrudAndValidation() throws Exception {
        mvc.perform(post("/api/suppliers").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"supplierName\":\"A\",\"companyName\":\"B\",\"email\":\"not-an-email\",\"phone\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.phone").exists());

        long id = createSupplier("sup@test.local");
        mvc.perform(post("/api/suppliers").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(supplierJson("SUP@test.local"))).andExpect(status().isConflict());
        mvc.perform(get("/api/suppliers/" + id).header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(delete("/api/suppliers/" + id).header("Authorization", admin)).andExpect(status().isOk());
    }

    // ------------------------------------------------------------ product CRUD and validation

    @Test
    void productCrudSearchAndFilters() throws Exception {
        long cat = createCategory("Office");
        long id = createProduct("PEN-001", cat, 50);

        mvc.perform(get("/api/products/" + id).header("Authorization", staff))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("PEN-001"))
                .andExpect(jsonPath("$.stockStatus").value("IN_STOCK"))
                .andExpect(jsonPath("$.stockValue").value(500.0));

        mvc.perform(get("/api/products").param("search", "pen-0").param("categoryId", String.valueOf(cat))
                        .header("Authorization", staff))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalElements").value(1));

        mvc.perform(get("/api/products").param("stockStatus", "OUT_OF_STOCK").param("categoryId", String.valueOf(cat))
                        .header("Authorization", staff))
                .andExpect(jsonPath("$.totalElements").value(0));

        mvc.perform(put("/api/products/" + id).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("PEN-001", cat, 999)))   // quantity in an update must be ignored
                .andExpect(status().isOk()).andExpect(jsonPath("$.quantity").value(50));

        // it has an opening-stock transaction, so deleting archives it: gone from the list, history kept
        mvc.perform(delete("/api/products/" + id).header("Authorization", admin)).andExpect(status().isOk());
        mvc.perform(get("/api/products").param("search", "PEN-001").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void productWithoutHistoryIsReallyDeleted() throws Exception {
        long cat = createCategory("Empty");
        long id = createProduct("EMPTY-1", cat, 0);          // quantity 0 => no opening transaction
        mvc.perform(delete("/api/products/" + id).header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message", containsString("deleted")));
        mvc.perform(get("/api/products/" + id).header("Authorization", admin)).andExpect(status().isNotFound());
    }

    @Test
    void duplicateSkuIsRejectedCaseInsensitively() throws Exception {
        long cat = createCategory("Dup");
        createProduct("DUP-1", cat, 1);
        mvc.perform(post("/api/products").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("dup-1", cat, 1)))
                .andExpect(status().isConflict());
    }

    @Test
    void invalidProductsAreRejected() throws Exception {
        long cat = createCategory("Val");
        // negative price and quantity, missing name
        mvc.perform(post("/api/products").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"sku\":\"V-1\",\"categoryId\":" + cat
                                + ",\"purchasePrice\":-1,\"sellingPrice\":-2,\"quantity\":-3,\"minimumStockLevel\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.purchasePrice").exists())
                .andExpect(jsonPath("$.fieldErrors.sellingPrice").exists())
                .andExpect(jsonPath("$.fieldErrors.quantity").exists());
        // unknown category
        mvc.perform(post("/api/products").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content(productJson("V-2", 999999, 1)))
                .andExpect(status().isBadRequest());
        // unknown id
        mvc.perform(get("/api/products/999999").header("Authorization", admin)).andExpect(status().isNotFound());
        // malformed id
        mvc.perform(get("/api/products/abc").header("Authorization", admin)).andExpect(status().isBadRequest());
    }

    // ------------------------------------------------------------ stock operations

    @Test
    void stockInAndOutUpdateQuantityHistoryAndDashboard() throws Exception {
        long cat = createCategory("Stocky");
        long id = createProduct("STK-1", cat, 10);          // opening stock of 10, minimum 5

        mvc.perform(post("/api/stock/in").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + id + ",\"quantity\":20,\"notes\":\"delivery\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.previousQuantity").value(10))
                .andExpect(jsonPath("$.newQuantity").value(30))
                .andExpect(jsonPath("$.userName").value("STAFF Test"));

        mvc.perform(post("/api/stock/out").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + id + ",\"quantity\":26,\"reason\":\"SALE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.newQuantity").value(4));

        mvc.perform(get("/api/products/" + id).header("Authorization", staff))
                .andExpect(jsonPath("$.quantity").value(4))
                .andExpect(jsonPath("$.stockStatus").value("LOW_STOCK"));

        // opening stock + stock in + stock out = 3 ledger rows for this product
        mvc.perform(get("/api/stock/transactions").param("productId", String.valueOf(id)).header("Authorization", staff))
                .andExpect(jsonPath("$.totalElements").value(3));
        mvc.perform(get("/api/stock/transactions").param("productId", String.valueOf(id)).param("type", "STOCK_OUT")
                        .header("Authorization", staff))
                .andExpect(jsonPath("$.totalElements").value(1));

        mvc.perform(get("/api/dashboard/low-stock").header("Authorization", staff))
                .andExpect(jsonPath("$[?(@.sku=='STK-1')]").exists());
        mvc.perform(get("/api/dashboard/summary").header("Authorization", staff))
                .andExpect(jsonPath("$.totalProducts").value(1))
                .andExpect(jsonPath("$.totalStockQuantity").value(4))
                .andExpect(jsonPath("$.totalInventoryValue").value(40.0))   // 4 units x 10.00
                .andExpect(jsonPath("$.lowStockProducts").value(1));
    }

    @Test
    void stockOutBeyondAvailableIsRejectedAndQuantityStaysNonNegative() throws Exception {
        long cat = createCategory("Neg");
        long id = createProduct("NEG-1", cat, 3);

        mvc.perform(post("/api/stock/out").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + id + ",\"quantity\":4,\"reason\":\"SALE\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

        mvc.perform(get("/api/products/" + id).header("Authorization", staff))
                .andExpect(jsonPath("$.quantity").value(3));
    }

    @Test
    void invalidStockRequestsAreRejected() throws Exception {
        long cat = createCategory("Inv");
        long id = createProduct("INV-1", cat, 3);
        mvc.perform(post("/api/stock/in").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + id + ",\"quantity\":0}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/stock/out").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":" + id + ",\"quantity\":1}")).andExpect(status().isBadRequest()); // reason missing
        mvc.perform(post("/api/stock/in").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productId\":999999,\"quantity\":1}")).andExpect(status().isNotFound());
    }

    @Test
    void duplicateSubmissionWithSameRequestIdIsAppliedOnlyOnce() throws Exception {
        long cat = createCategory("Idem");
        long id = createProduct("IDEM-1", cat, 10);
        String body = "{\"productId\":" + id + ",\"quantity\":5,\"requestId\":\"11111111-aaaa\"}";

        mvc.perform(post("/api/stock/in").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/stock/in").header("Authorization", staff).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/products/" + id).header("Authorization", staff))
                .andExpect(jsonPath("$.quantity").value(15));       // 10 + 5, not 10 + 5 + 5
    }

    @Test
    void productWithHistoryIsArchivedNotDeleted() throws Exception {
        long cat = createCategory("Arch");
        long id = createProduct("ARCH-1", cat, 5);                  // has an opening-stock transaction
        mvc.perform(delete("/api/products/" + id).header("Authorization", admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.message", containsString("archived")));
        mvc.perform(get("/api/products").param("search", "ARCH-1").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(0));
        mvc.perform(get("/api/stock/transactions").param("search", "ARCH-1").header("Authorization", admin))
                .andExpect(jsonPath("$.totalElements").value(1));   // history preserved
    }

    // ------------------------------------------------------------ reports

    @Test
    void valuationAndMovementReportsUseDatabaseData() throws Exception {
        long cat = createCategory("Rep");
        long id = createProduct("REP-1", cat, 7);

        mvc.perform(get("/api/reports/valuation").header("Authorization", admin))
                .andExpect(jsonPath("$.totalQuantity").value(7))
                .andExpect(jsonPath("$.totalCostValue").value(70.0))       // 7 x 10.00
                .andExpect(jsonPath("$.totalRetailValue").value(140.0))    // 7 x 20.00
                .andExpect(jsonPath("$.totalPotentialProfit").value(70.0));

        mvc.perform(get("/api/reports/stock-movements").param("type", "STOCK_IN").header("Authorization", staff))
                .andExpect(jsonPath("$", hasSize(1)));
        mvc.perform(get("/api/reports/inventory").param("stockStatus", "LOW_STOCK").header("Authorization", staff))
                .andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(get("/api/reports/suppliers").header("Authorization", admin)).andExpect(status().isOk());
    }

    // ------------------------------------------------------------ user management

    @Test
    void adminCanCreateUsersAndCannotDeactivateSelf() throws Exception {
        mvc.perform(post("/api/users").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Staff\",\"email\":\"new@test.local\",\"password\":\"longenough1\",\"role\":\"STAFF\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist());

        MvcResult me = mvc.perform(get("/api/auth/me").header("Authorization", admin)).andReturn();
        int adminId = JsonPath.read(me.getResponse().getContentAsString(), "$.id");
        mvc.perform(put("/api/users/" + adminId).header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"x\",\"role\":\"ADMIN\",\"active\":false}"))
                .andExpect(status().isConflict());
    }

    // ------------------------------------------------------------ helpers

    private long createCategory(String name) throws Exception {
        String body = mvc.perform(post("/api/categories").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private long createSupplier(String email) throws Exception {
        String body = mvc.perform(post("/api/suppliers").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(supplierJson(email)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private long createProduct(String sku, long categoryId, int quantity) throws Exception {
        String body = mvc.perform(post("/api/products").header("Authorization", admin)
                        .contentType(MediaType.APPLICATION_JSON).content(productJson(sku, categoryId, quantity)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private static String productJson(String sku, long categoryId, int quantity) {
        return "{\"name\":\"Product " + sku + "\",\"sku\":\"" + sku + "\",\"categoryId\":" + categoryId
                + ",\"purchasePrice\":10.00,\"sellingPrice\":20.00,\"quantity\":" + quantity + ",\"minimumStockLevel\":5}";
    }

    private static String supplierJson(String email) {
        return "{\"supplierName\":\"Sam\",\"companyName\":\"Sam Co\",\"email\":\"" + email
                + "\",\"phone\":\"+91 98765 43210\",\"address\":\"Pune\"}";
    }
}
