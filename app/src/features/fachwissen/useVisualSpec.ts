import { useMemo } from 'react';
import type { Fachwissen } from '@/db/types';
import type { SectionKey, VisualBlock } from '@/data/fachwissenVisuals/types';
import { getVisualSpec } from '@/data/fachwissenVisuals';
import { resolveSpec } from '@/data/fachwissenVisuals/resolve';

// ============================================================================
// Hook pur : résout la spec visuelle d'une fiche contre la fiche chargée et
// la range par `anchor` pour l'insertion (contrat §2, §3.3). Aucune spec →
// `has: false`, page inchangée (D7).
// ============================================================================

export interface UseVisualSpecResult {
  /** Blocs résolus, groupés par section d'insertion, ordre croissant (`order`,
   *  défaut = index dans le tableau de blocs résolus). */
  blocksByAnchor: Map<SectionKey, VisualBlock[]>;
  /** Union des `replaces` des blocs résolus (clés `refKey`). */
  collapsed: Set<string>;
  /** `true` si une spec existe pour cette fiche (même si aucun bloc n'a
   *  résolu — la page peut différer d'aujourd'hui, `has` ne le distingue
   *  pas : c'est `blocksByAnchor.size === 0` qui l'indique). */
  has: boolean;
}

/** Un warning par contenu, une seule fois par session (évite le bruit dev
 *  à chaque re-render/re-montage de la page). */
const warnedOnce = new Set<string>();

export function useVisualSpec(fw: Fachwissen): UseVisualSpecResult {
  return useMemo(() => {
    const spec = getVisualSpec(fw.id);
    if (!spec) {
      return { blocksByAnchor: new Map(), collapsed: new Set<string>(), has: false };
    }

    const { blocks, collapsed, warnings } = resolveSpec(fw, spec);

    if (import.meta.env.DEV) {
      for (const warning of warnings) {
        if (warnedOnce.has(warning)) continue;
        warnedOnce.add(warning);
        // eslint-disable-next-line no-console
        console.warn(warning);
      }
    }

    const blocksByAnchor = new Map<SectionKey, VisualBlock[]>();
    for (const block of blocks) {
      const list = blocksByAnchor.get(block.anchor) ?? [];
      list.push(block);
      blocksByAnchor.set(block.anchor, list);
    }
    for (const list of blocksByAnchor.values()) {
      list.sort((a, b) => (a.order ?? blocks.indexOf(a)) - (b.order ?? blocks.indexOf(b)));
    }

    return { blocksByAnchor, collapsed, has: true };
  }, [fw]);
}
