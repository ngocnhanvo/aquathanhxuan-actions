# Aqua Thanh Xuân — Skeleton lúc tải lịch sử đơn hàng

Ngày: 2026-11-10 (Asia/Ho_Chi_Minh)
Frontend: https://aquathanhxuan.io.vn/lich-su-mua-hang
Repo/branch: ngocnhanvo/aquathanhxuan-astro @ master

## Hoàn thành trong phạm vi yêu cầu

- Sửa duy nhất `src/astro/pages/OrderHistoryPage.astro` ở Astro; commit `6400fccb29df970ec911f33b1bd44b3739a80733`.
- SSR render trước hai card skeleton khi tải `/api/user/order`; không còn vùng trắng ban đầu.
- Skeleton dùng `role=status`, `aria-busy`, `motion-safe:animate-pulse`; không bật overlay PageTransition toàn màn hình.
- `finally` xóa skeleton ở cả nhánh 200 có đơn, 200 rỗng, 401 chưa login, lỗi 500 và lỗi fetch.
- Không sửa dữ liệu/order/coupon/PHP.

## Bằng chứng

| Kiểm tra | Kết quả | GitHub run |
| --- | --- | --- |
| Astro compiler, typecheck baseline allowlist, commerce regressions và skeleton contract | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42837357222 |
| Astro production build, verified source SHA, FTPS staging activation | PASS | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42837688901 |
| Playwright production: desktop delayed order, desktop 401 login, mobile empty, mobile HTTP 500 | PASS (4/4) | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42838110404 |
| WordPress production build trigger wrapper after deploy header QA | FAIL (unrelated header QA) | https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42837523847 |

Build wrapper confirms `BUILD_SUCCESS=PASS`, `DEPLOY_READY=PASS commit=6400fcc...` before failing its unrelated `QA_FAILED check=headerSearchTrueCenter viewport=900 measurements={"missingElement":true}`. The actual Astro deploy job completed successfully. Do not claim overall wrapper run PASS or rerun a successful production deploy merely for this header QA.

Playwright used mocked order API responses against actual production page, with no accounts, orders, payments, or CMS writes. It confirmed loading UI before responding, disappearance after response, login/error/empty handling, no mobile overflow. No real customer order data examined.

## Trạng thái

Skeleton task: DONE / production released / dedicated visual browser QA PASS.
Separately observed headerSearchTrueCenter 900px QA failure remains open for its own diagnostic; unrelated to OrderHistoryPage change.
