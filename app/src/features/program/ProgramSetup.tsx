import { useState } from 'react';
import { format } from 'date-fns';
import { setMeta } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { AXES, type Axis, type Intensity, type ProgramConfig, type Specialty } from '@/db/types';
import { Icon, SpecialtyIcon } from '@/components/icons';
import { Portal } from '@/components/Portal';

// ============================================================================
// Onboarding du Programme de révision — dialogue illustré collectant les
// variables (durée, intensité, volume/session, jours off, systèmes prioritaires,
// niveau auto-évalué par axe). Sauvegarde dans meta('program').
// ============================================================================

const SPECIALTIES: Specialty[] = ['Kardiologie', 'Pneumologie', 'Gastroenterologie', 'Neurologie', 'Orthopädie', 'Nephrologie', 'Endokrinologie', 'Psychiatrie', 'Infektiologie'];
const WEEKDAYS = [{ i: 1, l: 'Lu' }, { i: 2, l: 'Ma' }, { i: 3, l: 'Me' }, { i: 4, l: 'Je' }, { i: 5, l: 'Ve' }, { i: 6, l: 'Sa' }, { i: 0, l: 'Di' }];

const INTENSITIES: { v: Intensity; l: string; d: string; icon: string }[] = [
  { v: 'leicht', l: 'Léger', d: 'rythme doux', icon: 'leaf' },
  { v: 'mittel', l: 'Moyen', d: 'équilibré', icon: 'bolt' },
  { v: 'intensiv', l: 'Intensif', d: 'sprint examen', icon: 'flame' },
];

