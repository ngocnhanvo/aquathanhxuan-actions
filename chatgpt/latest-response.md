# Latest ChatGPT response — Aqua Thanh Xuân

Date: 2026-11-08 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Chế độ code: auto-build
Cổng ghi source: bypass

## Current user request
Document a **cross-project Knowledge rule** so any future ESC Table with `meta.api="Product"` uses the SAME native Visual Builder direct card sorting UX (red source outline, blue target outline, confirmation), not a separate Product-specific numbered ID selection UI.

## Completed
- Read and updated `ngocnhanvo/knowledge` branch `main`; no application source or production data was modified in this task.
- Added authoritative section `## Chuẩn bắt buộc: ESC Table nguồn Product phải sắp xếp item bằng cùng cơ chế Visual Builder dùng chung (2026-11-08)` to `stacks/wordpress-editor-esc-table.md` (commit `3894b2c97c66ec4e58b5c7d7ce0d0294a3d07dbe`).
- This rule binds all ESC Table `Product` sources in Astro+WordPress projects and templates, including nested tables, Sale sliders and product grids. Product attributes immutable in Builder, but membership/order/add/remove editable; native direct click-to-pick with red/blue outlines, selected source retained, indexed list fallback ONLY when marked component items unavailable; correct Table ID + original row mapping and authorization; prevent section/image overlay stealing clicks; Preview reorder/add/remove sync with live pagination and subset Sale semantics; cancel no CMS writes.
- Defined mandatory QA with both nested and standalone Product ESC tables, direct card picking, no ID list when cards available, source/target selection, cancel/confirm, WordPress data integrity, readback, responsive and regression tests. Nonmutating production QA simulation is NOT proof of backend persistence.
- Added prominent references in `knowledge/README.md` (commit `e3c0e2aa498285636ba172e551a83ebd95848b41`) and `knowledge/AGENTS.md` (commit `78865ea3036b8d816f82d97b7bdecb1e3361c30a`).
- Verified all three files read back successfully from `knowledge/main` with source-aware fields and Product rules intact.

## Source references
- https://github.com/ngocnhanvo/knowledge/blob/main/stacks/wordpress-editor-esc-table.md
- https://github.com/ngocnhanvo/knowledge/blob/main/README.md
- https://github.com/ngocnhanvo/knowledge/blob/main/AGENTS.md

## Scope and limits
This request was to RECORD THE RULE for other projects. No unrequested deployments/edits in other projects or templates. Other projects will need to read updated Knowledge and implement/test against their own current code; a Knowledge commit alone does not upgrade their installed application binaries.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
