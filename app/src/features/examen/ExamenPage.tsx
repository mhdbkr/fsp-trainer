// ============================================================================
// `/examen` (simulation-run.md §11). Trois écrans sur une seule URL, sans id de cas :
//   · avant : le tirage (caché), le partenaire, le Muster, « Démarrer l'examen » ;
//   · pendant : le runner, relu depuis `lauf.aktiv` — un rechargement reprend là où l'horloge murale en est ;
//   · après (`?sim=<id>`) : le cas révélé, son cadran, les conditions d'examen remplies ou manquantes.
// La tâche « examen à blanc » du plan (`?task=<id>`) joue SON cas, sans tirage (décision 6).
// ============================================================================
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useCase, useCases } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { now } from '@/lib/clock';
import { conditionsManquantes } from '@/lib/examen';
import { tireCas } from '@/lib/examen/tirage';
import { LAUF_AKTIV_KEY, bereinigeAltenLauf } from '@/lib/lauf/speichern';
import type { Lauf } from '@/lib/lauf/types';
import type { Case, ConditionExamen } from '@/db/types';
import { useCaseProgress, useTrainingEvents } from '@/features/program/useProgram';
import { MusterChoix, PartnerCard, useTache } from '@/features/simulation/SimulationSetup';
import { ResultScreen } from '@/features/simulation/SimulationRunner';
import { vorstellungsDiagnose } from '@/features/simulation/PreSimulationPage';
import { Icon } from '@/components/icons';
import { EXAM_DAY_PLAN } from './plan';
import { ExamenRunner } from './ExamenRunner';

const PLAN = EXAM_DAY_PLAN.BW;

export function ExamenPage() {
  const [params, setParams] = useSearchParams();
  const simId = params.get('sim');
  const taskId = params.get('task') ?? undefined;
  // Un Lauf de plus de 24 h est abandonné par la porte commune (§3.1), avant d'être lu ici.
  useEffect(() => { void bereinigeAltenLauf().catch(() => {}); }, []);
  const aktiv = useLiveQuery(async () => ((await db.meta.get(LAUF_AKTIV_KEY))?.value ?? null) as Lauf | null, [], undefined);
  const [lance, setLance] = useState<{ caseId: string; taskId?: string } | null>(null);
  const [interrompu, setInterrompu] = useState(false);

  if (simId) return <Resultat simId={simId} onNouveau={() => setParams({}, { replace: true })} />;
  if (aktiv === undefined) return <div className="text-slate-400">Chargement…</div>;
  const enCours = aktiv?.examen && aktiv.zustand !== 'gespeichert' ? aktiv : null;
  const runner = lance ?? (enCours ? { caseId: enCours.caseId, taskId: enCours.taskId } : null);
  if (runner) {
    return (
      <ExamenRunner key={runner.caseId} caseId={runner.caseId} taskId={runner.taskId}
        onFin={(id, ecrit) => { setLance(null); setInterrompu(!id && !!ecrit); setParams(id ? { sim: id } : {}, { replace: true }); }} />
    );
  }
  return <Avant taskId={taskId} enPause={!!aktiv && !aktiv.examen} interrompu={interrompu}
    onStart={(caseId) => { setInterrompu(false); setLance({ caseId, taskId }); }} />;
}

function Avant({ taskId, enPause, interrompu, onStart }: { taskId?: string; enPause: boolean; interrompu: boolean; onStart: (caseId: string) => void }) {
  const cases = useCases();
  const journal = useTrainingEvents();
  const progress = useCaseProgress();
  const ville = useUi((s) => s.targetCenter);
  const tache = useTache(taskId);
  const [tire, setTire] = useState<string | null>(null);
  // Le cas de la tâche du plan, sinon UN tirage, une fois les données lues. Il reste en mémoire : ni l'URL ni le DOM.
  const casDuPlan = tache?.kind === 'examen-blanc' && tache.caseId ? tache.caseId : null;
  useEffect(() => {
    if (tire || tache === undefined || casDuPlan || !cases || !journal || !progress) return;
    setTire(tireCas({ cases, journal, progress, maintenant: now(), ville })?.id ?? null);
  }, [tire, tache, casDuPlan, cases, journal, progress, ville]);
  const caseId = casDuPlan ?? tire;
  const vide = !!cases && cases.length === 0;

  return (
    <div data-examen-page="" className="mx-auto max-w-2xl space-y-5">
      <header className="text-center">
        {interrompu && <p role="status" className="callout callout-info mx-auto mb-4 max-w-md text-left text-sm">Examen interrompu, enregistré dans l’Historique.</p>}
        <h1 className="text-2xl font-bold tracking-tightish">Un cas, trois Teile, sans aide</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          {casDuPlan ? 'Le cas de ta tâche du jour' : 'Un cas tiré au sort'}, caché jusqu’à la fin.
          {' '}Trois Teile de {Math.round(PLAN.parts[0].targetSec / 60)} minutes, enchaînés au chronomètre (format {PLAN.label}).
          {' '}Le jury peut interrompre l’Anamnese pour une Aufklärung.
        </p>
        <button type="button" disabled={!caseId} onClick={() => caseId && onStart(caseId)} className="btn-primary mt-4 min-h-11 gap-2 px-6">
          <Icon name="play" className="h-4 w-4" />Démarrer l’examen
        </button>
        {vide && <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Aucun cas disponible.</p>}
        {enPause && <p className="callout callout-info mx-auto mt-3 max-w-md text-left text-xs">Une simulation est en pause : démarrer l’examen l’enregistre telle quelle.</p>}
      </header>
      {caseId && <PartnerCard caseId={caseId} depart={null} examen />}
      <MusterChoix />
    </div>
  );
}

/** Le diagnostic révélé : la première phrase de la Verdachtsdiagnose (celle de la Fallvorstellung), sinon le nom du cas. */
export const diagnosticDuCas = (c: Case): string => {
  if (!c.medicalView?.verdachtsdiagnose) return c.name;
  const d = vorstellungsDiagnose(c);
  return `${d.text}${d.offen ? '…' : ''}`;
};

const CONDITION: Record<ConditionExamen, string> = {
  enchaine: 'les trois Teile d’un trait, sans reprise de plus de 5 minutes',
  autonome: 'en Autonome',
  ordre: 'dans l’ordre Anamnese, Dokumentation, Fallvorstellung',
  grille: 'les grilles de langue saisies',
};

/** Le résultat : le cas révélé, et ce que la partie vaut comme examen. Une seule rangée d'actions, celle de `ResultScreen`. */
function Resultat({ simId, onNouveau }: { simId: string; onNouveau: () => void }) {
  const sim = useLiveQuery(() => db.simulations.get(simId), [simId]);
  const c = useCase(sim?.caseId);
  if (sim === undefined || (sim && !c)) return <div className="text-slate-400">Chargement…</div>;
  if (!sim || !c) return <div className="text-slate-400">Cet examen n’existe plus.</div>;
  const manque = conditionsManquantes(sim);
  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-3xl space-y-2">
        <div className={`callout ${manque.length ? 'callout-warn' : 'callout-tip'}`} data-examen-conditions={manque.join(' ')}>
          <span>
            {manque.length
              ? `Hors conditions d’examen : il manque ${manque.map((m) => CONDITION[m]).join(', ')}.`
              : 'Conditions d’examen remplies.'}
          </span>
        </div>
        <p data-examen-cas="" className="text-center text-base">Le cas : <b>{diagnosticDuCas(c)}</b></p>
      </div>
      <ResultScreen sim={sim} c={c} nouvelExamen={onNouveau} />
    </div>
  );
}
