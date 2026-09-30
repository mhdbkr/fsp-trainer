// ============================================================================
// La frise de trajectoire — l'indice de préparation dans le temps, la date
// d'examen comme horizon, la projection « à ce rythme » (ADR-0020 §3).
//
// Ce qu'elle remplace : la heatmap de régularité. Une heatmap mesure la
// présence, pas la préparation — elle culpabilise, et ce qu'elle culpabilisait
// était faux (le drill ne comptait pas). Ici tout vient du journal : le drill
// compte, le travail hors plan aussi.
//
// La projection est tirée de la pente RÉELLE des derniers jours. Sans travail
// récent, il n'y a pas de projection : on n'invente pas une trajectoire.
// ============================================================================
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Case, ProgramConfig, TrainingEvent } from '@/db/types';
import { trajectory } from '@/lib/program/trajectory';
import { Icon } from '@/components/icons';

const W = 560;
const H = 120;
const PAD = 4;

export function TrajectoryStrip({ config, cases, events }: {
  config: ProgramConfig | null | undefined; cases: Case[]; events: TrainingEvent[];
}) {
  const t = trajectory(config ?? undefined, cases, events);
  const all = [...t.points, ...t.projection];
  if (all.length < 2) {
    return (
      <section className="card p-5">
        <Header examDate={t.examDate} indice={t.points[t.points.length - 1]?.indice ?? 0} projete={null} />
        <p className="mt-3 text-[13px] text-slate-500 dark:text-slate-400">
          La frise démarre à ta première séance. Rien n'est encore tracé — c'est normal, pas un retard.
        </p>
      </section>
    );
  }

  const x = (i: number) => PAD + (i / (all.length - 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - (v / 100) * (H - 2 * PAD);
  const path = (pts: { indice: number }[], offset: number) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i + offset).toFixed(1)} ${y(p.indice).toFixed(1)}`).join(' ');

  const last = t.points[t.points.length - 1];
  const joint = t.projection.length ? [last, ...t.projection] : [];

  return (
    <section className="card p-5">
      <Header examDate={t.examDate} indice={last.indice} projete={t.indiceProjete} />
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img"
        aria-label={`Indice de préparation : ${last.indice} %${t.indiceProjete !== null ? `, projeté à ${t.indiceProjete} % le jour de l'examen` : ''}`}>
        {/* Repères discrets — pas de grille, la ligne est la vedette. */}
        {[25, 50, 75].map((v) => (
          <line key={v} x1={PAD} x2={W - PAD} y1={y(v)} y2={y(v)} className="stroke-slate-200 dark:stroke-ink-700" strokeWidth={1} strokeDasharray="2 6" />
        ))}
        {/* Le fait : la trajectoire réelle. */}
        <path d={path(t.points, 0)} fill="none" className="stroke-brand-500" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {/* L'hypothèse : « à ce rythme », en pointillé — jamais confondue avec le fait. */}
        {joint.length > 1 && (
          <path d={path(joint, t.points.length - 1)} fill="none" className="stroke-brand-400" strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
        )}
        <circle cx={x(t.points.length - 1)} cy={y(last.indice)} r={4} className="fill-brand-600" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span>{format(parseISO(t.points[0].date), 'd MMM', { locale: fr })}</span>
        <span>aujourd'hui</span>
        {t.examDate && <span>examen · {format(parseISO(t.examDate), 'd MMM', { locale: fr })}</span>}
      </div>
    </section>
  );
}

function Header({ examDate, indice, projete }: { examDate: string | null; indice: number; projete: number | null }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Icon name="pulse" className="h-5 w-5 text-brand-500" />
          <h2 className="font-semibold">Trajectoire</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {examDate ? 'Ton indice de préparation, et où il mène à ce rythme.' : 'Ton indice de préparation dans le temps.'}
        </p>
      </div>
      <div className="flex items-end gap-5">
        <div>
          <div className="text-2xl font-bold tnum leading-none">{indice} %</div>
          <div className="mt-1 text-[10px] text-slate-400">aujourd'hui</div>
        </div>
        {projete !== null && (
          <div>
            <div className="text-2xl font-bold tnum leading-none text-brand-500">{projete} %</div>
            <div className="mt-1 text-[10px] text-slate-400">à ce rythme, le jour J</div>
          </div>
        )}
      </div>
    </div>
  );
}
