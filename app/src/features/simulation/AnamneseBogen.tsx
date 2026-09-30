import type { AssistanceMode, BogenNotes, MusterCity } from '@/db/types';
import { MUSTER_BOGEN, type BogenField } from '@/data/guides/musterBogen';
import { Icon } from '@/components/icons';

// ============================================================================
// Anamnese-Bogen — le Muster de la ville choisie (header + boxes + split), au
// lieu d'un champ texte plat. Assisté : les questions-guides apparaissent en
// placeholder ; Autonome : épuré (« en tête »).
//
// C'est la surface la plus longuement regardée de l'app — une vingtaine de
// minutes par session — et c'était la plus éloignée de la charte : aucune
// primitive, aucun token, aucune transition, un `bg-white` en dur.
//
// La tension est réelle : ce document DOIT rester lisible comme la feuille du
// jour d'examen. On garde donc son dessin (double filet d'en-tête, champs à
// filet simple, zone Bericht en pointillés) et on passe sa MATIÈRE aux
// primitives du système : `.card` pour le support, `.input` pour les champs
// (déjà en verre, déjà focus-ring, déjà en mode sombre), `paper`/`ink` pour la
// teinte. Rien de neuf n'est créé — la charte dit de réutiliser avant d'ajouter.
// ============================================================================

export function AnamneseBogen({ muster, notes, onChange, assistance }: {
  muster: MusterCity; notes: BogenNotes; onChange: (n: BogenNotes) => void; assistance: AssistanceMode;
}) {
  const spec = MUSTER_BOGEN[muster];
  const set = (key: string, val: string) => onChange({ ...notes, [key]: val });
  const showHints = assistance === 'assiste';

  return (
    <div className="card bg-paper/70 p-4 dark:bg-ink-800/60">
      {/* En-tête « officiel » — le double filet est la signature du document
          papier : il reste, c'est lui qui dit « feuille d'examen ». */}
      <div className="mb-3 flex items-center justify-between border-b-2 border-ink-700/70 pb-2 dark:border-slate-300/60">
        <div>
          <div className="text-sm font-bold">{spec.title}</div>
          <div className="text-[11px] text-slate-400">{spec.instruction}</div>
        </div>
        <span className={`chip ${spec.style === 'ganze-saetze' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          {spec.style === 'ganze-saetze' ? 'ganze Sätze' : spec.style === 'frei' ? 'frei' : 'Stichpunkte'}
        </span>
      </div>

      <div className="space-y-3">
        {spec.fields.map((f) => (
          <BogenFieldView key={f.key} field={f} notes={notes} set={set} showHints={showHints} />
        ))}
      </div>

      {/* Zone Bericht (rédigée à la partie Doku) — rappel visuel */}
      <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-paper/50 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-700 dark:bg-ink-700/40">
        <Icon name="pen" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" /><b>{spec.berichtLabel}</b> — se rédige à la partie Dokumentation (jamais auto-généré).
      </div>
    </div>
  );
}

function BogenFieldView({ field, notes, set, showHints }: {
  field: BogenField; notes: BogenNotes; set: (k: string, v: string) => void; showHints: boolean;
}) {
  if (field.kind === 'header') {
    return (
      <div>
        <FieldLabel field={field} />
        {/* Ligne d'en-tête du Muster : un FILET, pas une boîte — c'est ce que
            fait le papier. `.input` fournit la matière, `rounded-none` +
            `border-x-0 border-t-0` rendent le trait. */}
        <input value={notes[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)}
          placeholder={showHints ? field.hint : ''}
          className="input mt-1 rounded-none rounded-t-md border-x-0 border-t-0 border-b-slate-300 px-1 py-1 dark:border-b-slate-600" />
      </div>
    );
  }
  if (field.kind === 'split' && field.subFields) {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="mt-1 grid grid-cols-2 gap-2">
          {field.subFields.map((sf) => (
            <div key={sf.key} className="rounded-md border border-slate-200/80 bg-white/40 p-2 motion-safe:transition-colors focus-within:border-brand-400 dark:border-slate-700 dark:bg-ink-700/30">
              <div className="text-[10px] font-medium text-slate-400">{sf.label}</div>
              <textarea value={notes[`${field.key}.${sf.key}`] ?? ''} onChange={(e) => set(`${field.key}.${sf.key}`, e.target.value)}
                rows={2} className="w-full resize-y bg-transparent text-[13px] outline-none" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  // box
  return (
    <div>
      <FieldLabel field={field} />
      <textarea value={notes[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)}
        placeholder={showHints ? field.hint : ''} rows={2}
        className="input mt-1 resize-y px-2 py-1.5 text-[13px]" />
    </div>
  );
}

function FieldLabel({ field }: { field: BogenField }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
      <Icon name={field.icon} className="h-4 w-4 text-brand-500" />
      {field.label}
    </div>
  );
}
