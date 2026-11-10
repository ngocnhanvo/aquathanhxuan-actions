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

## Detached ESC label Save root cause and fix (2026-11-11)
- Controlled Save run 42873019395 confirmed native REST HTTP 200, saved=true, but Preview did not apply the text; error feedback was `Đã lưu WordPress, nhưng không tìm thấy chữ tương ứng...`. Native independent cleanup completed, `cleanup_remaining=0`.
- Root cause: Astro generic `patchAutoText` only searched inside `[data-tablepress-preview]` while Page-owned business label cells live outside it (checkout H1, form, receipt, support shell).
- Astro fix `4a361f8c39077f820be5bf0f7d93ce421d67ad0f`: `patchDetachedEscText` patches draft and committed text for exact live-verified `table_id + physical_row + field + rendered_version`; supports multiple visible appearances and reversible local drafts, no DOM text guessing. Strict PHP edit guards remain intact.
- Source QA 42872941031 PASS (Astro compile, regressions, baseline typecheck).
- WordPress production build 42873812125 PASS; signed Astro deploy 42873991762 PASS. Astro production `4a361f8c39077f820be5bf0f7d93ce421d67ad0f`.
- Independent browser QA 42874455432 PASS, 9/9 Pages, all Preview states, select exact physical field, 59 Checkout labels (including row 58), key immutable. Specifically `AQUA_CHECKOUT_DETACHED_ESC_DRAFT_REVERT_PASS row=58`: input draft updated actual iframe text instantly, and reverting reset the visible text without any WordPress write.
- Controlled one-cell Save/Restore QA 42875159644 PASS: `AQUA_BUILDER_CONTROLLED_SAVE_PASS` on `checkout_ui_vi` row 58 field `label`; canonical REST readback and live Builder updated; `AQUA_BUILDER_CONTROLLED_RESTORE_PASS`; `AQUA_BUILDER_CONTROLLED_SAVE_RESTORE_PASS changed=1 restored=1 cleanup_remaining=0`. No other TablePress rows changed.
- Knowledge rule updated at `ngocnhanvo/knowledge` commit `0a316918e9de25c531d06cffd487b7411c72c11e` for detached ESC source coordinates, draft and Save verification, cleanup.
- No fake orders, customer changes, payment changes, password resets, email deliveries, WooCommerce mutation or temporary records.

## Operations
- Admin: https://admin.aquathanhxuan.io.vn/wp-admin/edit.php?post_type=page&page=esc-visual-builder
- Live website: https://aquathanhxuan.io.vn
- For future Page label additions: extend native TablePress via Insert Code/native editor; source key immutable; guard `TableID + row + field + version`, readback after Save and safe preview actions.
- No pending work in the nine-Page Visual Builder acceptance scope. This does not assert that every future Page, all WooCommerce business flows, or unrelated Visual Builder features have been audited.

## Boundaries
Never create test orders, send emails, reset passwords, alter coupons/payments/customers, bypass PHP-managed production build, or modify arbitrary WordPress tables. Source QA, CMS authoring, build/deploy, read-only browser QA and reversible Save evidence are separate gates.

Status: DONE — nine-Page native ESC Visual Builder implementation and acceptance complete; controlled QA content restored.
