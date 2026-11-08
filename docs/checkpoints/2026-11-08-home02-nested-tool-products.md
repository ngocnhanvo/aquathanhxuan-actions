# Home 02 nested tool Product table — production checkpoint

Date: 2026-11-08 Asia/Ho_Chi_Minh
Project: aquathanhxuan.com
Status: DONE
Code mode: auto-build
Source gate: bypass

## Sources and ownership
- Knowledge: `ngocnhanvo/knowledge@78865ea3036b8d816f82d97b7bdecb1e3361c30a` (main).
- Astro: `ngocnhanvo/aquathanhxuan-astro@f86657ebb2fd6dc7fc78590c41e18b2c1a78db69` (master, deployed).
- PHP: `ngocnhanvo/aquathanhxuan-php@869b3ad842ef6d9cf29d7cc5710c7d429c265fee` (master, unchanged in this task).
- Actions: `ngocnhanvo/aquathanhxuan-actions@main`.

## Result
- ESC Table parent `home_02` has an actual `shortcode-products` cell containing `tool_home02products`.
- Child `tool_home02products` exists with `meta.api=Product`; 10 selected product references in this exact order: `82535, 82537, 82539, 82541, 82543, 82545, 82547, 82549, 82551, 82552`.
- WooCommerce Product records unchanged.
- WordPress Page `82454` retained `[table id=home_02 /]`, but its standalone native Insert Code wrapper `[table id=home_02products /]` was removed via normal WordPress editor Update and verified by independent read-after-write. All other section shortcodes remain.
- Original `home_02products` ESC Table retained unchanged as a data rollback/lookup reference.
- Astro `home02.ts` reads shortcode-products on the parent; `home02Products.ts` unwraps nested `data.json` and validates Product source; `Home_02.astro` selects the child while keeping the compatibility path for `home_07`.
- Component and Product rows preserve canonical ESC Table row, table ID and version coordinates in Visual Builder.

## Verified workflows
- CMS read-only inventory: `42492336518`, CMS audit job passed. Initial separate source test failed because an obsolete fixture expected a prior component call; the fixture was corrected.
- CMS migration final run: `42494247980` **success**, job `128773074361`, confirms parent link, child source, 10 Product IDs, native Page readback and no legacy embed.
- Astro build via WordPress: `42494478116` **success**, exact source SHA validated.
- Production Astro deploy: `42494552586` **success**, official WP-triggered pipeline.
- Production browser + Builder QA: `42494730962` **success**, job `128774480776`. Marker matches `f86657e`; 10 products in 1440x900, 1024x768, 768x1024, 844x390, and 390x844. WordPress Page shortcode contract passed. Builder authorized nested table, checked 10 Product IDs/rows/revisions, Product add dialog, red/blue sort candidate & cancellation, deletion confirmation & cancellation. No writes made by QA; underlying Product references unchanged.
- Prior unsuccessful migration attempts were scoped to switching Classic Editor modes before the native WordPress update succeeded; do not repeat them.

## Evidence caveat
QA interactions opened add/sort/delete controls then canceled, deliberately never sent `insert-item`, `swap-items` or `delete-item` to production. This establishes preview/authorization/selection correctness and source immutability, **not** a real add/delete/reorder persisted through the Builder. Do not report a real production mutation test as passed.

## Operational note
No further CMS migration or build is required for this checkpoint. Future edits to selected products occur in `tool_home02products` through its nested Visual Builder context. Do not insert a second standalone child shortcode in the WordPress Page.
