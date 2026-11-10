# Aqua Thanh Xuân — Khôi phục luồng Quên mật khẩu

Date: 2026-11-10 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Frontend: https://aquathanhxuan.io.vn
WordPress: https://admin.aquathanhxuan.io.vn

## Diagnosis

1. Public WP Pages `quen-mat-khau` and `dat-lai-mat-khau` absent, links from OrderHistory LoginFormSSG fell back to `#`.
2. Incremental Astro Page cache reconciled missing SSR Pages only; newly REST-created SSG Pages never entered `.cache/pages.json`. First build with new Pages still produced 404.
3. WP reset-email filter invoked undefined global `get_site_domain()`. The only similarly named method in source belonged to an unrelated plugin class; a runtime fatal was possible.

## Actual source and CMS changes

- WordPress Page `#83827`: `slug=quen-mat-khau`, `acf.key=lostpass`, `acf.action=LostPassPage`, `product_lang=vi`, publish.
- WordPress Page `#83829`: `slug=dat-lai-mat-khau`, `acf.key=resetpass`, `acf.action=ResetPassPage`, `product_lang=vi`, publish.
- Astro native forms for password request/reset, client-side validation, safe text-only notices, removed reset tokens from address bar after capture, account return, corrected same-tab forgot-password links.
- Astro Page cache discovers all missing published WordPress Pages by lightweight metadata and fetches only uncached Page records, preserving existing SSR Action audit, Product/Menu/TablePress caching.
- WordPress password recovery mail URL now uses the published `thong-tin-chung` record (`domain=aquathanhxuan.io.vn`) with mandatory HTTPS, URL validation and native WP fallback if configuration missing. Lost-password unknown users get generic response; malformed requests and invalid reset tokens are rejected with no-store.
- Existing PHP FTPS release allowlist updated to include only the relevant `inc/user/lostpass.php` file; unchanged files skipped by hash. No second pipeline created.

Astro source branch: `ngocnhanvo/aquathanhxuan-astro/master`
HEAD: `4aee9b926d82e26df4cb45b0d38c95dcae9edcf9`
PHP source branch: `ngocnhanvo/aquathanhxuan-php/master`
HEAD: `54849c882e4c1fa774f3edf774261252e3dfd8ac`

## Evidence

| Check | Status | Run |
| --- | --- | --- |
| WordPress CMS Page install and ACF readback | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42826347954 |
| Astro source compile and regression tests, including publishedPageAudit | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42828073678 |
| Astro production build/deploy SHA and cache discovery | PASS attempt 5 | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42818443637 |
| Desktop/mobile Playwright recovery form route & validation | PASS attempt 2 | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42827438561 |
| PHP unit contracts (URL from WP Info, malformed input, generic account, invalid reset) | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42829490570 |
| PHP protected FTPS deployment with SHA readback for lostpass.php | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42829857079 |
| Live negative-path backend + Astro API (synthetic non-existent identity) | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42830297176 |

## Safety / limitations

- Browser QA mocked successful email requests and password update; no real customer accounts, actual email or passwords were used.
- Backend live QA used a non-existent synthetic `example.invalid` identity and invalid reset token, preventing email delivery and password changes.
- Actual external mailbox delivery and success through a real, one-time reset token were not directly verified (would require a dedicated, approved inbox). WordPress mail transport is not modified.
- No orders, payments, coupon changes or new customer records.
- Existing unrelated 9 Astro typecheck baseline errors remain outside this scope.

Outcome: implementation, production release and safe runtime QA PASS.
