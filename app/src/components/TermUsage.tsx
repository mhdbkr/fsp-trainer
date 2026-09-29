// ============================================================================
// « Dans l'entretien » (F4a D2) : les trois usages d'un terme, dans l'ordre où
// on les rencontre — le patient le dit, tu le demandes, tu le présentes. Chaque
// ligne porte son icône maison, son libellé, le texte, et UNE ligne qui dit à
// quoi elle sert. Sans registre : rien (la fiche n'affiche que la Bedeutung, D3).
// ============================================================================
import type { Fachbegriff } from '@/db/types';
import { Icon } from './icons';

export const USAGES = [
  { key: 'patient', icon: 'say-patient', label: 'Le patient dit', use: 'Reconnais le terme derrière ses mots.' },
  { key: 'anamnese', icon: 'say-ask', label: 'Tu demandes', use: "La question d'anamnèse, sans le Fachbegriff." },
  { key: 'vorstellung', icon: 'say-present', label: 'Tu présentes', use: "La phrase pour la Vorstellung ou l'Arztbrief." },
] as const;

export function TermUsage({ term }: { term: Pick<Fachbegriff, 'register'> }) {
  const r = term.register;
  if (!r) return null;
  return (
    <section aria-labelledby="term-usage-title">
      <h4 id="term-usage-title" className="label mb-2">Dans l'entretien</h4>
      <ol className="space-y-2">
        {USAGES.map((u) => (
          <li key={u.key} data-usage={u.key} className="flex gap-2.5 rounded-lg bg-slate-50 p-2.5 dark:bg-white/5">
            <Icon name={u.icon} className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" title={u.label} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{u.label}</div>
              <p className="break-words text-sm text-slate-800 dark:text-slate-100">{u.key === 'patient' ? `« ${r.patient} »` : r[u.key]}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{u.use}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