export function ProgramSetup({ onDone, onCancel, initial }: { onDone: () => void; onCancel?: () => void; initial?: ProgramConfig | null }) {
  // Hydratation depuis la config existante (mode « Ajuster ») — sinon valeurs de
  // départ. Sans cela, ouvrir « Ajuster » réafficherait toujours les défauts et
  // « Générer » écraserait la config choisie.
  const [mode, setMode] = useState<'exam' | 'weeks'>(initial?.examDate ? 'exam' : 'weeks');
  const [examDate, setExamDate] = useState(initial?.examDate ?? '');
  const [weeks, setWeeks] = useState(initial?.weeks ?? 8);
  const [intensity, setIntensity] = useState<Intensity>(initial?.intensity ?? 'mittel');
  const [strategy, setStrategy] = useState<NonNullable<ProgramConfig['strategy']>>(initial?.strategy ?? 'teil-first');
  const [hours, setHours] = useState(initial?.hoursPerSession ?? 2);
  const [offDays, setOffDays] = useState<number[]>(initial?.offDays ?? [0]);
  const [priority, setPriority] = useState<Specialty[]>(initial?.prioritySpecialties ?? []);
  const [selfLevel, setSelfLevel] = useState<Partial<Record<Axis, number>>>(
    initial?.selfLevel ?? Object.fromEntries(AXES.map((a) => [a, 40])),
  );

  const toggleOff = (i: number) => setOffDays((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const togglePrio = (sp: Specialty) => setPriority((s) => (s.includes(sp) ? s.filter((x) => x !== sp) : [...s, sp]));

  const save = async () => {
    const config: ProgramConfig = {
      // On CONSERVE l'ancrage temporel et les ajustements manuels lors d'un ajustement :
      // changer l'intensité ou les jours off ne doit pas effacer les tâches faites/reports.
      startDate: initial?.startDate ?? format(new Date(), 'yyyy-MM-dd'),
      examDate: mode === 'exam' && examDate ? examDate : undefined,
      weeks: mode === 'weeks' ? weeks : undefined,
      intensity, hoursPerSession: hours, offDays, prioritySpecialties: priority,
      selfLevel, createdAt: initial?.createdAt ?? Date.now(),
      adjust: initial?.adjust,
      strategy,
    };
    await setMeta('program', config);
    await syncQueue.push({ type: 'program.configured', subject_id: null, payload: config });
    onDone();
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={initial ? 'Ajuster le programme' : 'Créer le programme'}>
      {/* Dialog structuré : en-tête compact / corps scrollable en grille / pied fixe.
          → proportions maîtrisées quelle que soit la hauteur d'écran. */}
      <div className="reveal flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-ink-600 dark:bg-ink-800">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-ink-600">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon name={initial ? 'gear' : 'nav-calendar'} className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold tracking-tightish">{initial ? 'Ajuste ton programme' : 'Crée ton programme de révision'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{initial ? 'Tes tâches faites, reports et révisions ajoutées sont conservés.' : "Il s'adapte ensuite à tes performances et à ton assiduité."}</p>
          </div>
          {onCancel && <button onClick={onCancel} className="btn-ghost -mr-1 px-2 text-lg" title="Fermer">✕</button>}
        </div>

        <div className="grid flex-1 content-start gap-x-6 gap-y-5 overflow-y-auto p-5 sm:grid-cols-2">
          {/* Durée */}
          <Field label="Durée de préparation">
            <div className="flex gap-2">
              <button onClick={() => setMode('weeks')} className={`btn flex-1 justify-center text-sm ${mode === 'weeks' ? 'bg-brand-600 text-white' : 'btn-outline'}`}>En semaines</button>
              <button onClick={() => setMode('exam')} className={`btn flex-1 justify-center text-sm ${mode === 'exam' ? 'bg-brand-600 text-white' : 'btn-outline'}`}>Date d'examen</button>
            </div>
            {mode === 'weeks' ? (
              <div className="mt-2">
                <input type="range" min={2} max={24} value={weeks} onChange={(e) => setWeeks(+e.target.value)} className="w-full accent-brand-600" />
                <div className="text-center font-mono text-sm font-semibold tnum">{weeks} semaines</div>
              </div>
            ) : (
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="input mt-2" />
            )}
          </Field>

          {/* Intensité — compacte (le détail passe en tooltip) */}
          <Field label="Intensité">
            <div className="grid grid-cols-3 gap-1.5">
              {INTENSITIES.map((it) => (
                <button key={it.v} onClick={() => setIntensity(it.v)} title={it.d}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 transition-colors ${intensity === it.v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-ink-600'}`}>
                  <Icon name={it.icon} className="h-5 w-5" />
                  <span className="text-xs font-semibold">{it.l}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Courbe d'apprentissage (FB2-P) : par parties d'abord, ou directement en complète.
              Le plan se recalcule à chaque session : ce choix fixe l'ordre, pas le rythme. */}
          <Field label="Courbe d'apprentissage">
            <div className="grid grid-cols-2 gap-1.5">
              {([
                { v: 'teil-first', l: 'Par parties, puis complète', d: 'Anamnese seule → Dokumentation seule → Fallvorstellung seule, puis les simulations complètes. Chaque partie acquise (≥ 60 %) fait passer à la suivante.', icon: 'branch' },
                { v: 'full', l: 'Complète d’emblée', d: 'Simulations complètes dès la première couche ; les parties seules restent possibles à tout moment et comptent.', icon: 'play' },
              ] as const).map((it) => (
                <button key={it.v} type="button" onClick={() => setStrategy(it.v)} title={it.d} aria-pressed={strategy === it.v}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition-colors ${strategy === it.v ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300'}`}>
                  <Icon name={it.icon} className="h-5 w-5" />
                  <span className="text-xs font-semibold">{it.l}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500">Toute session — complète ou par partie — fait avancer le cas au prorata de ses trois parties et remet le plan à jour.</p>
          </Field>

          {/* Volume */}
          <Field label={`Volume par session : ${hours} h`}>
            <input type="range" min={0.5} max={6} step={0.5} value={hours} onChange={(e) => setHours(+e.target.value)} className="w-full accent-brand-600" />
          </Field>

          {/* Jours off */}
          <Field label="Jours off">
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((d) => (
                <button key={d.i} onClick={() => toggleOff(d.i)}
                  className={`h-8 w-9 rounded-lg text-xs font-medium transition-colors ${offDays.includes(d.i) ? 'bg-slate-300 text-slate-600 dark:bg-slate-700' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
                  {d.l}
                </button>
              ))}
            </div>
          </Field>

          {/* Systèmes prioritaires */}
          <div className="sm:col-span-2">
            <Field label="Systèmes prioritaires (tes faiblesses ressenties)">
              <div className="flex flex-wrap gap-1.5">
                {SPECIALTIES.map((sp) => (
                  <button key={sp} onClick={() => togglePrio(sp)}
                    className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors ${priority.includes(sp) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
                    <SpecialtyIcon specialty={sp} className="h-3.5 w-3.5" />{sp}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Niveau auto-évalué par axe — 2 colonnes pour rester compact */}
          <div className="sm:col-span-2">
            <Field label="Ton niveau de départ par axe">
              <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {AXES.map((a) => (
                  <div key={a} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">{a}</span>
                    <input type="range" min={0} max={100} value={selfLevel[a] ?? 40}
                      onChange={(e) => setSelfLevel((s) => ({ ...s, [a]: +e.target.value }))} className="flex-1 accent-brand-600" />
                    <span className="w-8 text-right font-mono text-xs font-semibold tnum">{selfLevel[a] ?? 40}</span>
                  </div>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-ink-600">
          {onCancel && <button onClick={onCancel} className="btn-ghost">Annuler</button>}
          <button onClick={save} className="btn-primary gap-1.5 px-6"><Icon name="spark" className="h-4 w-4" />{initial ? 'Enregistrer les changements' : 'Générer mon programme'}</button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  );
}
