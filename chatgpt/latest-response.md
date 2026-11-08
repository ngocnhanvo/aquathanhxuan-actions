# Latest ChatGPT response — Aqua Thanh Xuân
Date: 2026-11-08 Asia/Ho_Chi_Minh
Chế độ code: auto-build
Cổng ghi source: bypass

## User question
How to distinguish combo1 versus combo2 in WordPress ESC Tables, or use WooCommerce product categories?

## Recommended architecture (DESIGN ONLY)
- Do NOT use WooCommerce product categories to identify Hot Combo instances. Product taxonomy is intended for discovery and can be shared among bundles; Hot Combo membership is curated, ordered and potentially has per-item quantity/role, unrelated to one category.
- Parent `home_03` ESC Table: each row is a combo definition with stable `combo_key` (e.g. `combo01`, `combo02`), title, image, description, CTA/bundle_product_id if genuine, `products_table` (e.g. `home_03products01` / `home_03products02`). Row order controls which combo first; moving rows never changes combo membership.
- Each referenced child ESC Table has `meta.api="Product"`, ordered immutable WooCommerce Product IDs that can be selected, removed and reordered via the existing shared native Visual Builder item picker (red source, blue destination). Product name/price/image remain WooCommerce-owned readonly in Builder.
- The current `home03.ts` parser does NOT yet support `combo_key`/`products_table`; WordPress TablePress/ESC Table schema and Astro parser must be extended, linked child table shortcode managed by native WordPress Insert Code per Knowledge. Do not assume referencing an ID automatically loads a table.
- With 1 combo, hide switcher. With 2+, switch tabs/buttons and change photo/description/list/CTA as one atomic visual unit. Quantity or bundle pricing needs explicit verified WooCommerce product/bundle/cart arrangement, not fabricated pricing.
- Using categories optionally for category landing pages is orthogonal and should never replace combo identity.
- Alternative single child ESC Table with combo_key field per product could scale but current `Product` adapter uses Product IDs and is not verified to preserve arbitrary per-row grouping columns; separate Product reference tables are safest now.
- No data/source/deploy changes made; user requested design explanation only.

Status: DONE — design decision answered; implementation not requested.
Trạng thái: DONE — hoàn tất
