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

## Bản vá native Footer inspector đã nghiệm thu — 2026-11-09

- Root cause: `builderEditabilityCues.ts` chặn click trong Footer `unsupported` tại document capture trước khi native ESC Table inspector nhận event.
- Astro `master` commit `b82f644cc7abd91d4d425e7f43226064fb00455b`: bỏ chặn riêng những cell footer có `pub_` table id, version SHA-256, row và field hợp lệ; kiểm tra quyền/version live vẫn do native inspector phụ trách. Không mở quyền cho vùng Footer khác.
- Actions Chromium contract commit `ce33f284df0743f6b9aa9b5e09235ccbadaecc61`: kiểm thử click text con của link, xác minh `esc-vb-section` truyền đúng tableId/row/field, chặn stale version. Run [42514768537](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42514768537): 4/4 jobs PASS.
- Production WordPress build [42514928428](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42514928428): SUCCESS; Astro deployment [42515003603](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42515003603): SUCCESS.
- Production read-only Playwright [42515172280](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42515172280): PASS tất cả 5 viewport, Home05 native description editor PASS, Footer label native inspector PASS, `FOOTER_CONSULTATION_HOME05_QA=PASS`. Global Footer `pub_aquafooterlinks` có 10 label cells, version `bd9d6548882ee52a2f794c66122464d096e4d1c7910d6ba06dacdade6f602d1c`.
- Không còn bug click inspector tái hiện. Chưa thực hiện production write/readback/rollback test; không coi read-only QA là bằng chứng save thành công. Chỉ thử ghi nếu thỏa backup, WRITE_SCOPE tối thiểu, cleanup và rollback.

## Hiệu ứng sóng Footer đã deploy và nghiệm thu — 2026-11-09

- Mẫu đã duyệt: ba lớp sóng trắng / cyan / tím ở mép trên dải bản quyền; giữ nguyên nội dung, logo, slogan, tâm căn giữa, liên kết CMS/ESC Table và bong bóng Tư vấn.
- Astro `master` commit `e3ce52aca18627028b3ad8b45847be3f30b0be7c`. Thay đổi giao diện trong `src/astro/components/Layout/Footer.astro`: SVG `data-aqua-footer-wave`, `pointer-events-none`, `aria-hidden`, `preserveAspectRatio="none"`, nằm trong branding band cùng lớp nền; bài test `footerCmsContract.test.ts` bảo vệ cấu trúc.
- Source contract CI [42536578128](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42536578128): 4/4 jobs PASS, có chạy footerCmsContract test.
- WordPress production build [42536688194](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42536688194) SUCCESS; Astro deploy [42536756427](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42536756427) SUCCESS.
- Production Playwright read-only [42536899413](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42536899413) SUCCESS: `FOOTER_WAVE_VIEWPORT_PASS` tại 1440×900, 1024×768, 768×1024, 844×390, 390×844. Assert 3 lớp sóng, không chặn click, không chồng chữ, đầy chiều rộng, nối liền với bản quyền, logo/slogan & copyright căn giữa. Footer consultation + Home_05 + native Builder label editor cũng PASS; `FOOTER_CONSULTATION_HOME05_QA=PASS`.
- Không thực hiện ghi dữ liệu CMS khi nghiệm thu. Không cần triển khai lại nếu chưa có yêu cầu mới. Production source marker đã được QA xác minh bằng SHA.
