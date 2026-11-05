#!/usr/bin/env python3
"""Generates database/seed.sql.

Every product's final quantity is produced by replaying its own stock
transactions, so the ledger and the products table always agree.
Usage:  python database/tools/generate_seed.py > database/seed.sql
"""
import random
random.seed(2026)

categories = [
    ("Electronics", "Computer peripherals and office electronics"),
    ("Networking", "Switches, access points and cabling"),
    ("Office Supplies", "Stationery and everyday consumables"),
    ("Furniture", "Desks, chairs and storage"),
    ("Packaging", "Boxes, wrap and shipping materials"),
    ("Safety & Hygiene", "Sanitation and workplace safety items"),
]
suppliers = [
    ("Rohan Deshpande", "TechNova Distributors Pvt Ltd", "sales@technova-distributors.example", "+91 98220 11001", "Plot 14, Hinjewadi Phase 1, Pune, Maharashtra 411057"),
    ("Meera Iyer", "NetLink Wholesale", "orders@netlink-wholesale.example", "+91 98340 22002", "22 Nehru Place, New Delhi 110019"),
    ("Sanjay Kulkarni", "PaperTrail Stationers", "accounts@papertrail-stationers.example", "+91 98900 33003", "Shop 6, Laxmi Road, Pune, Maharashtra 411030"),
    ("Anita Rao", "WorkWell Furniture Co.", "support@workwell-furniture.example", "+91 99200 44004", "Survey 45, Peenya Industrial Area, Bengaluru 560058"),
    ("Imran Sheikh", "PackRight Industries", "dispatch@packright-industries.example", "+91 98190 55005", "Gala 9, MIDC Bhosari, Pune, Maharashtra 411026"),
    ("Kavita Nair", "SafeGuard Supplies", "hello@safeguard-supplies.example", "+91 97300 66006", "18 Ambattur Estate, Chennai 600058"),
]
# sku, name, description, category idx, supplier idx, buy, sell, min, final qty
products = [
    ("ELEC-001", "Wireless Mouse M185", "2.4 GHz wireless optical mouse with USB nano receiver", 0, 0, 450, 699, 20, 85),
    ("ELEC-002", "Mechanical Keyboard 87-Key", "Tenkeyless mechanical keyboard, blue switches", 0, 0, 1850, 2799, 10, 6),
    ("ELEC-003", "24-inch Full HD Monitor", "IPS panel, 75 Hz, HDMI and VGA inputs", 0, 0, 7200, 9499, 8, 14),
    ("ELEC-004", "USB-C Docking Station", "9-in-1 dock with HDMI, Ethernet and card reader", 0, 0, 3100, 4299, 6, 0),
    ("ELEC-005", "1080p Webcam", "Full HD webcam with built-in microphone", 0, 0, 1400, 2199, 10, 22),
    ("NET-001", "24-Port Gigabit Switch", "Rack-mount unmanaged gigabit Ethernet switch", 1, 1, 5600, 7499, 4, 3),
    ("NET-002", "Cat6 Patch Cable 2m (Pack of 10)", "Shielded Cat6 patch cables, 2 metre", 1, 1, 650, 949, 15, 40),
    ("NET-003", "Wi-Fi 6 Access Point", "Dual-band ceiling-mount access point with PoE", 1, 1, 4200, 5799, 5, 9),
    ("OFF-001", "A4 Copier Paper (500 Sheets)", "75 GSM multipurpose white paper ream", 2, 2, 210, 290, 100, 320),
    ("OFF-002", "Ballpoint Pens Blue (Box of 50)", "0.7 mm smooth-flow ballpoint pens", 2, 2, 180, 260, 30, 24),
    ("OFF-003", "Spiral Notebook A5", "180-page ruled spiral-bound notebook", 2, 2, 35, 55, 80, 0),
    ("OFF-004", "Heavy Duty Stapler", "Desktop stapler, 50-sheet capacity", 2, 2, 240, 349, 12, 31),
    ("FUR-001", "Ergonomic Office Chair", "Mesh-back chair with lumbar support and armrests", 3, 3, 5400, 7999, 5, 12),
    ("FUR-002", "Standing Desk 140 cm", "Electric height-adjustable desk, 140 x 70 cm", 3, 3, 11800, 15999, 3, 4),
    ("FUR-003", "4-Drawer Filing Cabinet", "Steel filing cabinet with central locking", 3, 3, 6900, 9499, 3, 3),
    ("PKG-001", "Corrugated Box 12x10x8 (Bundle of 25)", "3-ply corrugated shipping boxes", 4, 4, 310, 450, 40, 150),
    ("PKG-002", "Bubble Wrap Roll 50 m", "Protective air-bubble roll, 50 m x 1 m", 4, 4, 380, 560, 20, 18),
    ("SAF-001", "Hand Sanitizer 500 ml", "70% alcohol-based sanitizer, pump bottle", 5, 5, 95, 150, 50, 210),
    ("SAF-002", "First Aid Kit (Standard)", "Workplace first aid kit, 100 pieces", 5, 5, 520, 790, 10, 15),
    ("SAF-003", "Safety Helmet", "ISI-marked industrial safety helmet", 5, 5, 210, 340, 25, 60),
]
out_reasons = ["SALE", "SALE", "SALE", "INTERNAL_USE", "DAMAGED", "RETURN_TO_SUPPLIER"]

