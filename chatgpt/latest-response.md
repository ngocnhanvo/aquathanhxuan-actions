# Latest ChatGPT response

Date (Asia/Ho_Chi_Minh): 2026-11-08
Project: aquathanhxuan.com
Task: Instantly render a newly added Product item on homepage Sale slider in ESC Visual Builder, no iframe reload
Code mode: auto-build
Source gateway: bypass

## Final response

DONE — Product-source ESC Table inserts now immediately render newly inserted WooCommerce Product in the same Sale carousel, after WordPress confirms the authoritative, version-guarded insertion. Product deletion/swap and Product readonly remain unchanged.

Root cause:
- WordPress `item-manager.php` returned `preview_items=null` for Product sources.
- WordPress `item-section-ui.php` sent `esc-vb-item-saved` only if `preview_items` was an array; Product inserts therefore never notified Astro, and the inspector said reload.
- Astro `builderSectionDrafts.ts` had only generic insert and Product delete/swap, no Product add renderer.

Changes:
- PHP `item-manager.php`: successful Product insert response includes `preview_product` with WooCommerce-backed ID/name/current & regular price/discount eligibility/image/link/currency, plus `product_order` of canonical ESC Table Product IDs (including filtered/unrendered IDs). No Product attributes written to ESC Table.
- PHP `item-section-ui.php`: sends `esc-vb-product-item-added` only after server save success, handles preview acknowledgement, and explicitly explains missing valid sale price when relevant.
- Astro `Home_01.astro`: Builder-only native Sale Product card HTML template, including when no eligible Sale cards yet; public rendering unchanged.
- Astro `builderSectionDrafts.ts`: validates Product ID, source order, prices and readonly; clones the native template and fills it from WooCommerce payload, inserts in authoritative ESC Table order, scrolls into view, and acknowledges success without iframe reload. Rejects duplicate notifications and does not send any CMS write.
- PHP test `items-and-sections.test.php`: checks server-authoritative Product payload, canonical reference ordering and discount.
- Synthetic Chromium contract and authenticated live production Playwright verify immediate card appearance plus duplicate prevention, deletion, Product selection and no CMS writes. Live QA sends a transient mock post-save event to iframe and removes card; did NOT modify ESC Table on production.

Commits:
PHP master latest 92d261b13d0c0955f83ac9461f3a7111de159c86.
Astro master latest 9912664d95d799de9f96cb609c2cb75658ea63f0.
Actions main Playwright QA commit 14ecd2104be913badf2520534aa7456fbbfe6ee5; synthetic Chromium fix 52e7904072b67c24b4d2a537580353e71ef40ee8.

Evidence:
- Source/Chromium contracts https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42448960739 SUCCESS, 3 jobs PASS.
- PHP production release https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449072737 SUCCESS.
- WordPress-controlled Astro build https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449092590 SUCCESS.
- Astro production deploy https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449156506 SUCCESS.
- Authenticated read-only production Playwright https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42449134490 attempt 2 SUCCESS; desktop 1440x900 and mobile 390x844: `BUILDER_PRODUCT_INSERT_LIVE=PASS`, `BUILDER_PRODUCT_DELETE_CONFIRM=PASS`, `BUILDER_PRODUCT_PICK=PASS`, no CMS write.
- QA does not perform a real insert in production because user did not authorize changing live item order; full server payload is separately covered by backend regression.

Limits:
- The home_01 Sale carousel intentionally shows only products with a valid price discount. A published Product without an eligible sale is saved to ESC Table but not drawn in that slider; Builder now shows an explicit explanation.
- Public production website content still updates only after approved Astro build, but Builder preview updates immediately after ESC Table insertion.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
