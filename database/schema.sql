-- =====================================================================
-- Inventory Management System - MySQL 8 schema
-- Run as a MySQL administrator (for example root) ONE time:
--   mysql -u root -p < database/schema.sql
-- The script creates the database, the tables, and a least-privilege
-- application user. CHANGE THE PASSWORD below before running it.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS inventory_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE inventory_management;

-- Application account (do NOT let the app connect as root).
-- IMPORTANT: replace 'ChangeMe_Str0ng!Pass' with your own password and put the
-- same value in the DB_PASSWORD environment variable.
CREATE USER IF NOT EXISTS 'inventory_app'@'localhost' IDENTIFIED BY 'Sahil@12345';
GRANT SELECT, INSERT, UPDATE, DELETE ON inventory_management.* TO 'inventory_app'@'localhost';
FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(150)  NOT NULL,
  password_hash VARCHAR(100)  NOT NULL,          -- BCrypt hash, never plaintext
  role          VARCHAR(20)   NOT NULL,
  active        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT ck_users_role CHECK (role IN ('ADMIN', 'STAFF'))
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  supplier_name VARCHAR(100) NOT NULL,
  company_name  VARCHAR(150) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  phone         VARCHAR(25)  NOT NULL,
  address       VARCHAR(300) NULL,
  active        TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_suppliers_email UNIQUE (email),
  INDEX idx_suppliers_company (company_name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- products
-- A product that already has stock history is archived (active = 0)
-- instead of deleted, so the transaction history is always preserved.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id                  BIGINT         NOT NULL AUTO_INCREMENT,
  name                VARCHAR(150)   NOT NULL,
  sku                 VARCHAR(50)    NOT NULL,
  description         VARCHAR(1000)  NULL,
  category_id         BIGINT         NULL,
  supplier_id         BIGINT         NULL,
  purchase_price      DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  selling_price       DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
  quantity            INT            NOT NULL DEFAULT 0,
  minimum_stock_level INT            NOT NULL DEFAULT 10,
  active              TINYINT(1)     NOT NULL DEFAULT 1,
  created_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_products_sku UNIQUE (sku),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL,
  CONSTRAINT ck_products_purchase_price CHECK (purchase_price >= 0),
  CONSTRAINT ck_products_selling_price  CHECK (selling_price  >= 0),
  CONSTRAINT ck_products_quantity       CHECK (quantity >= 0),
  CONSTRAINT ck_products_min_stock      CHECK (minimum_stock_level >= 0),
  INDEX idx_products_name (name),
  INDEX idx_products_category (category_id),
  INDEX idx_products_supplier (supplier_id),
  INDEX idx_products_active_qty (active, quantity)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- stock_transactions  (append-only ledger of every stock movement)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_transactions (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  product_id        BIGINT        NOT NULL,
  user_id           BIGINT        NULL,
  supplier_id       BIGINT        NULL,
  transaction_type  VARCHAR(10)   NOT NULL,
  quantity          INT           NOT NULL,
  unit_price        DECIMAL(12,2) NULL,           -- purchase price used for stock-in
  reason            VARCHAR(100)  NULL,           -- reason used for stock-out
  previous_quantity INT           NOT NULL,
  new_quantity      INT           NOT NULL,
  notes             VARCHAR(500)  NULL,
  request_id        VARCHAR(64)   NULL,           -- idempotency key: blocks duplicate submissions
  transaction_date  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_stock_tx_request UNIQUE (request_id),
  CONSTRAINT fk_stock_tx_product  FOREIGN KEY (product_id)  REFERENCES products (id)  ON DELETE RESTRICT,
  CONSTRAINT fk_stock_tx_user     FOREIGN KEY (user_id)     REFERENCES users (id)     ON DELETE SET NULL,
  CONSTRAINT fk_stock_tx_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers (id) ON DELETE SET NULL,
  CONSTRAINT ck_stock_tx_type     CHECK (transaction_type IN ('STOCK_IN', 'STOCK_OUT')),
  CONSTRAINT ck_stock_tx_qty      CHECK (quantity > 0),
  CONSTRAINT ck_stock_tx_prev     CHECK (previous_quantity >= 0),
  CONSTRAINT ck_stock_tx_new      CHECK (new_quantity >= 0),
  INDEX idx_stock_tx_product_date (product_id, transaction_date),
  INDEX idx_stock_tx_type (transaction_type),
  INDEX idx_stock_tx_date (transaction_date),
  INDEX idx_stock_tx_user (user_id)
) ENGINE=InnoDB;
