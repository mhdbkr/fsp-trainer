import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons';
import {
  format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { PlanEntry } from '@/db/types';

// Calendrier avec bascule vue semaine / vue mois.
export function WeekCalendar({ plan }: { plan: PlanEntry[] }) {
  const [view, setView] = useState<'week' | 'month'>('week');
  const byDate = new Map<string, PlanEntry[]>();
  for (const p of plan) {
    const arr = byDate.get(p.date) ?? [];
    arr.push(p);
    byDate.set(p.date, arr);
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Calendrier</h3>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <button onClick={() => setView('week')} className={`rounded px-2 py-1 ${view === 'week' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Semaine</button>
          <button onClick={() => setView('month')} className={`rounded px-2 py-1 ${view === 'month' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Mois</button>
        </div>
      </div>
      {view === 'week' ? <WeekView byDate={byDate} /> : <MonthView byDate={byDate} />}
    </section>
  );
}

function DayEntries({ entries }: { entries: PlanEntry[] }) {
  return (
    <div className="mt-1 space-y-0.5">
      {entries.map((e) => (
        <Link
          key={e.id}
          to={e.caseId ? `/simulation/${e.caseId}/pre` : '/fachbegriffe/drill'}
          className="block truncate rounded bg-brand-100 px-1 py-0.5 text-[10px] text-brand-700 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-200"
          title={e.label}
        >
          <Icon name={e.kind === 'drill' ? 'nav-abc' : 'nav-sim'} className="inline-block h-3.5 w-3.5 align-[-2px]" /> {e.label}
        </Link>
      ))}
    </div>
  );
}

function WeekView({ byDate }: { byDate: Map<string, PlanEntry[]> }) {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const today = isSameDay(d, new Date());
        return (
          <div key={key} className={`min-h-[70px] rounded-lg border p-1.5 ${today ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="text-[10px] font-medium uppercase text-slate-400">{format(d, 'EEE', { locale: fr })}</div>
            <div className={`text-sm font-bold ${today ? 'text-brand-600 dark:text-brand-300' : ''}`}>{format(d, 'd')}</div>
            <DayEntries entries={byDate.get(key) ?? []} />
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ byDate }: { byDate: Map<string, PlanEntry[]> }) {
  const monthStart = startOfMonth(new Date());
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: gridStart, end: addDays(startOfWeek(gridEnd, { weekStartsOn: 1 }), 6) });
  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-slate-400">
        {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const key = format(d, 'yyyy-MM-dd');
          const today = isSameDay(d, new Date());
          const inMonth = isSameMonth(d, monthStart);
          const entries = byDate.get(key) ?? [];
          return (
            <div key={key} className={`min-h-[40px] rounded border p-1 text-right ${today ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-100 dark:border-slate-800/60'} ${inMonth ? '' : 'opacity-40'}`}>
              <span className="text-[11px]">{format(d, 'd')}</span>
              {entries.length > 0 && <div className="mt-0.5 flex justify-end"><span className="h-1.5 w-1.5 rounded-full bg-brand-500" /></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
