# REST API

Base URL: `http://localhost:8080/api`. All endpoints except `POST /auth/login` need the header
`Authorization: Bearer <token>`. Bodies and responses are JSON.

## Error format

```json
{ "timestamp": "2026-10-31T10:00:00Z", "status": 400, "code": "VALIDATION_FAILED",
  "message": "Please correct the highlighted fields", "path": "/api/products",
  "fieldErrors": { "name": "must not be blank" } }
```

| Status | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_FAILED`, `BAD_REQUEST` | Invalid body, parameter or reference (e.g. unknown category) |
| 401 | `UNAUTHORIZED`, `BAD_CREDENTIALS` | Missing / invalid token, wrong email or password |
| 403 | `FORBIDDEN` | Role not allowed |
| 404 | `NOT_FOUND` | Record does not exist |
| 409 | `DUPLICATE`, `INSUFFICIENT_STOCK`, `BUSINESS_RULE`, `CONFLICT`, `BUSY` | Duplicate SKU / email / name, not enough stock, record still in use |
| 500 | `SERVER_ERROR` | Unexpected error (details only in the server log) |

## Authentication

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public | `{ "email", "password" }` -> `{ token, tokenType, expiresInSeconds, user }` |
| GET | `/auth/me` | any user | Current user |
| POST | `/auth/change-password` | any user | `{ currentPassword, newPassword }` |

## Products

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/products` | ADMIN, STAFF | Query: `search`, `categoryId`, `supplierId`, `stockStatus` (`IN_STOCK`/`LOW_STOCK`/`OUT_OF_STOCK`), `page` (0-based), `size` (max 500), `sortBy` (`name`,`sku`,`quantity`,`purchasePrice`,`sellingPrice`,`createdAt`,`id`), `direction` |
| GET | `/products/{id}` | ADMIN, STAFF | One product |
| POST | `/products` | ADMIN | Create. `quantity` becomes opening stock (recorded as a stock-in) |
| PUT | `/products/{id}` | ADMIN | Update details. `quantity` is ignored (use stock in/out) |
| DELETE | `/products/{id}` | ADMIN | Deletes, or archives when the product has stock history |

Product body:
```json
{ "name": "Wireless Mouse", "sku": "ELEC-001", "description": "...", "categoryId": 1, "supplierId": 1,
  "purchasePrice": 450.00, "sellingPrice": 699.00, "quantity": 20, "minimumStockLevel": 10 }
```
Response adds `categoryName`, `supplierName`, `stockStatus`, `stockValue`, `active`, `createdAt`, `updatedAt`.

## Categories / Suppliers

`GET /categories`, `GET /categories/{id}` (ADMIN, STAFF; optional `?search=`), `POST`, `PUT /{id}`, `DELETE /{id}` (ADMIN).
`GET /suppliers`, `GET /suppliers/{id}` (ADMIN, STAFF), `POST`, `PUT /{id}`, `DELETE /{id}` (ADMIN).

- Category body `{ "name", "description" }`; response includes `productCount`.
- Supplier body `{ "supplierName", "companyName", "email", "phone", "address" }`.
- Deleting a category or supplier that still has active products -> `409`.
- A supplier that appears in stock history is archived instead of deleted.

## Stock

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/stock/in` | ADMIN, STAFF | `{ productId, quantity, supplierId?, purchasePrice?, notes?, requestId? }` -> `201` transaction |
| POST | `/stock/out` | ADMIN, STAFF | `{ productId, quantity, reason, notes?, requestId? }` -> `201`; `409 INSUFFICIENT_STOCK` if quantity exceeds stock |
| GET | `/stock/transactions` | ADMIN, STAFF | Query: `productId`, `categoryId`, `supplierId`, `type` (`STOCK_IN`/`STOCK_OUT`), `from`, `to` (`yyyy-mm-dd`), `search`, `page`, `size` (max 200) |
| GET | `/stock/transactions/{id}` | ADMIN, STAFF | One transaction |

`requestId` (any unique string, e.g. a UUID) makes the call idempotent: repeating it returns the original transaction and does not change stock again.

## Dashboard (ADMIN, STAFF)

| Path | Description |
|---|---|
| `GET /dashboard/summary` | Counts, units, inventory value, low / out / in-stock counts, `categoryDistribution`, 14-day `stockMovement` |
| `GET /dashboard/low-stock?limit=8` | Products at or below minimum (out-of-stock first) |
| `GET /dashboard/recent-transactions?limit=8` | Latest transactions |

## Reports

| Path | Access | Description |
|---|---|---|
| `GET /reports/inventory` | ADMIN, STAFF | `search`, `categoryId`, `supplierId`, `stockStatus`. Used for inventory, product, low-stock and out-of-stock reports |
| `GET /reports/stock-movements` | ADMIN, STAFF | `productId`, `categoryId`, `type`, `from`, `to`, `search`. Used for stock-in, stock-out and movement reports |
| `GET /reports/valuation` | ADMIN | `categoryId`, `search` -> rows + totals (cost value, retail value, potential profit) |
| `GET /reports/suppliers` | ADMIN | Per-supplier product count, units, stock value, units received |

CSV export and printing are done in the browser from these responses.

## Users (ADMIN only)

`GET /users`, `GET /users/{id}`, `POST /users` (`{ name, email, password, role }`), `PUT /users/{id}` (`{ name, role, active, password? }`), `DELETE /users/{id}`.
Rules: you cannot demote, deactivate or delete yourself; the last active admin is protected; a user with recorded transactions is deactivated instead of deleted.
