# Aqua Thanh Xuân — chỉ hiển thị thanh mua cố định sau khi cuộn qua nút chính

- Ngày: 2026-11-09 (Asia/Ho_Chi_Minh).
- Astro: `ngocnhanvo/aquathanhxuan-astro` `master` @ `04425828497f5f6c3ec0f30b49f1d808d473f238`.
- Actions: `ngocnhanvo/aquathanhxuan-actions` `main`.
- PHP: không thay đổi.
- Chế độ code: auto-build; Cổng ghi source: bypass.

## Nguyên nhân và sửa lỗi

Trước sửa `syncStickyPurchase()` dùng `!sourceVisible`: khi người dùng vừa vào trang nhưng cụm nút mua chính còn ở dưới viewport, biểu thức cũng cho kết quả true, làm sticky CTA hiện sai.

Đã sửa tại `src/astro/pages/ProductDetailsPage.astro`: `const hasScrolledPastActions = actions.bottom <= 0`; chỉ hiển thị khi `hasScrolledPastActions && !footerVisible`. Giữ nguyên handler giỏ hàng, trạng thái tồn kho, biến thể, trạng thái UI, contact widget, logic đóng khi đến footer.

## Kiểm thử và production

- Scoped Astro compile + Woo detail regression: [42621839199](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42621839199) = completed/success.
- WordPress production trigger: [42621951001](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42621951001) = completed/success.
- Existing production pipeline: [42622104173](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42622104173) = completed/success.
- QA lần đầu [42622350378](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42622350378) thất bại vì phép đo viewport trước khi kết thúc CSS transition 200ms, không phải sai logic source. Đã sửa QA chờ transition, không build lại.
- Browser QA cuối [42622655978](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42622655978) = completed/success; `DETAIL_DEPLOY_READY` đúng SHA `04425828497f5f6c3ec0f30b49f1d808d473f238`.
- 4 sản phẩm × viewport desktop 1440px/mobile 390px = 8/8 PASS. Các nhánh `initialHidden`, `beforeOriginalHidden`, `afterOriginalVisible`, `stickyVisibleOnDescription`, `footerHidden`, `delegatedClick` đều true. Không có overflow hoặc page errors.
- Artifact QA [13677074257](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42622655978/artifacts/13677074257) có 20 screenshots.
- QA read-only, không tạo dữ liệu mua thử. Không sửa PHP/WordPress.

## Trạng thái

**DONE — hoàn tất** cho yêu cầu hiện thanh cố định chỉ sau khi người dùng đã cuộn qua hai nút mua hàng chính. Không build/test lại với cùng source SHA nếu không có yêu cầu mới.
