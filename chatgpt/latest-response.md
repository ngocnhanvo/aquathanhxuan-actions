# Latest ChatGPT response — aquathanhxuan.com

Date: 2026-11-08 Asia/Ho_Chi_Minh
Chế độ code: auto-build
Cổng ghi source: bypass

## User's current request
User supplied screenshot of old-style Hot Combo section: big main image on left and multiple constituent products in a panel on the right, asks what to do when there are two Hot Combos. Request is for solution/design (not yet explicit implementation or images).

## Confirmed source facts
- Read current main Knowledge README, AGENTS and `stacks/wordpress-editor-esc-table.md`, including mandatory native red/blue Product ESC Table reference picker and native WordPress Insert Code contract.
- Astro master `src/lib/wordpress/tablepress/home03.ts`: `home_03` reads real TablePress rows, each with title, description, image, button_label and button_href. Each row is a combo item; no child product references currently modeled.
- Astro master `src/astro/tablepress/Home_03.astro`: displays `home_03` rows as sequential vertically stacked editorial combo cards; does not currently implement switchable bundle details with per-combo product list like supplied image. No code was changed.

## Suggested architecture
- Keep ONE homepage Hot Combo section; show one active combo at a time, switch using accessible tabs or previous/next/dots. With only one combo, hide controls; with two show two tabs; any number of combos is data-driven, not CSS hardcoded. Mobile tabs/swipe as appropriate, preserve banner and internal UI interaction in Visual Builder.
- WordPress ESC Table `home_03` owns the combo definitions and their order (one row per combo: real title/description/photo/CTA and a validated linked products source ID; optional bundle product ID).
- Each combo's constituent products are ordered references to genuine WooCommerce products in source `meta.api="Product"`, managed by the native common ESC visual item picker, not hardcoded in Astro. Practical conservative implementation: a separate Product reference ESC Table per combo, linked from the parent combo row; table IDs use names not conflicting with locale suffix reserved _vi/_en (e.g., `home_03productsA` and `home_03productsB`). For more scalable implementation, add native parent/group metadata to a shared Product table only if compatible with actual TablePress Product adapter and row schema; do not assume it already supports arbitrary group fields.
- Switching active combo changes its main photo, description, product list, totals and CTA together. Derive price and stock from WooCommerce. 'Mua Combo' must use an actual WooCommerce bundle product or a documented atomic grouped-cart flow with validated stock/price; do not fake or silently represent standalone products as an existing purchasable bundle.
- Rendering one combo by default, tab switching only changes local UI in preview (no route/mutation). Native editor/visual-builder controls manage parent combo order and per-combo product reference add/delete/sort; Product attributes readonly.
- Mandatory QA: 1/2/3 combos; switched media, products and price; no cross-contamination; no duplicate/hardcoded IDs; responsive desktop/mobile, keyboard; Builder direct red/blue picker; page reload and saved ESC Table ref order; no accidental CMS mutation during preview tests.

## Current status
This is a **design recommendation only**, not a code implementation. No Astro/PHP/WordPress data or production source modified. If user approves implementing the proposed UX, next step is inspecting actual `home_03` table and WooCommerce bundle data, then defining linked product tables and native Insert Code placement, coding Astro+Builder support, build and real QA. Do not invent data.

Trạng thái: DONE — hoàn tất
