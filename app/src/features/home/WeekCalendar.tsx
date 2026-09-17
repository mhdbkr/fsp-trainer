import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Icon } from '@/components/icons';
import { generateProgram } from '@/lib/program';
import { loadDrillContext } from '@/lib/collections/drillContext';
import { addExtra } from '@/lib/programAdjust';
import { BLOCK_META, BlockRow, AddRevision } from '@/features/program/ProgramPage';
import type { Case, Fachbegriff, ProgramConfig, ProgramDay, Simulation } from '@/db/types';

// ============================================================================
// Calendrier d'accueil — PILOTÉ PAR LE PROGRAMME (plus de PlanEntry statique).
//  • semaines navigables : flèches ◀ ▶, molette/trackpad, retour Aujourd'hui ;
//  • tuiles-jour informatives : pastilles colorées par TYPE de tâche + compteur ;
//  • clic sur un jour → détail extensible avec les MÊMES actions que le module
//    Programme (lancer, fait, reporter, sauter le drill, ajouter, retirer).
// ============================================================================

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export function WeekCalendar({ config, cases, sims, begriffe }: {
  config: ProgramConfig | null; cases: Case[]; sims: Simulation[]; begriffe: Fachbegriff[];
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selected, setSelected] = useState<string>(iso(new Date()));
  const [adding, setAdding] = useState(false);
  const lastWheel = useRef(0);
  const [drillBudget, setDrillBudget] = useState<number | undefined>(undefined);
  useEffect(() => { loadDrillContext().then((ctx) => setDrillBudget(ctx.remaining)).catch(() => {}); }, []);

  const byDate = useMemo(() => {
    if (!config) return new Map<string, ProgramDay>();
    const days = generateProgram(config, { cases, sims, begriffe, drillBudget }, 42);
    return new Map(days.map((d) => [d.date, d]));
  }, [config, cases, sims, begriffe, drillBudget]);

  if (!config) {
    return (
      <section className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold"><Icon name="nav-calendar" className="h-[18px] w-[18px] text-brand-500" />Semaine</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Configure ton programme pour voir ta semaine planifiée ici.</p>
        <Link to="/programme" className="btn-primary mt-3 text-xs">Configurer mon programme →</Link>
      </section>
    );
  }

  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const shift = (days: number) => setWeekStart((w) => addDays(w, days));
  // Molette / trackpad → changer de semaine (throttlé, sans bloquer le scroll page).
  const onWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheel.current < 350) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12) return;
    lastWheel.current = now;
    shift(d > 0 ? 7 : -7);
  };

  const sel = byDate.get(selected);
  const selBlocks = sel?.blocks ?? [];

  return (
    <section className="card p-5" onWheel={onWheel}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold"><Icon name="nav-calendar" className="h-[18px] w-[18px] text-brand-500" />Semaine</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-7)} className="btn-ghost px-2 text-sm" title="Semaine précédente">◀</button>
          <span className="min-w-[8.5rem] text-center text-[11px] font-semibold text-slate-400">
            {format(weekStart, 'd MMM', { locale: fr })} – {format(addDays(weekStart, 6), 'd MMM', { locale: fr })}
          </span>
          <button onClick={() => shift(7)} className="btn-ghost px-2 text-sm" title="Semaine suivante">▶</button>
          <button onClick={() => { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })); setSelected(iso(new Date())); }} className="btn-ghost px-2 text-xs">Aujourd'hui</button>
        </div>
      </div>

      {/* Tuiles-jour : pastilles colorées par type + compteur */}
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const k = iso(d);
          const day = byDate.get(k);
          const today = isSameDay(d, new Date());
          const isSel = k === selected;
          const kinds = [...new Set((day?.blocks ?? []).map((b) => b.kind))];
          return (
            <button key={k} onClick={() => { setSelected(k); setAdding(false); }}
              className={`rounded-xl border p-1.5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-400 ${isSel ? 'border-brand-500 ring-1 ring-brand-400' : today ? 'border-brand-300 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-ink-600'}`}>
              <div className="text-[10px] font-medium text-slate-400">{format(d, 'EEE', { locale: fr })}</div>
              <div className={`font-mono text-sm font-bold tnum ${today ? 'text-brand-600 dark:text-brand-300' : ''}`}>{format(d, 'd')}</div>
              {day?.isOff ? (
                <div className="mt-1 text-[9px] text-slate-400">off</div>
              ) : (
                <div className="mt-1 flex min-h-[14px] items-center justify-center gap-0.5">
                  {kinds.slice(0, 3).map((kk) => <span key={kk} className={`h-1.5 w-1.5 rounded-full ${BLOCK_META[kk].bar}`} title={BLOCK_META[kk].label} />)}
                  {(day?.blocks.length ?? 0) > 0 && <span className="ml-0.5 text-[9px] tnum text-slate-400">{day!.blocks.length}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Détail du jour sélectionné — édition complète (mêmes actions que le Programme) */}
      <div key={selected} className="reveal mt-3 rounded-xl border border-slate-200 p-3 dark:border-ink-600">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-sm font-semibold capitalize">{format(parseISO(selected), 'EEEE d MMMM', { locale: fr })}</div>
          <span className="text-[10px] font-semibold text-slate-400">
            {sel?.isOff ? 'Jour off' : `${selBlocks.length} tâche${selBlocks.length > 1 ? 's' : ''} · ~${selBlocks.reduce((s, b) => s + b.estMin, 0)} min`}
          </span>
        </div>
        {selBlocks.length > 0 ? (
          <div className="space-y-2">{selBlocks.map((b, i) => <BlockRow key={b.id ?? i} b={b} date={selected} config={config} onPick={setSelected} />)}</div>
        ) : (
          <p className="py-3 text-center text-xs text-slate-400">{sel?.isOff ? 'Jour de repos programmé.' : 'Rien de prévu ce jour.'}</p>
        )}
        {adding ? (
          <AddRevision cases={cases} onAdd={(c) => {
            addExtra(config, { date: selected, kind: 'revision', label: `Révision : ${c.name}`, caseId: c.id, specialty: c.specialty, estMin: 20 });
            setAdding(false);
          }} onCancel={() => setAdding(false)} />
        ) : (
          <button onClick={() => setAdding(true)} className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-brand-300 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-900/10">
            <span className="text-sm leading-none">+</span> Ajouter une révision
          </button>
        )}
      </div>
    </section>
  );
}