def q(s):
    return "'" + s.replace("'", "''") + "'"

txs = []  # (days_ago_float, sku, type, qty, price, reason, prev, new, notes, supplier_idx)
for sku, name, desc, ci, si, buy, sell, mn, final in products:
    run = 0
    opening = max(final, mn) * random.randint(2, 3) + random.randint(5, 30)
    items = [(random.uniform(55, 60), "STOCK_IN", opening, "Opening stock")]
    for _ in range(random.randint(3, 6)):
        d = random.uniform(1, 52)
        if random.random() < 0.7:
            items.append((d, "STOCK_OUT", None, None))
        else:
            items.append((d, "STOCK_IN", max(5, int(mn * random.uniform(0.8, 2.0))), "Replenishment order"))
    items.sort(key=lambda x: -x[0])
    for d, t, qty, note in items:
        if t == "STOCK_IN":
            txs.append([d, sku, t, qty, buy, None, run, run + qty, note, si]); run += qty
        else:
            qty = max(1, int(run * random.uniform(0.05, 0.25)))
            if qty > run: continue
            reason = random.choice(out_reasons)
            txs.append([d, sku, t, qty, None, reason, run, run - qty, "Issued: " + reason.replace("_", " ").lower(), None]); run -= qty
    if run != final:
        d = random.uniform(0.2, 0.9)
        if run < final:
            txs.append([d, sku, "STOCK_IN", final - run, buy, None, run, final, "Replenishment order", si])
        else:
            txs.append([d, sku, "STOCK_OUT", run - final, None, "SALE", run, final, "Issued: sale", None])

txs.sort(key=lambda t: -t[0])
print("-- Generated by database/tools/generate_seed.py - sample data for demos only.")
print("-- Contains NO users: create the first administrator with the INITIAL_ADMIN_* variables (see README).")
print("USE inventory_management;\n")
print("INSERT INTO categories (name, description) VALUES")
print(",\n".join("  (%s, %s)" % (q(n), q(d)) for n, d in categories) + ";\n")
print("INSERT INTO suppliers (supplier_name, company_name, email, phone, address) VALUES")
print(",\n".join("  (%s, %s, %s, %s, %s)" % tuple(q(x) for x in s) for s in suppliers) + ";\n")
print("INSERT INTO products (name, sku, description, category_id, supplier_id, purchase_price, selling_price, quantity, minimum_stock_level, created_at) VALUES")
rows = []
for sku, name, desc, ci, si, buy, sell, mn, final in products:
    rows.append("  (%s, %s, %s, (SELECT id FROM categories WHERE name=%s), (SELECT id FROM suppliers WHERE company_name=%s), %.2f, %.2f, %d, %d, NOW() - INTERVAL 60 DAY)"
                % (q(name), q(sku), q(desc), q(categories[ci][0]), q(suppliers[si][1]), buy, sell, final, mn))
print(",\n".join(rows) + ";\n")
print("INSERT INTO stock_transactions (product_id, user_id, supplier_id, transaction_type, quantity, unit_price, reason, previous_quantity, new_quantity, notes, transaction_date) VALUES")
rows = []
for d, sku, t, qty, price, reason, prev, new, notes, si in txs:
    sup = "(SELECT id FROM suppliers WHERE company_name=%s)" % q(suppliers[si][1]) if si is not None else "NULL"
    rows.append("  ((SELECT id FROM products WHERE sku=%s), NULL, %s, %s, %d, %s, %s, %d, %d, %s, NOW() - INTERVAL %d MINUTE)"
                % (q(sku), sup, q(t), qty, ("%.2f" % price) if price is not None else "NULL",
                   q(reason) if reason else "NULL", prev, new, q(notes), int(d * 1440)))
print(",\n".join(rows) + ";")
