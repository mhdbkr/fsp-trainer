import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db/db';
import { getPending, setPending, AI_TARGETS } from '@/lib/externalAi/targets';
import { PartEvaluation } from './PartEvaluation';
import { saveSimulation } from '@/lib/simulationSave';
import type { Case, PartResult } from '@/db/types';

const SNOOZE_MS = 3600_000; // 1 h — « Pas maintenant » persiste dans la trace (snoozedUntil), pas en sessionStorage
// Les 3 durées proposées ; « 30 min+ » vaut 30 min comme les autres, le
// « + » n'est qu'un signal visuel qu'il n'y a pas de plafond au-delà.
const DURATIONS_MIN = [10, 20, 30] as const;
type DurationMin = typeof DURATIONS_MIN[number];
const DEFAULT_DURATION_MIN: DurationMin = 20;

// Carte de retour après une simulation avec une IA externe : la séance ne
// compte que si le candidat s'auto-évalue (même grille que le runner).
// N'apparaît que si une trace récente (< 12 h) existe (lib/externalAi/targets).
// useLiveQuery sur `p` : se met à jour dès que la trace (meta) est posée ou
// effacée. Le cas lié est chargé une fois par trace (pas de liveQuery sur
// `cases` ici : la sauvegarde écrit aussi dans `cases`, une lecture réactive
// sur cette même table ferait la course avec l'écriture qui efface la trace).
export function PendingExternalSimCard({ onlyCaseId }: { onlyCaseId?: string } = {}) {
  const [step, setStep] = useState<'idle' | 'anamnese' | 'fallvorstellung' | 'saving'>('idle');
  const [parts, setParts] = useState<Partial<Record<'anamnese' | 'fallvorstellung', PartResult>>>({});
  const [c, setC] = useState<Case | null>(null);
  const [durationMin, setDurationMin] = useState<DurationMin>(DEFAULT_DURATION_MIN);
  // Garde contre le double-submit : PartEvaluation peut rester montée le
  // temps d'un double-tap avant que `setStep('saving')` ne l'efface ; le ref
  // est synchrone (contrairement au state) et coupe court dès le second appel.
  const savingRef = useRef(false);

  const p = useLiveQuery(async () => {
    const x = await getPending();
    if (!x || Date.now() - x.at > 12 * 3600_000 || (onlyCaseId && x.caseId !== onlyCaseId)) return null;
    // Snooze persistant (« Pas maintenant ») : la trace reste posée (elle
    // expire toujours à 12 h), mais la carte reste masquée jusqu'à snoozedUntil.
    if (x.snoozedUntil && Date.now() < x.snoozedUntil) return null;
    return x;
  }, [onlyCaseId], null);
  const caseId = p?.caseId;

  useEffect(() => {
    if (!caseId) { setC(null); return; }
    let alive = true;
    void db.cases.get(caseId).then((x) => { if (alive) setC(x ?? null); });
    return () => { alive = false; };
  }, [caseId]);

  if (!p || !c) return null;

  const target = AI_TARGETS.find((t) => t.id === p.targetId)?.label ?? p.targetId;
  const dismiss = async () => { await setPending(null); };
  const snooze = async () => { await setPending({ ...p, snoozedUntil: Date.now() + SNOOZE_MS }); };
  const finish = async (all: typeof parts) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setStep('saving'); // synchrone, avant tout await : ferme l'évaluation immédiatement
    try {
      await saveSimulation({
        c, parts: all, assistance: 'autonome', layer: c.layerProgress ?? 1,
        mode: 'external-ai', externalTarget: p.targetId,
        scope: p.scope === 'anamnese' ? 'teil' : 'full',
        teil: p.scope === 'anamnese' ? 'anamnese' : undefined,
      });
      await setPending(null);
      setParts({});
    } finally {
      savingRef.current = false;
      setStep('idle');
    }
  };

  // Durée choisie répartie sur les parties jouées : anamnese seule = tout ;
  // exam (± feedback) = 2/3 anamnese, 1/3 fallvorstellung (arrondi), le
  // reste va à fallvorstellung pour que la somme reste exacte.
  const totalSec = durationMin * 60;
  const anamneseSec = p.scope === 'anamnese' ? totalSec : Math.round((totalSec * 2) / 3);
  const fallvorstellungSec = totalSec - anamneseSec;

  if (step === 'anamnese' || step === 'fallvorstellung') {
    return (
      <PartEvaluation
        part={step}
        durationSec={step === 'anamnese' ? anamneseSec : fallvorstellungSec}
        onCancel={() => setStep('idle')}
        onSave={(r) => {
          if (savingRef.current) return; // double-tap : la première validation est déjà en cours
          const next = { ...parts, [step]: r };
          setParts(next);
          if (step === 'anamnese' && p.scope !== 'anamnese') setStep('fallvorstellung');
          else finish(next).catch((e) => console.error('[external-ai]', e));
        }}
      />
    );
  }
  if (step === 'saving') return null;

  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <div className="label">Simulation avec ton IA</div>
        <p className="font-semibold">
          Tu as simulé <Link to={`/cas/${c.id}`} className="text-brand-600">{c.name}</Link> avec {target} — comment ça s'est passé ?
        </p>
        <div role="radiogroup" aria-label="Durée" className="mt-2 flex gap-1.5">
          {DURATIONS_MIN.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={m === durationMin} onClick={() => setDurationMin(m)}
              className={`chip min-h-11 px-3 ${m === durationMin ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
              {m === 30 ? '30 min+' : `${m} min`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setStep('anamnese')} className="btn-primary min-h-11">Évaluer</button>
        <button type="button" onClick={() => { snooze().catch(() => {}); }} className="btn-ghost min-h-11 text-sm">Pas maintenant</button>
        <button type="button" onClick={() => { dismiss().catch(() => {}); }} className="btn-ghost min-h-11 text-sm">Ce n'était pas une simulation</button>
      </div>
    </section>
  );
}
