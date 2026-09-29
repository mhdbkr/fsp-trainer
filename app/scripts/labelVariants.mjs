// ============================================================================
// Variantes de libellé du glossaire — module FEUILLE partagé par la liaison
// (linkCaseTerms.mjs) et le validateur de registre (checkTermRegister.mjs).
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
// 207 libellés du glossaire sont composés (« Hypertonie/Hypertonus », « Diabetes mellitus
// (Abk. Diabetes) », « Radiologie (2): ») : leur libellé exact n'apparaît dans aucun cas.
// Variantes liables = parties séparées par « / » ou par une parenthèse, forme sans
// parenthèse, contenu des parenthèses « Abk. »/« syn. ». Les autres parenthèses (marqueurs
// « (2) », « (pl.) », « (engl.) », sigles « (EKG) ») ne sont pas des variantes ; affixes
// (« Troph- ») écartés ; exclusions relues : src/data/labelVariantExclusions.json.
export const LABEL_VARIANT_EXCLUSIONS = JSON.parse(readFileSync(join(here, '../src/data/labelVariantExclusions.json'), 'utf8'));
export function labelVariants(label, { exclusions = LABEL_VARIANT_EXCLUSIONS } = {}) {
  const out = [];
  const base = label.replace(/[([]([^)\]]*)[)\]]/gu, (_, inner) => {
    const m = /^\s*(?:Abk|syn)\.\s*(.*)$/iu.exec(inner);
    if (m) out.push(...m[1].split(','));
    return '|';
  });
  const parts = [...base.split(/[|/]/u), ...out].map((p) => p.replace(/[:.]\s*$/u, '').replace(/\s+/gu, ' ').trim());
  return [...new Set(parts)].filter((p) => /\p{L}{2}/u.test(p) && !/^-|-$/u.test(p) && !(p.toLowerCase() in exclusions));
}
