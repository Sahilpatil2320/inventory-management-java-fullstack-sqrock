# Testing

## Honest status summary

| Area | Status | How it was checked |
|---|---|---|
| MySQL schema + seed | **Executed and passed** | Loaded into MySQL 8.0.46; ledger reconciliation queries; constraint checks |
| Locking pattern for concurrent stock-out | **Executed and passed** (SQL level) | 12 parallel MySQL sessions, 5 units |
| React frontend (build + 43 tests) | **Executed and passed** | `npm run build`, `npm test` |
| Spring Boot backend | **Written, NOT compiled or run** | The authoring environment could not reach Maven Central. Only a Java *syntax* check was possible |
| Backend tests (unit, integration, concurrency) | **Written, NOT executed** | Run them yourself: `.\mvnw.cmd test` |
| React <-> Spring Boot <-> MySQL end to end | **NOT executed** | Needs the backend to run |
| Data persistence after application restart | MySQL level only | Seed data survived a MySQL server restart; the application was not restarted |
| Responsive layout in a browser | **NOT executed** | No browser was available; CSS has breakpoints at 960 px and 820 px. Check with browser DevTools device mode |

## 1. Database (executed)

- `schema.sql` and `seed.sql` load without errors: 6 categories, 6 suppliers, 20 products, 128 transactions (47 stock-in, 81 stock-out).
- Ledger reconciliation: for every product `quantity = sum(stock-in) - sum(stock-out)` (0 mismatches) and every row satisfies `new_quantity = previous_quantity +/- quantity` (0 broken rows).
- Seed totals: 1,026 units, inventory value 566,900.00, 2 out-of-stock and 5 low-stock products.
- Constraints rejected with the expected MySQL error codes:

| Attempt | Result |
|---|---|
| Negative quantity / negative price | 3819 check violation |
| Zero-quantity transaction / invalid transaction type | 3819 check violation |
| Duplicate SKU / duplicate supplier email / duplicate `request_id` | 1062 duplicate entry |
| Product with unknown category | 1452 foreign key |
| Delete a product that has transaction history | 1451 foreign key (restrict) |

- Concurrency: 12 sessions each tried to issue 1 unit from a product with 5 units, using the same
  `SELECT ... FOR UPDATE` -> check -> `UPDATE` -> `INSERT` ledger pattern as `StockService`.
  Result: 5 succeeded, 7 rejected, final quantity 0, exactly 5 ledger rows.
  This proves the database pattern; it does not execute the Java code.

## 2. Frontend (executed)

```powershell
cd frontend
npm test        # 43 tests in 3 files, all passing
npm run build   # production build succeeds
```

What the tests cover: login validation and server errors; dashboard shows exactly the API numbers and an error state;
product list search / filter / sort requests, admin vs staff buttons, delete confirmation; stock-out refusing more than the available quantity,
a double click sending one request with an idempotency key, server rejection messages; stock-in pre-filling supplier and price;
all nine reports for admins and seven for staff, CSV and valuation totals; category / user forms; protected routes; pagination,
table sorting and modal behaviour; CSV injection protection; validators; formatting.

The page tests mock the network layer (`services/endpoints.js`); they verify the UI against the contract in `docs/API.md`, not against the real server.

## 3. Backend tests (written, to run on your machine)

```powershell
cd backend
.\mvnw.cmd test
```

| Test class | What it checks |
|---|---|
| `StockStatusTest` | out / low / in-stock boundaries (low-stock calculation) |
| `StockServiceTest` | stock-in increases, stock-out decreases, over-issue rejected with quantity unchanged, archived / unknown product, repeated `requestId` applied once (Mockito, no DB) |
| `InventoryApiIntegrationTest` | Full API through Spring Security on H2: login, wrong password, token required, STAFF forbidden from admin endpoints, ADMIN allowed, product / category / supplier CRUD, duplicate SKU, validation errors, category-in-use block, stock flow with history and dashboard numbers, negative stock prevented, duplicate submission applied once, archive vs delete, valuation and movement reports, user rules |
| `StockConcurrencyIntegrationTest` | 12 threads issue 1 unit from a 5-unit product: exactly 5 succeed, 7 are rejected, quantity ends at 0 |

If a test fails on the first run, that is expected for code that has never been compiled; the failures point at the exact line to fix.

## 4. Manual end-to-end checklist (do this after the backend starts)

1. Sign in as the administrator; sign in as a staff user created under **Users**.
2. As staff: confirm you cannot see Add product, Users, Supplier / Valuation reports, and that calling `/api/users` returns 403.
3. Dashboard numbers equal the values in MySQL (`SELECT SUM(quantity), SUM(quantity*purchase_price) FROM products WHERE active=1;`).
4. Stock out more than available -> error message, quantity unchanged. Stock in -> quantity and dashboard update.
5. Double-click the Record button -> only one transaction appears in Transaction history.
6. Restart the backend; confirm all data is still there.
7. Reports: apply filters, Export CSV, Print.
8. Resize the browser (or use DevTools device mode) to tablet and phone widths.
