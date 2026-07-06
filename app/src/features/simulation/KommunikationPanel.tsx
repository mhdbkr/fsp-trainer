import { useState } from 'react';
import { getSituations } from '@/data/guides/kommunikativeStrategien';
import { Icon } from '@/components/icons';

// Kommunikative Strategien en simulation : le partenaire déclenche une réplique
// difficile ; le candidat doit réagir. Les parades restent cachées (drill),
// révélables si besoin.
export function KommunikationPanel({ situationIds }: { situationIds?: string[] }) {
  const situations = getSituations(situationIds);
  if (!situations.length) return null;

  return (
    <div className="card border-rose-200 p-4 dark:border-rose-900/50">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
          <Icon name="alert" className="h-4 w-4" />
        </span>
        <div className="label !text-rose-500">Schwieriger Patient — répliques déclenchables</div>
      </div>
      <div className="space-y-2">
        {situations.map((s) => <SituationCard key={s.id} title={s.title} icon={s.icon} cue={s.cue} parades={s.parades} />)}
      </div>
    </div>
  );
}

function SituationCard({ title, icon, cue, parades }: { title: string; icon: string; cue: string; parades: string[] }) {
  const [showParade, setShowParade] = useState(false);
  return (
    <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="h-4 w-4 text-rose-500" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="mt-1 rounded bg-rose-50 px-2 py-1 text-[13px] italic text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">{cue}</p>
      {showParade ? (
        <ul className="mt-1.5 space-y-1 text-[13px]">
          {parades.map((p, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500">✓</span>{p}</li>)}
        </ul>
      ) : (
        <button onClick={() => setShowParade(true)} className="mt-1.5 text-[11px] font-medium text-brand-500 hover:underline">Voir les parades →</button>
      )}
    </div>
  );
}
