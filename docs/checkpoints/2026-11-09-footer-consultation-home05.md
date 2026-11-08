# Checkpoint — footer, popup tư vấn và Home_05 (2026-11-09)

## Mục tiêu
Theo ảnh web gốc: gom điện thoại, Messenger, Zalo và AI agent hiện có vào duy nhất một bong bóng Tư vấn; footer ba cột hiện đại với đủ liên hệ / logo / bản quyền và danh sách nguồn WordPress; Home_05 có bốn mô tả đầy đủ. Giữ quản lý ESC Table / Visual Builder, không link giả.

## Source mới nhất được chốt cho lần build đang chạy
- Astro master: `31f388af4876319f41960c2d702ff86c113fff56`.
- Info WordPress: canonical post 62, ACF Facebook `https://www.facebook.com/aquathanhxuan.hn/`, Zalo `0972551688`, hotline `0972551688`.
- `src/lib/wordpress/cache.ts`: gọi `getInfo([], WC_URL, preview)` để tránh ACF mới nhưng thiếu log; các cache khác giữ nguyên.
- `src/astro/components/Tool/ContactWidget.astro`: chung một launcher, mở agent cũ bên trong; popup chọn mở lên/xuống theo không gian viewport, căn ngang với clamp mép 12 px.
- Footer dùng global ESC Table `pub_aquafooterlinks` để dựng 5 mục sản phẩm nổi bật và 5 mục hỗ trợ; các mục thiếu URL không làm link giả.
- Home_05 có 4 mô tả text chuẩn từ web cũ, lưu native ESC Table.

## Đã thực hiện / bằng chứng
- WordPress Contact ACF update action 42505995083 SUCCESS.
- WordPress native Footer ESC Table creation action 42505656712 SUCCESS.
- WordPress Home05 native ESC Table creation action 42504691555 SUCCESS.
- Build/deploy code trước mobile action 42507142056 / 42507209553 SUCCESS.
- Build/deploy phiên mobile trước 42507641671 / 42507712212 SUCCESS.
- Playwright QA action 42507896678: PASS 1440x900, 1024x768, 768x1024, 844x390 với nội dung footer, Home05, Messenger + Zalo + AI và không scroll ngang. FAIL tại 390x844 do click nút đóng popup ở ngoài viewport; phát hiện chỉ kiểm tra tọa độ Y, chưa X.
- Fix SHA 31f388a: thay căn ngang popup dựa vào `panelLeft = clamp(rect.right - panelWidth, 12, innerWidth - panelWidth - 12)`; tăng QA kiểm tra cả X/Y.

## Kết quả nghiệm thu sau deploy — 2026-11-09
- Production build [42508241996](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42508241996) SUCCESS; deployed source SHA `31f388af4876319f41960c2d702ff86c113fff56`.
- Production deploy [42508312422](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42508312422) SUCCESS.
- Playwright QA [42508470220](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42508470220) SUCCESS (job `128816155642`); `FOOTER_CONSULTATION_HOME05_VIEWPORT_PASS` xuất hiện cho 1440×900, 1024×768, 768×1024, 844×390 và 390×844. `FOOTER_CONSULTATION_HOME05_BUILDER_PASS` và `FOOTER_CONSULTATION_HOME05_QA=PASS`.
- Các assert đối chiếu đúng 4 mô tả Home05, 5 featured links, 5 support rows, logo/địa chỉ/hotline/email, một launcher, Messenger/Zalo, popup nằm trọn viewport và không scroll ngang.
- Trong Visual Builder, QA xác nhận `pub_aquafooterlinks` hiển thị 10 hàng nguồn và 4 trường `description` Home05 mang `data-esc-builder-cell-field`; đây là **kiểm tra metadata/mapping read-only**, chưa xác thực round-trip thay đổi → lưu → đọc lại → hoàn tác trên production.
- QA artifact [13627893301](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42508470220/artifacts/13627893301): 11 files, 544555 bytes, retention 7 ngày.

## Điểm còn mở / giới hạn xác minh
- Không còn blocker build, deploy hoặc QA hiển thị. Chưa có kiểm thử production ghi/sửa/hủy thực tế các cell/footer link. Chỉ thực hiện write-and-rollback nếu có quy trình backup, write scope và cleanup an toàn; không sửa dữ liệu CMS thật chỉ để làm đẹp trạng thái.
- `chatgpt/latest-response.md` đang là snapshot của công việc Home06/Home07, cần cập nhật khi đóng checkpoint.

## Lịch sử checkpoint trước QA cuối (đã hoàn thành)
- Production build action **42508241996** từ request `build-requests/2026-11-09-consultation-horizontal-31f388a.json` đang chạy.
- QA script `scripts/aquathanhxuan-footer-consultation-home05-qa.cjs` đã thay `expectedSha` thành `31f388af...` và assert X/Y.
- Khi deploy SUCCESS mới cập nhật `qa-requests/footer-consultation-20261109.json` (expected SHA 31f) để trigger workflow `.github/workflows/aquathanhxuan-footer-consultation-home05-qa.yml`. Đừng chạy QA trước deploy (sai SHA).
- Nếu 5 viewport PASS, kiểm tra tiếp WordPress Visual Builder mapping `pub_aquafooterlinks` và 4 ô description Home05; QA đã có bước này, có thể còn cần điều chỉnh route iframe.
- Upload ảnh artifact QA, ghi SHA / run IDs / outcome chính xác; update `chatgpt/latest-response.md`.
- Chú ý source-only CI workflow 42505899044 có 36 unit tests PASS nhưng `astro check` FAIL vì 13 lỗi TS có sẵn ở file unrelated; không đánh đồng với production build.

## Không làm lại
- Các section Home_02/Home_06/Home_07 đã nghiệm thu ở checkpoint cũ; giữ nguyên.
- Không làm hình ảnh generate; đây là phiên code.
