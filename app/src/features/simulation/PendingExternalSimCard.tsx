import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '@/db/db';
import { readPending, setPending, AI_TARGETS } from '@/lib/externalAi/targets';
import { SelbstBewertung } from './PartEvaluation';
import { leitsymptomOf } from '@/data/guides/anamneseChapters';
import { saveSimulation } from '@/lib/simulationSave';
import type { Case, PartResult, Simulation } from '@/db/types';
import { now } from '@/lib/clock';

const SNOOZE_MS = 3600_000; // 1 h — « Pas maintenant » persiste dans la trace (snoozedUntil), pas en sessionStorage
// Les 3 durées proposées ; « 30 min+ » vaut 30 min comme les autres, le
// « + » n'est qu'un signal visuel qu'il n'y a pas de plafond au-delà.
const DURATIONS_MIN = [10, 20, 30] as const;
type DurationMin = typeof DURATIONS_MIN[number];
const DEFAULT_DURATION_MIN: DurationMin = 20;

// Carte de retour après une simulation avec une IA externe : la séance ne
// compte que si le candidat s'auto-évalue (même grille que le runner). Elle
// est AUTO-DÉCLARÉE (mode 'external-ai' ⇒ selbstbewertet, contrat
// training-journal Q3) : historique et série, hors de l'indice : `indiceAt`
// lit `case_progress`, où une séance auto-déclarée ne bouge aucun statut (INV-11).
// Le Teil d'ancrage de la trace dit quelles parties évaluer ; une trace sans
// Teil (ancienne, `scope` exam) couvre anamnese + fallvorstellung.
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
    const x = await readPending();
    if (!x || now() - x.at > 12 * 3600_000 || (onlyCaseId && x.caseId !== onlyCaseId)) return null;
    // Snooze persistant (« Pas maintenant ») : la trace reste posée (elle
    // expire toujours à 12 h), mais la carte reste masquée jusqu'à snoozedUntil.
    if (x.snoozedUntil && now() < x.snoozedUntil) return null;
    // Le cas a été joué et enregistré dans l'app après le lancement de l'IA
    // (lanceur ouvert pendant la partie, puis partie finie ici) : la trace est
    // caduque, ne pas redemander une évaluation déjà faite — seulement si cette
    // partie couvre le Teil de la trace (séance complète : Anamnese + Fallvorstellung).
    const couvre = (s: Simulation) => x.teil
      ? !!s.parts?.[x.teil]?.done
      : !!(s.parts?.anamnese?.done && s.parts?.fallvorstellung?.done);
    // [S4] `Simulation.date` est désormais le DÉBUT de la partie (m5, INV-75) : une partie commencée avant
    // le lancement et ENREGISTRÉE après ne se reconnaît plus à sa date. L'instant de l'enregistrement est
    // celui de son événement `simulation.completed`.
    const ecrites = new Set((await db.progress_events.where('type').equals('simulation.completed')
      .filter((e) => Date.parse(e.occurred_at) >= x.at).toArray()).map((e) => e.subject_id));
    if (await db.simulations.where('caseId').equals(x.caseId).filter((s) => (s.date >= x.at || ecrites.has(s.id)) && couvre(s)).count()) return null;
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
  const snooze = async () => { await setPending({ ...p, snoozedUntil: now() + SNOOZE_MS }); };
  const finish = async (all: typeof parts) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setStep('saving'); // synchrone, avant tout await : ferme l'évaluation immédiatement
    try {
      await saveSimulation({
        c, parts: all, assistance: 'autonome', layer: c.layerProgress ?? 1,
        mode: 'external-ai', externalTarget: p.targetId,
        scope: p.teil ? 'teil' : 'full',
        teil: p.teil,
      });
      await setPending(null);
      setParts({});
    } finally {
      savingRef.current = false;
      setStep('idle');
    }
  };

  // Durée choisie répartie sur les parties jouées : un Teil seul = tout ;
  // séance complète = 2/3 anamnese, 1/3 fallvorstellung (arrondi), le reste
  // va à fallvorstellung pour que la somme reste exacte.
  const totalSec = durationMin * 60;
  const anamneseSec = p.teil === 'anamnese' ? totalSec : p.teil === 'fallvorstellung' ? 0 : Math.round((totalSec * 2) / 3);
  const fallvorstellungSec = totalSec - anamneseSec;
  const firstStep = p.teil === 'fallvorstellung' ? 'fallvorstellung' : 'anamnese';
  const what = p.teil === 'anamnese' ? "l'anamnèse de " : p.teil === 'fallvorstellung' ? 'la Fallvorstellung de ' : '';

  if (step === 'anamnese' || step === 'fallvorstellung') {
    return (
      <SelbstBewertung
        part={step}
        kategorie={leitsymptomOf(c)}
        durationSec={step === 'anamnese' ? anamneseSec : fallvorstellungSec}
        suivant={step === 'anamnese' && !p.teil ? 'Fallvorstellung' : null}
        onCancel={() => setStep('idle')}
        onSave={(r) => {
          if (savingRef.current) return; // double-tap : la première validation est déjà en cours
          const next = { ...parts, [step]: r };
          setParts(next);
          if (step === 'anamnese' && !p.teil) setStep('fallvorstellung');
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
          Tu as simulé {what}<Link to={`/cas/${c.id}`} className="text-brand-600">{c.name}</Link> avec {target} — comment ça s'est passé ?
        </p>
        <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
          Séance auto-déclarée : elle compte dans ton historique et ta série, pas dans l'indice de préparation.
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
        <button type="button" onClick={() => setStep(firstStep)} className="btn-primary min-h-11">Évaluer</button>
        <button type="button" onClick={() => { snooze().catch(() => {}); }} className="btn-ghost min-h-11 text-sm">Pas maintenant</button>
        <button type="button" onClick={() => { dismiss().catch(() => {}); }} className="btn-ghost min-h-11 text-sm">Ce n'était pas une simulation</button>
      </div>
    </section>
  );
}
