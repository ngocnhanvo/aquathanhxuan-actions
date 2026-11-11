# Aqua Thanh Xuân — Đối chiếu SEO menu và sửa redirect cũ (2026-11-11)

## Hoàn tất trên production aquathanhxuan.io.vn
- Kiểm kê 88 URL danh mục gốc từ `https://aquathanhxuan.com/` (menu 11 nhóm, 86 mục + 2 category phụ), đối chiếu WordPress Header và danh mục WooCommerce thật. Audit [#42935108364](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42935108364) PASS; 9 title nguồn không đọc được trong batch đã xác minh độc lập sau đó, kết quả `source_unverified=0`.
- WordPress CMS: lưu Yoast taxonomy SEO title khớp đúng `<title>` của từng URL nguồn và SEO meta description tự viết khi nguồn thiếu, quản lý native `wpseo_taxonomy_meta` qua category editor; tạo đúng 88 WordPress CPT `chuyen-huong-link` (301 Exact) từ `/danh-muc/... ` sang `/san-pham/...` trên host mới, không hard-code Astro.
- Pilot [#42936671513](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42936671513) PASS; bulk [#42936896916](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42936896916) PASS (87 SEO + 87 redirect, 1 mỗi loại từ pilot); idempotent [#42938820017](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42938820017) PASS (sửa đúng 1 SEO title cuối, redirect writes 0, redirect skips 88).
- Astro master giữ nguyên `75ebf52676494f2e06de5f8f303a32c95af2be43`, build WordPress [#42939070832](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42939070832) PASS, deploy production [#42939167832](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42939167832) PASS.
- QA độc lập [#42939469959](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42939469959): **88/88 PASS** cho HTTP redirect 301, Location đúng, trang đích 200, SEO title nguồn, SEO description lưu, canonical; failures 0. Ví dụ: `https://aquathanhxuan.io.vn/danh-muc/thuong-hieu` → 301 → `https://aquathanhxuan.io.vn/san-pham/thuong-hieu`.
- Checkpoint: `docs/checkpoints/2026-11-11-menu-seo-redirect.md`, Actions main commit `f214c2cfb96e7db78c267303ab9a4f330a302536`.

## Lưu ý ranh giới domain gốc
- Domain gốc `aquathanhxuan.com` do hosting cũ vận hành độc lập, chưa tự forward sang domain mới; QA 4 URL gốc trả 200, không có Location. Phần **domain-level forwarding** muốn triển khai cần quyền hosting/WordPress của **máy chủ .com**, không thể thay bằng rule CPT bên WordPress mới.
- Scope yêu cầu theo ví dụ (đường dẫn cũ trên domain mới, SEO danh mục) đã hoàn tất. Không tự khẳng định redirect toàn domain cũ.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: DONE — hoàn tất
