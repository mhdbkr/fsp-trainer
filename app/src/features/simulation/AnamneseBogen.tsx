import type { AssistanceMode, BogenNotes, MusterCity } from '@/db/types';
import { MUSTER_BOGEN, type BogenField } from '@/data/guides/musterBogen';
import { Icon } from '@/components/icons';

// ============================================================================
// Anamnese-Bogen — Notizen refondus reproduisant le Muster de la ville choisie
// (header + boxes + split), au lieu d'un champ texte plat. Assisté : les
// questions-guides apparaissent en placeholder ; Autonome : épuré (« en tête »).
// Se rapproche du vrai document du jour d'examen.
// ============================================================================

export function AnamneseBogen({ muster, notes, onChange, assistance }: {
  muster: MusterCity; notes: BogenNotes; onChange: (n: BogenNotes) => void; assistance: AssistanceMode;
}) {
  const spec = MUSTER_BOGEN[muster];
  const set = (key: string, val: string) => onChange({ ...notes, [key]: val });
  const showHints = assistance === 'assiste';

  return (
    <div className="rounded-xl border-2 border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      {/* En-tête « officiel » */}
      <div className="mb-3 flex items-center justify-between border-b-2 border-slate-800 pb-2 dark:border-slate-300">
        <div>
          <div className="text-sm font-bold uppercase tracking-wide">{spec.title}</div>
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
      <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[11px] text-slate-400 dark:border-slate-700 dark:bg-slate-800/40">
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
        <input value={notes[field.key] ?? ''} onChange={(e) => set(field.key, e.target.value)}
          placeholder={showHints ? field.hint : ''}
          className="mt-1 w-full rounded-md border-b border-slate-300 bg-transparent px-1 py-1 text-sm outline-none focus:border-brand-400 dark:border-slate-600" />
      </div>
    );
  }
  if (field.kind === 'split' && field.subFields) {
    return (
      <div>
        <FieldLabel field={field} />
        <div className="mt-1 grid grid-cols-2 gap-2">
          {field.subFields.map((sf) => (
            <div key={sf.key} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
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
        className="mt-1 w-full resize-y rounded-md border border-slate-200 bg-transparent px-2 py-1.5 text-[13px] outline-none focus:border-brand-400 dark:border-slate-700" />
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
