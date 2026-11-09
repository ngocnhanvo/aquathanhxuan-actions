'use strict';
/** Independently confirmed preexisting WordPress taxonomy extensions, never inferred by product name.
 * Evidence: Aqua read-only all-child audit #42695363482, source root Woo IDs and target Woo IDs.
 * This applies ONLY to QA of existing target category references; no source or CMS writes.
 */
const verifiedCurated = Object.freeze({
  1788: Object.freeze({
    269165: 82581, // Sunsun YBG 300
    269168: 82580, // Sunsun YBG 400
    269169: 82579, // Sunsun YBG 500
    350156: 82577, // Sunsun YBG 600
  }),
});
const titleNorm = value => String(value || '').normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim();

function verifyChildCards({
  targetCategoryId, sourceRootId, expectedIds, renderedIds, targetById, sourceById,
}) {
  const expected = new Set(expectedIds.map(Number));
  const curated = [];
  const invalid = [];
  const verified = verifiedCurated[Number(targetCategoryId)] || {};
  for(const item of renderedIds) {
    const id = Number(item);
    if (!Number.isSafeInteger(id) || id < 1) {
      invalid.push({ targetId: item, problem: 'invalid target ID' });
      continue;
    }
    if (expected.has(id)) continue;
    const dest = targetById.get(id);
    const sourceId = Number((dest?.meta_data || []).find(x => x.key === '_esc_origin_product_id')?.value || 0);
    const original = sourceById.get(sourceId);
    const exactSource = Boolean(original && dest?.slug === original.slug);
    const originalRoot = Boolean(original?.categories?.some(c => Number(c.id) === Number(sourceRootId)));
    const destChild = Boolean(dest?.categories?.some(c => Number(c.id) === Number(targetCategoryId)));
    const name = titleNorm(original?.name);
    const relevantTitle = name.includes('lọc treo') && name.includes('sunsun');
    if (verified[sourceId] === id && exactSource && originalRoot && destChild && relevantTitle) {
      curated.push({ targetId: id, sourceId });
    } else {
      invalid.push({
        targetId: id, sourceId, problem: 'Not an independently verified original child or curated reference',
        exactSource, originalRoot, destChild, relevantTitle,
      });
    }
  }
  return { curated, invalid };
}
module.exports = { verifiedCurated, verifyChildCards };
