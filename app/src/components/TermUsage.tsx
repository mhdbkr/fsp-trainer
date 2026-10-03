// ============================================================================
// « Dans l'entretien » (F4a D2 → F4c) : les trois usages d'un terme, dans
// l'ordre où on les rencontre — le patient le dit, tu le demandes, tu le
// présentes. Chaque étape porte le nom de sa phase d'examen en tag de marque
// (`.dim-tag`, celui des dimensions d'anamnèse — retour 3 oct. : plus
// d'icônes), le texte, et UNE ligne qui dit à quoi elle sert (elle remplace
// l'ancien libellé « Le patient dit », redondant avec le tag). Un fil pétrole
// relie les trois étapes. Sans registre : rien (la fiche n'affiche que la
// Bedeutung, D3).
// ============================================================================
import type { Fachbegriff } from '@/db/types';

export const USAGES = [
  { key: 'patient', tag: 'Patient', use: 'Reconnais le terme derrière ses mots.' },
  { key: 'anamnese', tag: 'Anamnese', use: "La question d'anamnèse, sans le Fachbegriff." },
  { key: 'vorstellung', tag: 'Vorstellung', use: 'Fallvorstellung ou Arztbrief : là, avec le Fachbegriff.' },
] as const;

/** Une phrase Fachsprache commence toujours par une majuscule (nom allemand) ; un
 *  fragment isolé commence en minuscule — ne pas l'entourer comme une citation. */
const looksLikeSentence = (s: string): boolean => /^[A-ZÄÖÜ]/.test(s.trim());

export function TermUsage({ term }: { term: Pick<Fachbegriff, 'register'> }) {
  const r = term.register;
  if (!r) return null;
  return (
    <section aria-labelledby="term-usage-title">
      <h4 id="term-usage-title" className="field-label mb-2.5">Dans l'entretien</h4>
      <ol className="relative space-y-3.5 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-brand-300/60 dark:before:bg-brand-700/60">
        {USAGES.map((u) => (
          <li key={u.key} data-usage={u.key} className="relative pl-6">
            <span aria-hidden className="absolute left-0 top-[7px] h-[11px] w-[11px] rounded-full border-2 border-brand-500 bg-white dark:bg-ink-800" />
            <span className="dim-tag">{u.tag}</span>
            <p className="mt-1.5 break-words text-[15px] leading-snug text-slate-800 dark:text-slate-100">{u.key === 'patient' ? (looksLikeSentence(r.patient) ? `« ${r.patient} »` : r.patient) : r[u.key]}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{u.use}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
