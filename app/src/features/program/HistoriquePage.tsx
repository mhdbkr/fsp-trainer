// ============================================================================
// Historique — la frise inversée de ce qui a été fait. ADR-0020 §6.
//
// L'audit §7 : aucune route d'historique n'existait, alors que
// `db.progress_events` contenait de quoi le reconstruire. Cette page n'a AUCUN
// calcul propre : elle lit le journal. Tout y entre — plan et libre, drill
// compris — parce que tout exercice écrit exactement un événement.
//
// Le total est HONNÊTE : il compte les minutes mesurées, jamais les minutes
// estimées d'une tâche.
// ============================================================================
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCases, useProgramConfig } from '@/hooks/useData';
import { useTrainingEvents } from './useProgram';
import type { SimTeil, Specialty, TrainingEvent, TrainingKind, TrainingSource } from '@/db/types';
import { spentByDay, workedDayKeys } from '@/lib/journal';
import { streakFromDays } from '@/lib/stats';
import { TEILE } from '@/lib/simScope';
import { dayKey, nowDate } from '@/lib/clock';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui';
import { TASK_META } from './TaskLine';

const KIND_META: Record<TrainingKind, { icon: string; badge: string; label: string }> = {
  simulation: TASK_META.simulation,
  drill: TASK_META.drill,
  fiche: TASK_META.fachwissen,
  aufklaerung: TASK_META.aufklaerung,
  'examen-blanc': TASK_META['examen-blanc'],
};

const hhmm = (min: number) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

export function HistoriquePage() {
  const cases = useCases();
  const config = useProgramConfig();
  const events = useTrainingEvents();
  const [teil, setTeil] = useState<SimTeil | 'tous'>('tous');
  const [specialty, setSpecialty] = useState<Specialty | 'toutes'>('toutes');
  const [source, setSource] = useState<TrainingSource | 'toutes'>('toutes');

  const byCase = useMemo(() => new Map((cases ?? []).map((c) => [c.id, c])), [cases]);
  const specialties = useMemo(
    () => [...new Set((events ?? []).map((e) => (e.caseId ? byCase.get(e.caseId)?.specialty : undefined)).filter(Boolean) as Specialty[])].sort(),
    [events, byCase],
  );

  const filtered = useMemo(() => (events ?? []).filter((e) => {
    if (teil !== 'tous' && !e.teile.includes(teil)) return false;
    if (source !== 'toutes' && e.source !== source) return false;
    if (specialty !== 'toutes' && (!e.caseId || byCase.get(e.caseId)?.specialty !== specialty)) return false;
    return true;
  }).sort((a, b) => b.at - a.at), [events, teil, specialty, source, byCase]);

  if (!cases || !events) return <div className="text-slate-400">Chargement…</div>;

  const totalMin = filtered.reduce((s, e) => s + Math.max(0, e.spentMin), 0);
  const jours = workedDayKeys(filtered);
  const streak = streakFromDays(workedDayKeys(events), nowDate(), config?.offDays ?? []);

  // Regroupement par jour — la frise se lit du plus récent au plus ancien.
  const groups: { date: string; events: TrainingEvent[]; min: number }[] = [];
  const spent = spentByDay(filtered);
  for (const e of filtered) {
    const d = dayKey(e.at);
    const last = groups[groups.length - 1];
    if (last && last.date === d) last.events.push(e);
    else groups.push({ date: d, events: [e], min: spent.get(d) ?? 0 });
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Journal d'entraînement</div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tightish">Historique</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Tout ce que tu as fait, du plan ou libre — simulations, drill, fiches lues, Aufklärungen, tâches cochées. Rien n'est arrondi.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <Total icon="check" label="Exercices" value={`${filtered.length}`} />
        <Total icon="clock" label="Temps mesuré" value={hhmm(totalMin)} />
        <Total icon="nav-calendar" label="Jours travaillés" value={`${jours.size}`} />
        <Total icon="flame" label="Série en cours" value={`${streak} j`} />
      </div>

      <section className="card flex flex-wrap items-center gap-2 p-3">
        <Filter label="Partie" value={teil} onChange={setTeil}
          options={[['tous', 'Toutes'], ...TEILE.map((t) => [t.key, t.label] as [string, string])]} />
        <Filter label="Spécialité" value={specialty} onChange={setSpecialty}
          options={[['toutes', 'Toutes'], ...specialties.map((s) => [s, s] as [string, string])]} />
        <Filter label="Source" value={source} onChange={setSource}
          options={[['toutes', 'Toutes'], ['plan', 'Du plan'], ['libre', 'Libre']]} />
        {(teil !== 'tous' || specialty !== 'toutes' || source !== 'toutes') && (
          <button type="button" onClick={() => { setTeil('tous'); setSpecialty('toutes'); setSource('toutes'); }}
            className="btn-ghost px-2 py-1 text-xs">Tout afficher</button>
        )}
      </section>

      {groups.length === 0 ? (
        <EmptyState icon="history" title="Rien à afficher pour l'instant"
          hint={events.length ? 'Aucun exercice ne correspond à ces filtres.' : 'Ta première séance ouvrira la frise.'} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.date}>
              <div className="mb-2 flex items-baseline gap-3">
                <h2 className="font-semibold capitalize">{format(parseISO(g.date), 'EEEE d MMMM yyyy', { locale: fr })}</h2>
                <span className="mono-tag tnum">{g.min} min</span>
              </div>
              <div className="space-y-2 border-l border-slate-200 pl-4 dark:border-slate-800">
                {g.events.map((e) => <EventRow key={e.id} e={e} name={e.caseId ? byCase.get(e.caseId)?.name : undefined} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ e, name }: { e: TrainingEvent; name?: string }) {
  const meta = KIND_META[e.kind];
  const teile = e.teile.map((t) => TEILE.find((x) => x.key === t)?.label).filter(Boolean);
  const body = (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.badge}`} title={meta.label}>
        <Icon name={meta.icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name ?? meta.label}</div>
        <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
          <span>{format(new Date(e.at), 'HH:mm')}</span>
          {teile.length > 0 && <span>· {teile.join(', ')}</span>}
          {e.source === 'libre' && <span>· hors plan</span>}
          {e.selbstbewertet && <span title="Score déclaré par toi, pas mesuré par l'app">· auto-évaluée</span>}
        </div>
      </div>
      {e.scores && Object.entries(e.scores).map(([t, s]) => (
        <span key={t} className="mono-tag tnum shrink-0" title={TEILE.find((x) => x.key === t)?.label}>{s} %</span>
      ))}
      <span className="mono-tag tnum shrink-0">{e.spentMin} min</span>
    </div>
  );
  return e.caseId ? <Link to={`/cas/${e.caseId}`} className="block transition-colors hover:opacity-90">{body}</Link> : body;
}

function Total({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="label flex items-center gap-1.5"><Icon name={icon} className="h-3.5 w-3.5 text-brand-500" />{label}</div>
      <div className="mt-1.5 text-2xl font-bold tnum">{value}</div>
    </div>
  );
}

function Filter<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: [string, string][];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="label">{label}</span>
      <select value={value} onChange={(ev) => onChange(ev.target.value as T)}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
