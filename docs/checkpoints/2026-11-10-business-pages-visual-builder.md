# Checkpoint — ESC Visual Builder business Pages (2026-11-10)

Project: aquathanhxuan.com / aquathanhxuan.io.vn
Astro: ngocnhanvo/aquathanhxuan-astro (master)
PHP: ngocnhanvo/aquathanhxuan-php (master)
Actions: ngocnhanvo/aquathanhxuan-actions (main)
Code mode: auto-build; source gateway: bypass

## Objective
Safe state-driven Visual Builder Preview for order history, cart, checkout, receipt and password Pages; normal production-like Preview for support Pages. All Page-owned meaningful labels must use native WordPress ESC Tables with exact row/field/version source coordinates.

## Verified results
- Native ESC cart_ui_vi (20 rows, Page 83808), checkout_ui_vi (59 rows, Page 83810), checkout_done_ui_vi (34 rows, Page 83812), inserted with native Editor Insert Code. CMS readback PASS run 42857479598.
- Existing order_history_vi (38 labels, Page 83821), lost_password_vi (12 labels, Page 83827), reset_password_vi (20 labels, Page 83829).
- Astro CartPage, CheckoutPage/InfoForm, CheckoutDonePage, LostPassPage and ResetPassPage use WordPress ESC labels. WooCommerce order/customer/auth data remain on original APIs.
- Source QA (Astro compile, Vitest regressions, baseline TypeScript) PASS run 42857368624.
- Previous Astro SHA 236a6c5fe84aab844eea4411cf49913b73ea6887 deployed successfully by production run 42858112065.
- Wrapper run 42857936609 failed post-deploy Header QA at 900px because cart-link text is changed during hydration. QA selectors fixed in Actions commit 1cf12bfa; not independently retested yet.
- Nine-page browser QA run 42858821722 failed when switching order history preview to empty state. Not a PASS.

## In progress
- Astro master 51fd5a46a6a87f3b2ec032604927ba104341bcb2 adds authorized local state navigation through select change/explicit button, leaving form-action none and global Builder side-effect firewall intact.
- Nine-page read-only browser QA checks WordPress Page/TablePress ownership and states/cell coordinates, with no Woo/customer/email mutations.
- Await latest source QA, then deploy source by existing production pipeline, then rerun nine-page QA on exact SHA.
- Support Page text inside ESC section is editable; static shell/breadcrumb/aside labels in SupportPage still need migration.

## Boundaries
No real orders, payments, password reset emails, Woo customer writes, or temporary CMS records. Source code, CMS, build/deploy, browser QA and Save/readback are separate gates.

Status: PARTIAL — nine-page production QA and support shell labels pending.
