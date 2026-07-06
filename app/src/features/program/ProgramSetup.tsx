import { useState } from 'react';
import { format } from 'date-fns';
import { setMeta } from '@/db/db';
import { AXES, type Axis, type Intensity, type ProgramConfig, type Specialty } from '@/db/types';
import { SpecialtyIcon } from '@/components/icons';

// ============================================================================
// Onboarding du Programme de révision — dialogue illustré collectant les
// variables (durée, intensité, volume/session, jours off, systèmes prioritaires,
// niveau auto-évalué par axe). Sauvegarde dans meta('program').
// ============================================================================

const SPECIALTIES: Specialty[] = ['Kardiologie', 'Pneumologie', 'Gastroenterologie', 'Neurologie', 'Orthopädie', 'Nephrologie', 'Endokrinologie', 'Psychiatrie', 'Infektiologie'];
const WEEKDAYS = [{ i: 1, l: 'Lu' }, { i: 2, l: 'Ma' }, { i: 3, l: 'Me' }, { i: 4, l: 'Je' }, { i: 5, l: 'Ve' }, { i: 6, l: 'Sa' }, { i: 0, l: 'Di' }];

const INTENSITIES: { v: Intensity; l: string; d: string; icon: string }[] = [
  { v: 'leicht', l: 'Léger', d: 'rythme doux', icon: '🌱' },
  { v: 'mittel', l: 'Moyen', d: 'équilibré', icon: '⚡' },
  { v: 'intensiv', l: 'Intensif', d: 'sprint examen', icon: '🔥' },
];

export function ProgramSetup({ onDone, onCancel }: { onDone: () => void; onCancel?: () => void }) {
  const [mode, setMode] = useState<'exam' | 'weeks'>('weeks');
  const [examDate, setExamDate] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [intensity, setIntensity] = useState<Intensity>('mittel');
  const [hours, setHours] = useState(2);
  const [offDays, setOffDays] = useState<number[]>([0]);
  const [priority, setPriority] = useState<Specialty[]>([]);
  const [selfLevel, setSelfLevel] = useState<Partial<Record<Axis, number>>>(
    Object.fromEntries(AXES.map((a) => [a, 40])),
  );

  const toggleOff = (i: number) => setOffDays((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  const togglePrio = (sp: Specialty) => setPriority((s) => (s.includes(sp) ? s.filter((x) => x !== sp) : [...s, sp]));

  const save = async () => {
    const config: ProgramConfig = {
      startDate: format(new Date(), 'yyyy-MM-dd'),
      examDate: mode === 'exam' && examDate ? examDate : undefined,
      weeks: mode === 'weeks' ? weeks : undefined,
      intensity, hoursPerSession: hours, offDays, prioritySpecialties: priority,
      selfLevel, createdAt: Date.now(),
    };
    await setMeta('program', config);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
        <div className="text-center">
          <div className="text-3xl">🗓️</div>
          <h2 className="mt-1 text-xl font-bold">Crée ton programme de révision</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Il s'adapte ensuite à tes performances et à ton assiduité.</p>
        </div>

        <div className="mt-5 space-y-5">
          {/* Durée */}
          <Field label="Durée de préparation">
            <div className="flex gap-2">
              <button onClick={() => setMode('weeks')} className={`btn flex-1 justify-center text-sm ${mode === 'weeks' ? 'bg-brand-600 text-white' : 'btn-outline'}`}>En semaines</button>
              <button onClick={() => setMode('exam')} className={`btn flex-1 justify-center text-sm ${mode === 'exam' ? 'bg-brand-600 text-white' : 'btn-outline'}`}>Date d'examen</button>
            </div>
            {mode === 'weeks' ? (
              <div className="mt-2">
                <input type="range" min={2} max={24} value={weeks} onChange={(e) => setWeeks(+e.target.value)} className="w-full accent-brand-600" />
                <div className="text-center text-sm font-semibold">{weeks} semaines</div>
              </div>
            ) : (
              <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="input mt-2" />
            )}
          </Field>

          {/* Intensité */}
          <Field label="Intensité">
            <div className="grid grid-cols-3 gap-2">
              {INTENSITIES.map((it) => (
                <button key={it.v} onClick={() => setIntensity(it.v)}
                  className={`rounded-xl border p-3 text-center transition-colors ${intensity === it.v ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="text-xl">{it.icon}</div>
                  <div className="text-sm font-semibold">{it.l}</div>
                  <div className="text-[11px] text-slate-400">{it.d}</div>
                </button>
              ))}
            </div>
          </Field>

          {/* Volume + jours off */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Volume par session : ${hours} h`}>
              <input type="range" min={0.5} max={6} step={0.5} value={hours} onChange={(e) => setHours(+e.target.value)} className="w-full accent-brand-600" />
            </Field>
            <Field label="Jours off">
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((d) => (
                  <button key={d.i} onClick={() => toggleOff(d.i)}
                    className={`h-8 w-9 rounded-lg text-xs font-medium ${offDays.includes(d.i) ? 'bg-slate-300 text-slate-600 dark:bg-slate-700' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
                    {d.l}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Systèmes prioritaires */}
          <Field label="Systèmes prioritaires (tes faiblesses ressenties)">
            <div className="flex flex-wrap gap-1.5">
              {SPECIALTIES.map((sp) => (
                <button key={sp} onClick={() => togglePrio(sp)}
                  className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors ${priority.includes(sp) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  <SpecialtyIcon specialty={sp} className="h-3.5 w-3.5" />{sp}
                </button>
              ))}
            </div>
          </Field>

          {/* Niveau auto-évalué par axe */}
          <Field label="Ton niveau de départ par axe">
            <div className="space-y-2">
              {AXES.map((a) => (
                <div key={a} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400">{a}</span>
                  <input type="range" min={0} max={100} value={selfLevel[a] ?? 40}
                    onChange={(e) => setSelfLevel((s) => ({ ...s, [a]: +e.target.value }))} className="flex-1 accent-brand-600" />
                  <span className="w-8 text-right text-xs font-semibold">{selfLevel[a] ?? 40}</span>
                </div>
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {onCancel && <button onClick={onCancel} className="btn-ghost">Annuler</button>}
          <button onClick={save} className="btn-primary px-6">Générer mon programme ✨</button>
        </div>
      </div>
    </div>
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
