# Latest ChatGPT checkpoint — aquathanhxuan.com

Date: 2026-11-09 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Knowledge: ngocnhanvo/knowledge main (AGENTS/core policies read)
Astro: ngocnhanvo/aquathanhxuan-astro master @ 31f388af4876319f41960c2d702ff86c113fff56
PHP: ngocnhanvo/aquathanhxuan-php master @ 869b3ad842ef6d9cf29d7cc5710c7d429c265fee
Actions: ngocnhanvo/aquathanhxuan-actions main
Checkpoint: docs/checkpoints/2026-11-09-footer-consultation-home05.md

## Source/build/deploy/QA
- Contact popup combines phone, Messenger, Zalo and AI agent.
- Footer managed by WordPress global ESC Table `pub_aquafooterlinks`; Home_05 has four descriptions.
- Production build 42508241996: SUCCESS, requested source SHA 31f388a.
- Production deploy 42508312422: SUCCESS.
- Read-only Playwright QA 42508470220: SUCCESS, 5 viewport PASS 1440×900 / 1024×768 / 768×1024 / 844×390 / 390×844.
- QA asserted Messenger/Zalo, one launcher, popup X/Y viewport, no horizontal overflow, Footer contents/links and four Home_05 descriptions.
- Visual Builder QA asserted presence of 10 ESC Table rows sourced from `pub_aquafooterlinks` and 4 Home_05 `description` cell fields.
- Artifact 13627893301: 11 files, retained 7 days.

## Important distinction
- PASS: production rendering and read-only Visual Builder source-field mapping.
- NOT TESTED: true save/readback/rollback of edits to Visual Builder cells in production; do not claim this was verified. Follow CORE-04 backup/write scope/cleanup policy before any production write test.
- Prior Home02/Home06/Home07 work already QA PASS, don't redo.

## Next
No code fix is required by the latest read-only QA. If an explicit requirement remains to prove full editability, construct minimally scoped reversible test, ensure backup/write authorization, verify write and rollback. Otherwise the current deployment task is complete.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
