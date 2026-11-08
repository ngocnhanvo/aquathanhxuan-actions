# Latest ChatGPT response — aquathanhxuan.com

Date: 2026-11-08 Asia/Ho_Chi_Minh
Chế độ code: auto-build
Cổng ghi source: bypass

## User request
Replace existing Hot Combo with native parent-child ESC Table, using actual legacy aquathanhxuan.com Product data. Continue until production QA reaches goal.

## Completed
- Existing original Hot Combo section replaced with real WordPress-managed `home_03` → `shortcode-products` → `tool_combo01` (`meta.api=Product`).
- Four actual WooCommerce item IDs from original: `82561, 82562, 82564, 82566`; prices 320000, 1500000, 1050000, 300000 VND respectively.
- Fixed PHP page-scoped Builder manifest and permissions for bounded `shortcode-*` descendants. PHP master `ff22a9cac189a3f8d87c09f3682ad8d8f15349bc`.
- Fixed Astro Builder to hydrate child data-only blocks from authenticated WordPress manifest. Astro master `f00122d22842c36337857d575f2204605107bfc1`.
- Found and corrected FTP PHP release allowlist missing `change-index.php`; now checked SHA and deployed correctly.
- PHP production release `42486874147` SUCCESS; Astro WordPress build `42486243780` SUCCESS; Astro production deploy `42486319332` SUCCESS.
- Final GitHub Actions Playwright QA `42486986008` SUCCESS; five viewport checks, images, names, prices, no overflow; Builder manifest and table-source HTTP 200; nested grid visible, 4 Product IDs + row indices + version all PASS.
- Detailed checkpoint: `docs/checkpoints/2026-11-08-hot-combo-nested-production-qa-pass.md`.
- No invented second combo. Existing Product selection/list reference contract retained.

## QA scope caveat
Read-only Visual Builder QA passed, including nested Product source metadata. An actual save/reorder operation was NOT run by this QA, so do not claim that mutation was tested end-to-end.

## References
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42486986008
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42486874147
- https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42486319332

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
