import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db/db';
import { getPending, setPending, AI_TARGETS } from '@/lib/externalAi/targets';
import { PartEvaluation } from './PartEvaluation';
import { saveSimulation } from '@/lib/simulationSave';
import type { Case, PartResult } from '@/db/types';

// Carte de retour après une simulation avec une IA externe : la séance ne
// compte que si le candidat s'auto-évalue (même grille que le runner).
// N'apparaît que si une trace récente (< 12 h) existe (lib/externalAi/targets).
// useLiveQuery sur `p` : se met à jour dès que la trace (meta) est posée ou
// effacée. Le cas lié est chargé une fois par trace (pas de liveQuery sur
// `cases` ici : la sauvegarde écrit aussi dans `cases`, une lecture réactive
// sur cette même table ferait la course avec l'écriture qui efface la trace).
export function PendingExternalSimCard({ onlyCaseId }: { onlyCaseId?: string } = {}) {
  const [step, setStep] = useState<'idle' | 'anamnese' | 'fallvorstellung'>('idle');
  const [parts, setParts] = useState<Partial<Record<'anamnese' | 'fallvorstellung', PartResult>>>({});
  const [c, setC] = useState<Case | null>(null);

  const p = useLiveQuery(async () => {
    const x = await getPending();
    if (!x || Date.now() - x.at > 12 * 3600_000 || (onlyCaseId && x.caseId !== onlyCaseId)) return null;
    return x;
  }, [onlyCaseId], null);

  useEffect(() => {
    if (!p) { setC(null); return; }
    let alive = true;
    void db.cases.get(p.caseId).then((x) => { if (alive) setC(x ?? null); });
    return () => { alive = false; };
  }, [p?.caseId]);

  if (!p || !c) return null;

  const target = AI_TARGETS.find((t) => t.id === p.targetId)?.label ?? p.targetId;
  const dismiss = async () => { await setPending(null); };
  const finish = async (all: typeof parts) => {
    await saveSimulation({
      c, parts: all, assistance: 'autonome', layer: (c.layerProgress ?? 1) as never,
      mode: 'external-ai', externalTarget: p.targetId, scope: 'full',
    });
    await setPending(null);
    setStep('idle');
    setParts({});
  };

  if (step !== 'idle') {
    return (
      <PartEvaluation
        part={step}
        durationSec={0}
        onCancel={() => setStep('idle')}
        onSave={(r) => {
          const next = { ...parts, [step]: r };
          setParts(next);
          if (step === 'anamnese' && p.scope !== 'anamnese') setStep('fallvorstellung');
          else finish(next).catch((e) => console.error('[external-ai]', e));
        }}
      />
    );
  }

  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <div className="label">Simulation avec ton IA</div>
        <p className="font-semibold">
          Tu as simulé <Link to={`/cas/${c.id}`} className="text-brand-600">{c.name}</Link> avec {target} — comment ça s'est passé ?
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setStep('anamnese')} className="btn-primary">Évaluer</button>
        <button type="button" onClick={dismiss} className="btn-ghost text-sm">Ce n'était pas une simulation</button>
      </div>
    </section>
  );
}
