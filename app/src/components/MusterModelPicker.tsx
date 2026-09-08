import type { MusterCity } from '@/db/types';
import { MUSTER_BOGEN, type BogenField, type MusterBogenSpec } from '@/data/guides/musterBogen';
import { MUSTER_MODELS, STYLE_LABEL, modelForCity } from '@/data/guides/musterModels';
import { Icon } from '@/components/icons';

// ============================================================================
// Choix du Muster-Bogen par MODÈLE (forme), avec un aperçu schématique de la
// feuille GÉNÉRÉ depuis ses vrais champs — pas un dessin à la main, donc
// toujours fidèle. Au survol ou à la sélection, les « lignes d'écriture » se
// tracent : on voit d'un coup d'œil ce qu'on écrira (puces, phrases, libre) et
// combien de rubriques la feuille comporte. Les villes qui utilisent la forme
// sont listées en petit ; en cliquer une applique sa feuille exacte.
// ============================================================================

export function MusterModelPicker({ value, onChange }: { value: MusterCity; onChange: (c: MusterCity) => void }) {
  const current = modelForCity(value);
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {MUSTER_MODELS.map((m) => {
          const active = m.id === current.id;
          const spec = MUSTER_BOGEN[m.cities.includes(value) ? value : m.primary];
          return (
            <button key={m.id} type="button" onClick={() => onChange(m.cities.includes(value) ? value : m.primary)}
              data-active={active} aria-pressed={active}
              className={`mm-card group flex flex-col gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,box-shadow,transform] duration-300 ease-fluid ${
                active ? 'border-brand-400 bg-brand-50/50 shadow-md ring-2 ring-brand-400/40 dark:border-brand-600 dark:bg-brand-900/15'
                       : 'border-slate-200 bg-white/60 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-ink-600 dark:bg-ink-800/50 dark:hover:border-brand-700'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-display text-[15px] font-semibold tracking-tightish">{m.name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="chip bg-slate-100 py-0 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{m.scope === 'komplett' ? `${spec.fields.length} rubriques` : `${spec.fields.length} rubriques + Bericht`}</span>
                    <span className={`chip py-0 text-[10px] ${m.style === 'ganze-saetze' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : m.style === 'frei' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>{STYLE_LABEL[m.style]}</span>
                  </div>
                </div>
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}>
                  <Icon name="check" className="h-3 w-3" />
                </span>
              </div>

              <SheetSketch spec={spec} />

              <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{m.blurb}</p>

              <div className="mt-auto flex flex-wrap items-center gap-1">
                <span className="label mr-1">{m.cities.length > 1 ? 'Villes' : 'Ville'}</span>
                {m.cities.map((c) => (
                  <CityChip key={c} city={c} selected={active && value === c} onPick={() => onChange(c)} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">{MUSTER_BOGEN[value].instruction} · Bericht : <span className="font-medium text-slate-500 dark:text-slate-300">{MUSTER_BOGEN[value].berichtLabel}</span></p>
    </div>
  );
}

/** Un chip de ville est un bouton DANS un bouton (la carte) : on stoppe la
 *  propagation pour que choisir une ville n'applique pas la ville primaire. */
function CityChip({ city, selected, onPick }: { city: MusterCity; selected: boolean; onPick: () => void }) {
  return (
    <span role="button" tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onPick(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onPick(); } }}
      className={`chip cursor-pointer py-0 text-[10.5px] transition-colors ${selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-brand-100 hover:text-brand-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-900/40'}`}>
      {city === 'Standard' ? 'ODAK' : city}
    </span>
  );
}

// ── Croquis de la feuille ────────────────────────────────────────────────────
// Chaque rubrique réelle devient une boîte ; à l'intérieur, des « lignes
// d'écriture » dont la forme dit le style : puces courtes (Stichpunkte),
// lignes longues et régulières (ganze Sätze), traits épars (frei).

function SheetSketch({ spec }: { spec: MusterBogenSpec }) {
  let i = 0;
  return (
    <div aria-hidden className="mm-sheet rounded-lg border border-slate-200/90 bg-white p-2 shadow-inner dark:border-ink-600 dark:bg-ink-900/60">
      <div className="mb-1.5 flex items-center gap-1 border-b-2 border-slate-800 pb-1 dark:border-slate-300">
        {['w-9', 'w-6', 'w-4', 'w-5'].map((w, k) => <span key={k} className={`h-1.5 rounded-sm bg-slate-300 dark:bg-slate-600 ${w}`} />)}
      </div>
      <div className={`grid gap-1 ${spec.fields.length >= 8 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {spec.fields.filter((f) => f.kind !== 'header').map((f) => (
          <FieldBox key={f.key} field={f} style={spec.style} start={(i += f.kind === 'split' ? 2 : 1)} />
        ))}
      </div>
    </div>
  );
}

function FieldBox({ field, style, start }: { field: BogenField; style: MusterBogenSpec['style']; start: number }) {
  const cells = field.kind === 'split' ? (field.subFields ?? [{ key: 'a', label: '' }, { key: 'b', label: '' }]) : [field];
  return (
    <div className={`flex gap-1 ${field.kind === 'split' ? '' : ''}`}>
      {cells.map((c, k) => (
        <div key={c.key} className="flex min-w-0 flex-1 gap-1 rounded-md border border-slate-200 px-1.5 py-1 dark:border-ink-600">
          {k === 0 && <Icon name={field.icon} className="mt-px h-2.5 w-2.5 shrink-0 text-brand-500/80" />}
          <div className="flex min-w-0 flex-1 flex-col gap-[3px] pt-px">
            <Lines style={style} seed={start + k} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Lines({ style, seed }: { style: MusterBogenSpec['style']; seed: number }) {
  // Largeurs pseudo-aléatoires mais stables (même croquis à chaque rendu).
  const w = (n: number) => 45 + ((seed * 37 + n * 53) % 50);
  if (style === 'ganze-saetze') {
    return <>{[0, 1, 2].map((n) => <span key={n} className="bl h-[3px] rounded-full bg-amber-400/70" style={{ width: `${n === 2 ? w(n) : 96}%`, ['--i' as string]: n }} />)}</>;
  }
  if (style === 'frei') {
    return <>{[0, 1].map((n) => <span key={n} className="bl h-[3px] rounded-full bg-violet-400/60" style={{ width: `${w(n) - 15}%`, ['--i' as string]: n }} />)}</>;
  }
  return <>{[0, 1].map((n) => (
    <span key={n} className="flex items-center gap-1">
      <span className="h-1 w-1 shrink-0 rounded-full bg-brand-400" />
      <span className="bl h-[3px] rounded-full bg-brand-400/70" style={{ width: `${w(n) - 20}%`, ['--i' as string]: n }} />
    </span>
  ))}</>;
}
