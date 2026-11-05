# Architecture

## Overview

```
Browser (React SPA)
   |  Axios + "Authorization: Bearer <JWT>"
   v
Spring Security filter chain  --JwtAuthFilter-->  loads user from DB on each request
   v
Controller  (HTTP, validation @Valid)        com.sqrock.inventory.controller
   v
Service     (business rules, @Transactional) com.sqrock.inventory.service
   v
Repository  (Spring Data JPA)                com.sqrock.inventory.repository
   v
MySQL 8     (constraints are the last line of defence)
```

## Backend packages

| Package | Responsibility |
|---|---|
| `controller` | Maps URLs to service calls. No business logic |
| `service` | Business rules and transaction boundaries; converts entities to DTOs |
| `repository` | Queries; `ProductSpecifications` / `StockTransactionSpecifications` build dynamic filters |
| `entity` | JPA entities (`User`, `Category`, `Supplier`, `Product`, `StockTransaction`) and enums |
| `dto` | Java records for requests / responses; entities are never exposed |
| `security` | JWT creation / validation, authentication filter, JSON 401 / 403 handlers |
| `config` | `SecurityConfig` (all authorization rules, CORS), `AdminBootstrap` (first admin) |
| `exception` | Domain exceptions and `GlobalExceptionHandler` (one JSON error format) |

## Stock consistency

`StockService.stockIn / stockOut` run in **one transaction**:

1. `SELECT ... FOR UPDATE` on the product row (`ProductRepository.findByIdForUpdate`). Concurrent requests for the same product queue here.
2. If a `requestId` was already processed, return the earlier result (idempotency).
3. Stock out: compare with the locked quantity; throw `InsufficientStockException` if too large.
4. Update `products.quantity` and insert a `stock_transactions` row with `previous_quantity` and `new_quantity`.
5. Commit. If anything fails, both changes roll back.

Extra safeguards: `CHECK (quantity >= 0)`, `UNIQUE (request_id)`, and product edits also take the row lock so they cannot overwrite a concurrent stock change.

The ledger is append-only (no update or delete endpoints). Products / suppliers / users with history are archived or deactivated, never hard-deleted.

## Security model

- Passwords: BCrypt. Tokens: HS256 JWT signed with `JWT_SECRET`, default lifetime 8 hours.
- Stateless API (no session, no cookies), so CSRF protection is disabled by design.
- The authentication filter reloads the user per request: a deactivated account or changed role applies immediately.
- Authorization is declared once in `SecurityConfig`; unknown routes are denied (`denyAll`).
- The database account `inventory_app` has only `SELECT, INSERT, UPDATE, DELETE` on one schema.

## Frontend structure

```
src/
  components/  reusable UI: Sidebar, Navbar, DataTable, Pagination, Modal, FormField, StatCard, StockGauge ...
  pages/       one file per screen (Dashboard, Products, ProductForm, StockForm ...)
  layouts/     AppLayout (sidebar + top bar + routed content)
  services/    api.js (Axios instance, token handling, 401 handling), endpoints.js (all API calls)
  hooks/       useAuth, useToast, useAsync (loading / error / reload), useDebounce, useLookups
  utils/       formatting, CSV export, validators, error helpers
  styles/      design tokens, layout and component CSS
```

Routing uses `ProtectedRoute` (sign-in and admin-only pages). This is a convenience for users: the real enforcement is on the server.
