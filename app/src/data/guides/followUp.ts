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
  | { kind: 'wahl'; options: [string, string]; match: string; question: string }
  // Plusieurs branches sur UN contrôle : « Rauchen Sie ? » → ja / aufgehört / nie,
  // chaque réponse ouvrant ses propres relances (au lieu de deux toggles
  // empilés « Ja / Nein » puis « Aufgehört / Nein », FB2-O1).
  | { kind: 'zweig'; options: string[]; branches: Record<string, string[]> };

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
  // « Leben Ihre Eltern noch ? » : les deux réponses possibles sont « leben
  // noch » et « verstorben » — pas « verstorben / nein », deux libellés de même
  // sens qui troublaient à chaque simulation (FB2-J3).
  if (/verstorben/.test(c)) return { kind: 'wahl', options: ['leben noch', 'verstorben'], match: 'verstorben', question };
  if (/in rente/.test(c)) return { kind: 'wahl', options: ['berufstätig', 'in Rente'], match: 'in rente', question };
  if (/periode.*aufgehört/.test(c)) return { kind: 'wahl', options: ['noch regelmäßig', 'aufgehört'], match: 'aufgehört', question };
  // Situationnel : la condition elle-même devient le libellé du toggle
  // (« aufgehört », « in Rente », « Auswurf »…).
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
    if (c.kind === 'zweig') continue; // jamais produit par le parseur
    const k = key(c);
    const g = groups.find((x) => key(x.control) === k);
    if (g) g.questions.push(c.question);
    else groups.push({ control: c, questions: [c.question] });
  }
  return mergeBranches(groups);
}

// « Falls ja » + « Falls aufgehört » sur la même question = trois états
// exclusifs du patient (fume / a arrêté / n'a jamais fumé) → un seul contrôle.
function mergeBranches(groups: FollowUpGroup[]): FollowUpGroup[] {
  const ja = groups.find((g) => g.control.kind === 'ja' && g.control.label === 'ja');
  const stopped = groups.find((g) => g.control.kind === 'ja' && g.control.label.toLowerCase() === 'aufgehört');
  if (!ja || !stopped) return groups;
  const merged: FollowUpGroup = {
    control: { kind: 'zweig', options: ['ja', 'aufgehört', 'nie'], branches: { ja: ja.questions, aufgehört: stopped.questions, nie: [] } },
    questions: [...ja.questions, ...stopped.questions],
  };
  return groups.map((g) => (g === ja ? merged : g)).filter((g) => g !== stopped);
}
