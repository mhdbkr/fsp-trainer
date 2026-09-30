// ============================================================================
// <TaskLabel> — l'anatomie d'une tâche de programme (audit identité &
// mouvement, série 3, §4.2).
//
// LE DÉFAUT QU'IL REMPLACE. `lib/program.ts` fabrique des CHAÎNES qui fondent
// le sujet et le type : « Divertikulitis — Anamnese seule », « Fachwissen :
// Perikarditis », « Drill · 12 dus + 8 nouveaux (≈ 14 min) ». Or `ProgramBlock`
// (db/types.ts) porte déjà `kind`, `teil`, `layer`, `assistance`, `estMin` en
// champs typés : la concaténation DÉTRUIT une information que le type possède,
// et la vue la ré-affiche juste en dessous — le type finit écrit deux fois
// (ProgramPage.tsx:364 vs :368), la couche aussi (:369 vs le label).
//
// CINQ ZONES, UNE SEULE DANS LA MATIÈRE.
//
//   ⬡   Divertikulitis          [Anamnese]     Couche 2 · assisté     20 min
//   1   2                       3              4                      5
//
//   1 · GLYPHE DE TYPE. `kind` en entier. Le mot « Simulation » disparaît :
//       le dessin dit ce que fait l'action (DIRECTION-STYLE.md:119-122).
//   2 · SUJET. Le nom du cas SEUL. Plus de tiret cadratin, plus de suffixe :
//       deux informations de nature différente ne se fondent pas dans une
//       chaîne. Il récupère la largeur libérée ; `truncate` ne reste qu'en
//       dernier recours, pour un nom de cas trop long à 390 px.
//   3 · PORTÉE. La seule zone qui mérite de la matière, et elle reprend
//       littéralement `.dim-tag` — la seule vraie étiquette premium de l'app.
//       Le mot est le Teil SEUL (« Anamnese »), jamais « Anamnese seule » :
//       la pastille EST la marque de partialité. ABSENTE quand la simulation
//       est complète — on lit la complétude à l'absence de pastille, pas à un
//       mot de plus. Un écran dense n'ajoute rien pour dire « rien de spécial ».
//   4 · ÉTAT. `layer` + `assistance` en `.label` : présent, discret, aligné à
//       droite. Plex Sans, casse normale (ADR-0016).
//   5 · COÛT. `estMin` en `.mono-tag` + `.tnum` : c'est une DONNÉE, donc mono —
//       exactement le périmètre laissé au mono par la décision de charte du
//       17 sept. 2026. Chiffres tabulaires : 9 min et 12 min occupent la même
//       largeur, la colonne ne sautille plus d'une ligne à l'autre.
//
// CONTRAT D'USAGE (lire avant de monter ce composant) :
//   · `block.label` doit être le SUJET SEUL. Tant que `lib/program.ts`
//     concatène, `taskSubject()` coupe au tiret cadratin — voir son commentaire.
//   · Le consommateur n'affiche plus à côté : le type, la couche, l'assistance,
//     la durée, ni « seule ». Tout est ici, une fois.
//   · Ce composant ne rend PAS l'action (« Lancer »). Il est l'étiquette, pas
//     la ligne : le conteneur reste au consommateur.
//   · Drill : passer `due`/`fresh`, la zone 3 devient la paire de compteurs.
//
// Non branché volontairement : cinq écrans le consommeront (ProgramPage,
// HomePage, SimulationHub, PreSimulationPage, DrillPage) et ils appartiennent à
// d'autres chantiers.
// ============================================================================
import type { ProgramBlock, ProgramBlockKind, SimTeil } from '@/db/types';
import { TEILE } from '@/lib/simScope';
import { Icon } from './icons';

/** Zone 1 — un glyphe par nature de tâche. Le type ne s'écrit plus en toutes
 *  lettres : il se reconnaît. (Mêmes glyphes que `BLOCK_META` de ProgramPage,
 *  qui a vocation à consommer cette table plutôt qu'à la doubler.) */
export const TASK_GLYPH: Record<ProgramBlockKind, { icon: string; label: string }> = {
  simulation: { icon: 'stethoscope', label: 'Simulation' },
  drill: { icon: 'id', label: 'Drill' },
  fachwissen: { icon: 'brain', label: 'Fachwissen' },
  aufklaerung: { icon: 'syringe', label: 'Aufklärung' },
  revision: { icon: 'history', label: 'Révision' },
};

// ponytail : cale de transition. `lib/program.ts` concatène encore
// (`${c.name} — ${t.label} seule`, `Fachwissen : ${c.pathology}`, `Drill · …`).
// Quand le chantier Programme aura fait de `label` le seul nom du sujet, cette
// fonction devient l'identité et peut disparaître — elle ne doit JAMAIS servir
// d'excuse à garder la concaténation. Séparateurs traités : « — » (tiret
// cadratin), « · » (point médian) et « : » de `Fachwissen : X` (on garde alors
// la partie DROITE, c'est elle qui porte le sujet).
export function taskSubject(label: string): string {
  const colon = label.match(/^\s*(?:Fachwissen|Révision|Aufklärung)\s*:\s*(.+)$/);
  if (colon) return colon[1].trim();
  return label.split(/\s+[—·]\s+/)[0].trim();
}

/** Zone 3 — la portée. Rien à rendre si la simulation est complète. */
function ScopeTag({ teil }: { teil: SimTeil }) {
  const t = TEILE.find((x) => x.key === teil);
  if (!t) return null;
  return (
    <span className="dim-tag gap-1.5">
      {/* Glyphe décoratif : le mot est juste à côté, l'annoncer deux fois
          serait exactement le doublon que ce composant vient supprimer. */}
      <Icon name={t.icon} className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {t.label}
    </span>
  );
}

export function TaskLabel({ block, due, fresh, className = '' }: {
  block: ProgramBlock;
  /** Drill : cartes dues (pétrole) et nouvelles (neutre). Zone 3 du drill. */
  due?: number;
  fresh?: number;
  className?: string;
}) {
  const glyph = TASK_GLYPH[block.kind];
  const state = [
    block.layer !== undefined ? `Couche ${block.layer}` : null,
    block.assistance === 'assiste' ? 'assisté' : block.assistance === 'autonome' ? 'autonome' : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 ${className}`}>
      {/* 1 · type */}
      <Icon name={glyph.icon} className="h-[18px] w-[18px] shrink-0 text-brand-600 dark:text-brand-300" title={glyph.label} />

      {/* 2 · sujet */}
      <span className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100">{taskSubject(block.label)}</span>

      {/* 3 · portée — absente sur une simulation complète ; paire de compteurs au drill */}
      {block.teil && <ScopeTag teil={block.teil} />}
      {due !== undefined && fresh !== undefined && (
        <span className="flex items-center gap-1.5">
          <span className="mono-tag tnum bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200" title="cartes dues">{due}<span className="sr-only"> cartes dues</span></span>
          <span className="mono-tag tnum" title="cartes nouvelles">{fresh}<span className="sr-only"> cartes nouvelles</span></span>
        </span>
      )}

      {/* 4 · état */}
      {state && <span className="label shrink-0">{state}</span>}

      {/* 5 · coût — donnée, donc mono, et tabulaire pour ne pas sautiller */}
      <span className="mono-tag tnum shrink-0">{block.estMin} min</span>
    </div>
  );
}
