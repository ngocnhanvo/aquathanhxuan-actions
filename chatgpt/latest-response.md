# ChatGPT latest response — Aqua Thanh Xuân

- Ngày: 2026-11-11, Asia/Ho_Chi_Minh
- Nhiệm vụ: rà soát link sai trong Agent Aqua
- Astro production source: `ngocnhanvo/aquathanhxuan-astro/master@a41f9af898f11ca7dbf357aeb1f972d34efaf7db` (không đổi)
- PHP source mới: `ngocnhanvo/aquathanhxuan-php/master@f7d743c41bc7f6e54bfc594ed39396a2792e5a28`
- Checkpoint: [2026-11-11-agent-links-audit.md](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/docs/checkpoints/2026-11-11-agent-links-audit.md)

## Đã xử lý
- Lỗi [Cibi](/cibi) 404 trong Agent: danh mục sản phẩm nay mang đúng URL `/san-pham/cibi` từ PHP Skill; không để LLM tự ghép slug.
- Sản phẩm, chi tiết, so sánh, vật liệu, khuyến mãi được chuẩn hóa qua URL frontend Astro `/san-pham/{slug}`.
- Post-synthesis link guard sửa link theo tên có nguồn và bỏ link không có nguồn; prompt buộc dùng URL Skill.
- Xử lý đường dẫn menu tuyệt đối bị ghép sai `/https://...`; hướng dẫn thanh toán nay là Markdown link.
- Bổ sung các trường hợp test offline, không ghi đơn/chat lên production.
- Manifest FTPS/QA bổ sung đúng file nguồn liên quan.

## CI và phát hành
- QA request: [5537f47](https://github.com/ngocnhanvo/aquathanhxuan-actions/commit/5537f47cd6b4fec08d082e73c64399ace4cf1871)
- Release request cuối: [6f19666](https://github.com/ngocnhanvo/aquathanhxuan-actions/commit/6f1966698b7b0a2a67f46bcfb1ba85902baef034)
- Cả hai pin đúng PHP SHA `f7d743c`.
- **Chưa xác nhận job/run SUCCESS hoặc deploy production** vì công cụ GitHub đang có không cung cấp danh sách push workflow run mới. Không dùng commit/request làm bằng chứng deploy.
- Bước tiếp: lấy đúng run + logs QA/release, nếu pass mới kiểm tra production Cibi và các link còn lại; nghiệm thu LLM thật dùng kiểm thử cô lập hoặc phép thử với cleanup.

Chế độ code: auto-build
Cổng ghi source: bypass
Trạng thái: PARTIAL — chưa hoàn tất
