# Aqua Thanh Xuân — WordPress-native coupon migration (2026-11-10)

## Goal

All WooCommerce promotions must be administrable via actual **Marketing → Coupons** records. Current campaign `aqua-auto-5`: 5% from **≥200,000 VND**. Do not create real orders during QA.

## Completed

- Shared policy: `ngocnhanvo/knowledge` main `stacks/woocommerce-coupon-promotions.md`, README and AGENTS, latest commit `608788447a13486dbe1087a173aece9a93fc8a66`.
- Coupon created in WordPress, ID **83818**, code `aqua-auto-5`, publish, percent=5, minimum_amount=200000, includes sale items, stackable. Read-after-write PASS [run 42775054145](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775054145). First setup run 42774714799 failed only on treating `5.00` vs `5` as different; second run REUSE changed=0.
- PHP source master `4ee0532935166732c0423afa1fb5edfc0a0019ce`: removed virtual coupon filter and hardcoded 5%/200001; now validates persisted WC_Coupon via WC_Discounts and syncs only managed auto-code; native Woo validates expiry/minimum, usage and product restrictions. Unit contract PASS.
- PHP FTPS production release PASS [run 42775328127](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775328127). Installed modified MU plugin with verified SHA256; no Astro build.
- Latest Astro master `0ac8af50be65a4ead280d2368bd69195c27bcc01` fixes CoCart add-item string `id`, needed because previous anonymous cart QA [run 42771889672](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42771889672) failed `rest_invalid_param` on id type when old Astro production was live.

## In progress

- Requested WordPress-triggered production Astro build to publish latest Astro source: [build request](https://github.com/ngocnhanvo/aquathanhxuan-actions/blob/main/build-requests/2026-11-10-native-coupon-checkout-0ac8af5.json), [trigger run 42775519145](https://github.com/ngocnhanvo/aquathanhxuan-actions/actions/runs/42775519145). Must inspect exact downstream deployment run and its conclusion, marker source SHA, QA.

## Next deterministic steps

1. Poll run 42775519145 and its linked downstream Astro production run; do not duplicate trigger or assume started means PASS.
2. On confirmed deploy of Astro master 0ac8af5, update `qa-requests/aqua-checkout-live-cart.json` (single change) to retrigger existing no-order disposable cart QA. Fix script only when grounded in logs, never retry ambiguous add, always cleanup.
3. Verify actual CoCart cart discount 5% and coupon code `aqua-auto-5`, empty cart after test, no real order. If useful test exact 200k boundary with controlled local fixtures (PHP contract already PASS).
4. After QA record final result and update `chatgpt/latest-response.md`, with source SHA, run IDs, and flags.
5. If failure, state exact stage and keep `Trạng thái: PARTIAL — chưa hoàn tất`.

Source gateway bypass; code mode auto-build. No promotions should be defined as virtual coupons in PHP again.
