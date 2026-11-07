# Checkpoint — Gỡ sticky bottom contact bar

Date: 2026-11-08 (Asia/Ho_Chi_Minh)
Project: aquathanhxuan.com

## Scope
User yêu cầu bỏ thanh xanh cố định dưới màn hình gồm Hotline, Zalo và Yêu cầu báo giá (ảnh ngày 2026-11-07).

## Code changes (verified)
- Astro repository: `ngocnhanvo/aquathanhxuan-astro`, branch `master`.
- Commit `2e16687c128a39648666c6bbb599341ce73a1490`: gỡ import/render BottomContactBar trong `src/astro/components/Layout/Layout.astro`; xóa biến dữ liệu chỉ phục vụ bar, bỏ `pb-16 md:pb-[68px]` và CSS offset do bar.
- Commit `6effb8e2af07edf87aaecdb9891b818f3529db16`: xóa component `src/astro/components/Layout/BottomContactBar.astro` không còn dùng.
- Giữ nguyên `Footer.astro`, `Header.astro`, `ContactWidget.astro`, dữ liệu WordPress và ESC Table.

## Production release (verified)
- Build request: `build-requests/2026-11-08-remove-bottom-contact-bar-6effb8e.json`, commit `7e84339559b261c9289f1de77c63937854bb321f` on Actions main.
- WordPress Build Website trigger run `42425150213`: SUCCESS.
- Canonical Astro production deploy run `42425210550`: SUCCESS.
- Deployed source SHA: `6effb8e2af07edf87aaecdb9891b818f3529db16`.

## After-deploy QA (verified)
- Updated `scripts/aquathanhxuan-homepage-final-qa.cjs` expected SHA and added regression checks that `#bottom-contact-bar` is absent before/after scrolling and layout bottom padding is `0px`. Actions QA source commit `bf22c18cb21c3da6d5f9c14fa07d143d5d9ceebf`.
- Run `42425346863`: SUCCESS, `HOMEPAGE_FINAL_QA=PASS`, `HOMEPAGE_DEPLOY_READY=PASS` for Astro SHA `6effb8e...`.
- Five viewports PASS: 1440×900, 1024×768, 768×1024, 844×390, 390×844; no horizontal overflow; Hero, Sale (12), Home 02–05, Footer and Builder regression pass.
- Builder cell coordinates pass for Home 02/03/04/05; Footer 9 CMS fields. CMS shortcode chain home_00..home_05 unchanged.
- Screenshot artifact: `13595530840` in run `42425346863`.
- No further production build or WordPress mutation needed for this request.

Chế độ code: auto-build
Cổng ghi source: bypass
