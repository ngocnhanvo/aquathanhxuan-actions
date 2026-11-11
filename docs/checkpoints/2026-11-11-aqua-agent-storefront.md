# Aqua Thanh Xuân — storefront AI Agent adaptation (2026-11-11)

## User request
- Review “Chat với Agent” and adapt interface and advice to Aqua Thanh Xuân, keeping the existing WordPress AI backend, WooCommerce data and customer sessions.

## Source changes
- Astro: `ngocnhanvo/aquathanhxuan-astro`, `master`, commit `a41f9af898f11ca7dbf357aeb1f972d34efaf7db`.
  - `src/astro/components/Tool/ContactWidget.astro`: Purple/cyan Aqua branding, “Trợ lý thủy sinh”, company-aware introduction sourced from WordPress `tencongty`, sales/product/price prompt in input, avoid unverified “Hỗ trợ 24/7” wording.
  - Fix history clear call from GET to POST to the actual Astro endpoint, only clear chat UI after successful response, accurate soft-clear wording.
  - Remove client-minted localStorage pseudo-session from API calls; rely on server-issued HttpOnly same-site cookie. Honor non-2xx errors.
  - Sanitize all Markdown returned from the agent against an HTML tag whitelist; remove scripts, images, event attributes and javascript: URLs while allowing safe product links.
- PHP: `ngocnhanvo/aquathanhxuan-php`, `master`, commit `10b6e584c6f7afd59702bee1b4cb438dd1e81fda`.
  - Planner and synthesis guidance prioritize verified WooCommerce product categories, individual product prices, promotions and checkout policies; no invented stock, tank compatibility, chemical dosing or discount stacking.
  - Replace gift-printing/large-quantity quoting assumptions in ContactSkill with storefront/contact guidance; ordinary purchase does not require logo or bulk MOQ.
  - Company profile now uses WordPress site identity and published top-level WooCommerce categories, and product discovery aliases include aquarium products.
  - Do not alter WooCommerce products, coupons, orders or the LLM provider configuration.

## Verification
- Actions source QA [#42946287879](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42946287879) PASS: Astro compiled; five PHP files linted; backend business prompt and Woo taxonomy fixture passed.
- PHP release [#42946448388](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42946448388) PASS: five agent files activated and remote SHA256 validated using existing signed FTPS rollback process. Other allowlisted PHP files unchanged. Existing PHP release allowlist was extended for these five specific files, with no new deploy pipeline.
- WordPress build [#42946934192](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42946934192) PASS; Astro deploy [#42947043396](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42947043396) PASS.
- Production browser QA [#42947322544](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42947322544) PASS with exact Astro SHA. Validates WordPress-backed agent history on an empty HttpOnly session, opening the consultation and Agent widgets, dynamic Aqua welcome, sending synthetic response, unsafe Markdown filtered, clear request uses POST, and 390×844, 926×760, 1440×900 screenshot/functional checks. Screenshot artifact `aqua-agent-storefront-qa` (7-day retention).

## Guardrails and validation boundary
- Browser QA **mocked chat generation responses** intentionally to avoid persisting fake customer chats and trace logs in the production WordPress conversation DB; real production read-only history REST path was verified. LLM-generated product advice correctness and model-provider status were not empirically tested with a live chat message during this change. Source prompt, deployed file hash, and UI/API behavior were verified.
- Chat history clear is a visitor soft-clear; records remain available for WordPress administration by existing design. UI uses “Làm mới cuộc trò chuyện” instead of falsely claiming irreversible deletion.
- No test order, coupon, fake CMS product, new user or fake chat record created. No background work is pending.

## State
- CODE_READY: PASS
- PHP_RELEASE: PASS
- ASTRO_BUILD / DEPLOY: PASS
- PRODUCTION_UI_AND_READONLY_HISTORY_QA: PASS
- LIVE_LLM_CONTENT_QA: NOT TESTED (production fake-chat-residue safety)
