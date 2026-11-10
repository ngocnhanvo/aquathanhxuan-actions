# Checkpoint — ESC Visual Builder business Pages (updated 2026-11-11)

Project: aquathanhxuan.com / aquathanhxuan.io.vn
Astro production: ngocnhanvo/aquathanhxuan-astro master
WordPress PHP: ngocnhanvo/aquathanhxuan-php master
Actions: ngocnhanvo/aquathanhxuan-actions main
Mode: auto-build; source gateway: bypass

## Objective
9 business/support Page previews: Order history, cart, checkout, receipt, lost password, reset password, contact, complaint, dealer. Preview uses safe synthetic state data, no customer/order/payment/email mutation. Page-owned text is editable in WordPress native ESC Table by exact TableID, row, field and version.

## Confirmed CMS and source
- Native UI labels installed via native Insert Code: cart_ui_vi (20), checkout_ui_vi (59), checkout_done_ui_vi (34); CMS readback run 42857479598 PASS.
- Existing order_history_vi (38), lost_password_vi (12), reset_password_vi (20).
- Five support Pages' original section tables each gained 13 native shell label rows; CMS writer run 42862224453 PASS (4 changed, 1 unchanged), no temporary records.
- Astro business components and support chrome/section consume native editable labels, including order history guest form. WordPress-driven Preview state switch remains read-only.
- Astro production SHA ae2dda4e463e60884c6ddc9a3d7ae3afd118c786; source QA 42864062087 PASS; WordPress production build 42864255008 PASS; signed deployment 42864438315 PASS.

## PHP root cause and remedy
- Browser QA run 42866090559 reached all 5 order history states, 2 cart states and 2 checkout states; checkout editing failed due PHP esc_vb_discover_table_rule rejecting >42 physical TablePress rows. checkout_ui_vi has 59 label rows + two headings.
- PHP fix master 9328a023934c78e2054406fed0edb3c11a45fff9: exact native two-column key/label schema may hold up to 80 entries; all other tables retain old caps. Duplicate/invalid keys fail closed. Only label is editable; key identity is immutable. Unit tests cover accepted 59, duplicate key, oversized label table, oversized generic table and immutable key.
- PHP release 42867578142 PASS; site-config.php deployed with FTPS SHA-256 verification, other PHP files unchanged, all predefined project regressions PASS.
- Read-only nine-page browser QA on deployed PHP and Astro: run 42867884395 in progress at last checkpoint. QA now verifies all label options and disallows key column, physical editor row/field/version, Preview states and no Woo/customer/email requests.

## Remaining gates
- Obtain final nine-page Playwright result; if FAIL inspect the exact stage and patch only root cause, rerun until passing.
- Verify real WordPress Save behavior only if a permitted nonproduction reversible test is defined; never change customer-edited labels in production for QA.
- Once QA passes, update this checkpoint and actions chatgpt/latest-response.md with DONE and exact evidence.

## Boundaries
Never create test orders, send emails, reset passwords, alter coupons/payments/customers, bypass the PHP-managed production build, or change arbitrary WordPress tables. Read-only QA and source/deploy outcomes are separate evidence gates.

Status: PARTIAL — nine-page production Visual Builder acceptance pending.
