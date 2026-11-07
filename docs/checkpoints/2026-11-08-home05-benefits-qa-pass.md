# Checkpoint: Home 05 benefits strip PASS

Project: aquathanhxuan.com
Date: 2026-11-08 Asia/Ho_Chi_Minh

## Status
- Native ESC Table `home_05` created in WordPress (4 verified labels, 4 Lucide icon names), run #42410730788 SUCCESS. Earlier false-negative #42410558485 was selector for name on Edit form, but data persisted and idempotent readback verifies `Lợi ích khách hàng`.
- Insert Code via native WordPress editor on Page 82454: run #42410830561 SUCCESS. Full Page sections home_00..home_05, exactly one `[table id=home_05 /]`.
- Astro component `src/astro/tablepress/Home_05.astro` and parser `src/lib/wordpress/tablepress/home05.ts` versioned cell coordinates; source tests run #42410460663 SUCCESS.
- Production Astro SHA `df042317f33344afbc48f2495949af4ccf9a27f6`. WordPress production build run #42410962014 SUCCESS. Deploy run #42411027289 SUCCESS.
- Full 5 viewport + Builder read-only QA run #42411169165 SUCCESS: `HOME05_PRODUCTION_QA=PASS`, 4 actual icons, 4 rows, field coordinates `0..3:title,description,lucide-icon`, correct version, no overflow.
- Home03 and Home04 remain PASS run #42410091791.

## Next
- Footer restyling according to `aquathanhxuan-astro/docs/design/aquathanhxuan-homepage/HANDOFF.md` is still pending.
- Source all branding/logo/contact and navigation from WordPress only. Keep existing Builder-editable Footer field markers and FooterAssets intact. Use official production build pipeline only, QA five viewports.
- Do not repeat completed Home02-05 steps except if regression.

Chế độ code: auto-build
Cổng ghi source: bypass
