// ============================================================================
// Relances conditionnelles → contrôle interactif.
//
// Les relances (« followUp ») encodent leur condition DANS le texte :
// « Falls ja: … », « Falls sehr stark: … », « Falls anfallsartig: … ». Plutôt
// que d'imposer une migration de schéma aux 26 relances existantes, on parse ce
// préfixe et on en déduit le type de contrôle à afficher. Inventaire réel au
// moment d'écrire ceci : 17 ja/nein (dont des situationnels comme « Falls
// aufgehört: »), 1 échelle, 1 choix, 6 inconditionnels (dont « Bei den
// Prüfern: », qui est une note et non une condition patient).
//
// Un futur schéma explicite (FB-B3) pourra remplacer ce parseur sans toucher
// aux composants : ils ne consomment que `FollowUpControl`.
// ============================================================================

export type FollowUpControl =
  | { kind: 'immer'; question: string }
  | { kind: 'ja'; label: string; question: string }          // label = « ja » ou la situation (« aufgehört »)
  | { kind: 'skala'; threshold: number; question: string }    // douleur 0-10, relance si ≥ threshold
  | { kind: 'wahl'; options: [string, string]; match: string; question: string };

const RE = /^Falls\s+([^:]{2,40}):\s*(.+)$/s;

export function parseFollowUp(raw: string): FollowUpControl {
  const m = RE.exec(raw.trim());
  if (!m) return { kind: 'immer', question: raw.trim() };
  const cond = m[1].trim();
  const question = m[2].trim();
  const c = cond.toLowerCase();
  if (c === 'ja' || c === 'bejaht') return { kind: 'ja', label: 'ja', question };
  if (/sehr stark/.test(c)) return { kind: 'skala', threshold: 7, question };
  if (/anfallsartig/.test(c)) return { kind: 'wahl', options: ['anfallsartig', 'dauerhaft'], match: 'anfallsartig', question };
  // Situationnel : la condition elle-même devient le libellé du toggle
  // (« aufgehört », « in Rente », « verstorben », « Auswurf »…).
  return { kind: 'ja', label: cond, question };
}

/** Regroupe les relances d'une phrase par contrôle : les « ja » partagent un
 *  seul toggle, les inconditionnelles restent des notes. L'ordre d'origine des
 *  questions est conservé à l'intérieur de chaque groupe. */
export interface FollowUpGroup { control: FollowUpControl; questions: string[] }

export function groupFollowUps(raws: string[]): FollowUpGroup[] {
  const groups: FollowUpGroup[] = [];
  const key = (c: FollowUpControl) =>
    c.kind === 'ja' ? `ja:${c.label.toLowerCase()}` : c.kind === 'wahl' ? `wahl:${c.match}` : c.kind;
  for (const raw of raws) {
    const c = parseFollowUp(raw);
    const k = key(c);
    const g = groups.find((x) => key(x.control) === k);
    if (g) g.questions.push(c.question);
    else groups.push({ control: c, questions: [c.question] });
  }
  return groups;
}
