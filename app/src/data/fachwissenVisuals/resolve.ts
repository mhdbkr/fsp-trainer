// Résolution des références de la spec visuelle contre une fiche `Fachwissen`
// chargée (Dexie). Fonctions pures, aucun effet de bord. Voir contrat §2/§3.

import type { Fachwissen } from '@/db/types';
import type { FachwissenVisualSpec, SectionRef, VisualBlock } from './types';

/** Entrée de fiche résolue par une ref. */
export type ResolvedRef =
  | { section: 'therapie'; index: number; value: Fachwissen['therapie'][number] }
  | { section: 'klassifikation'; index: number; value: NonNullable<Fachwissen['klassifikation']>[number] }
  | { section: 'diagnostik'; entries: Fachwissen['diagnostik'] } // toutes les entrées de la stufe
  | { section: 'differenzialdiagnosen'; index: number; value: Fachwissen['differenzialdiagnosen'][number] }
  | { section: 'klinik'; index: number; value: Fachwissen['klinik'][number] }
  | { section: 'redFlags'; index: number; value: string }
  | { section: 'risikofaktoren'; index: number; value: string }
  | { section: 'prognose'; value: string }
  | { section: 'aetiologie'; value: string };

/** Clé canonique d'une ref (stable, comparaison exacte). */
export function refKey(ref: SectionRef): string {
  switch (ref.section) {
    case 'therapie':
      return `therapie:${ref.label}`;
    case 'klassifikation':
      return `klassifikation:${ref.name}`;
    case 'diagnostik':
      return `diagnostik:${ref.stufe}`;
    case 'differenzialdiagnosen':
      return `differenzialdiagnosen:${ref.dd}`;
    case 'klinik':
    case 'redFlags':
    case 'risikofaktoren':
      return `${ref.section}:${ref.text}`;
    case 'prognose':
    case 'aetiologie':
      return `${ref.section}:`;
  }
}

/**
 * Résout une ref contre la fiche. `null` si l'entrée n'existe pas exactement
 * (pas de normalisation — un `trim()` sur la ref est fait avant comparaison,
 * la fiche elle-même n'est jamais réécrite).
 */
export function resolveRef(fw: Fachwissen, ref: SectionRef): ResolvedRef | null {
  switch (ref.section) {
    case 'therapie': {
      const label = ref.label.trim();
      const index = fw.therapie.findIndex((s) => s.label === label);
      if (index === -1) return null;
      return { section: 'therapie', index, value: fw.therapie[index] };
    }
    case 'klassifikation': {
      const name = ref.name.trim();
      const list = fw.klassifikation ?? [];
      const index = list.findIndex((k) => k.name === name);
      if (index === -1) return null;
      return { section: 'klassifikation', index, value: list[index] };
    }
    case 'diagnostik': {
      const entries = fw.diagnostik.filter((d) => d.stufe === ref.stufe);
      if (entries.length === 0) return null;
      return { section: 'diagnostik', entries };
    }
    case 'differenzialdiagnosen': {
      const dd = ref.dd.trim();
      const index = fw.differenzialdiagnosen.findIndex((d) => d.dd === dd);
      if (index === -1) return null;
      return { section: 'differenzialdiagnosen', index, value: fw.differenzialdiagnosen[index] };
    }
    case 'klinik': {
      const text = ref.text.trim();
      const index = fw.klinik.findIndex((k) => k.text === text);
      if (index === -1) return null;
      return { section: 'klinik', index, value: fw.klinik[index] };
    }
    case 'redFlags': {
      const text = ref.text.trim();
      const list = fw.redFlags ?? [];
      const index = list.findIndex((t) => t === text);
      if (index === -1) return null;
      return { section: 'redFlags', index, value: list[index] };
    }
    case 'risikofaktoren': {
      const text = ref.text.trim();
      const list = fw.risikofaktoren ?? [];
      const index = list.findIndex((t) => t === text);
      if (index === -1) return null;
      return { section: 'risikofaktoren', index, value: list[index] };
    }
    case 'prognose':
      return fw.prognose ? { section: 'prognose', value: fw.prognose } : null;
    case 'aetiologie':
      return fw.aetiologie ? { section: 'aetiologie', value: fw.aetiologie } : null;
  }
}

/** true si `collapsed` contient la clé de `ref`. */
export function isCollapsed(collapsed: Set<string>, ref: SectionRef): boolean {
  return collapsed.has(refKey(ref));
}

/**
 * Parcourt `data` d'un bloc pour collecter tous les champs `source: Source`
 * (parcours générique : tout objet portant une propriété `source`) ainsi que
 * les `ref` des toggles/gauge (§1.8/§1.9). Retourne les `SectionRef` à
 * résoudre (les `'ergänzt'` sont exclus, ils résolvent toujours).
 */
function collectRefs(data: unknown): SectionRef[] {
  const refs: SectionRef[] = [];
  const seen = new Set<unknown>();

  function walk(node: unknown): void {
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    const obj = node as Record<string, unknown>;
    if ('source' in obj && obj.source !== 'ergänzt' && obj.source !== undefined) {
      refs.push(obj.source as SectionRef);
    }
    if ('ref' in obj && obj.ref !== undefined && isSectionRefShape(obj.ref)) {
      refs.push(obj.ref as SectionRef);
    }
    for (const value of Object.values(obj)) {
      if (value !== obj.source) walk(value);
    }
  }

  walk(data);
  return refs;
}

function isSectionRefShape(value: unknown): boolean {
  return typeof value === 'object' && value !== null && 'section' in (value as Record<string, unknown>);
}

/**
 * Résout un bloc entier : `replaces` + toutes les refs `source`/`ref` de
 * `data`. Un bloc est retenu en entier ou écarté en entier (D7, K3), jamais
 * partiel.
 */
function resolveBlockRefs(fw: Fachwissen, block: VisualBlock): { ok: true } | { ok: false; missing: string } {
  const allRefs: SectionRef[] = [...block.replaces, ...collectRefs(block.data)];
  for (const ref of allRefs) {
    if (resolveRef(fw, ref) === null) {
      return { ok: false, missing: refKey(ref) };
    }
  }
  return { ok: true };
}

/**
 * Résout une spec entière contre une fiche. Blocs non résolus écartés (avec
 * warning) ; `collapsed` = union des `replaces` des blocs retenus, en
 * respectant l'unicité du repli (§3.4) : un doublon est écarté (le second)
 * avec un warning.
 */
export function resolveSpec(
  fw: Fachwissen,
  spec: FachwissenVisualSpec,
): { blocks: VisualBlock[]; collapsed: Set<string>; warnings: string[] } {
  const blocks: VisualBlock[] = [];
  const collapsed = new Set<string>();
  const warnings: string[] = [];

  for (const block of spec.blocks) {
    const result = resolveBlockRefs(fw, block);
    if (!result.ok) {
      warnings.push(`[visuals] ${spec.fachwissenId}/${block.id}: ref introuvable ${result.missing}`);
      continue;
    }

    const blockKeys = block.replaces.map(refKey);
    const duplicate = blockKeys.find((key) => collapsed.has(key));
    if (duplicate) {
      warnings.push(`[visuals] ${spec.fachwissenId}/${block.id}: double repli ${duplicate}`);
      continue;
    }

    for (const key of blockKeys) collapsed.add(key);
    blocks.push(block);
  }

  return { blocks, collapsed, warnings };
}
