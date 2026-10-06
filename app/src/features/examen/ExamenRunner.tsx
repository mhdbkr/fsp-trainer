// ============================================================================
// Le runner de l'Examen (simulation-run.md §11). UN moteur : `useLauf`, en mode examen. Ce runner ne fait qu'ordonner,
// à l'horloge murale, les transitions de l'automate :
//   laufend(t) ──échéance──▶ terminerPartie ──▶ bilanz(t) ──60 s ou « Prêt »──▶ partieSuivante ──▶ laufend(t+1)
//   bilanz(Fallvorstellung) ──▶ versChecklist ──▶ auto-évaluation (grilles A et F obligatoires) ──▶ speichern
// Aucune aide montée (scripts/checkExamen.mjs). Le cas n'apparaît nulle part : ni nom, ni id, ni spécialité.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SimTeil } from '@/db/types';
import { useCase } from '@/hooks/useData';
import { now } from '@/lib/clock';
import { languageGridEntered, NOT_ENTERED, emptyLanguageGrid } from '@/lib/scoring';
import { checklisteFuer, hatSprachgitter, naechsterTeil } from '@/lib/lauf/automat';
import type { Lauf } from '@/lib/lauf/types';
import { useLauf, type LaufSteuerung } from '@/features/simulation/useLauf';
import { usePatientBroadcast } from '@/features/simulation/usePatientSync';
import { PartEvaluation } from '@/features/simulation/PartEvaluation';
import { EXAM_DAY_PLAN, targetSec } from './plan';
import { useExamDayClock } from './horloge';
import { ExamArztbrief, ExamBogen, ExamHeader, TransitionView } from './vues';

const PLAN = EXAM_DAY_PLAN.BW;
const LABEL = Object.fromEntries(PLAN.parts.map((p) => [p.key, p.label])) as Record<SimTeil, string>;
const ORDRE = PLAN.parts.map((p) => p.key);
/** Les Teile dont la grille de langue est exigée pour que la partie compte comme examen (`conditionsExamen`, « grille »). */
const AVEC_GRILLE = ORDRE.filter(hatSprachgitter);

/** Les grilles exigées sont-elles saisies, les cinq critères ? */
export const grillesCompletes = (l: Lauf): boolean => AVEC_GRILLE.every((t) => languageGridEntered(l.entwurf[t]?.grid));

export function ExamenRunner({ caseId, taskId, onFin }: { caseId: string; taskId?: string; onFin: (simId: string | null) => void }) {
  const [sp] = useSearchParams();
  const c = useCase(caseId);
  const s = useLauf(c, null, taskId, { examen: true });
  const lauf = s.lauf;
  usePatientBroadcast(c?.id);                          // la seconde fenêtre du simulant suit le cas (BroadcastChannel, hors DOM)

  // Dev seulement : `?debugClock=<s>` décale l'horloge LUE, jamais le Lauf.
  const decalage = import.meta.env.DEV ? Number(sp.get('debugClock') ?? 0) || 0 : 0;
  const nowFn = useCallback(() => now() + decalage * 1000, [decalage]);

  const t = (lauf?.aktuellerTeil ?? null) as SimTeil | null;
  const cible = t ? targetSec(PLAN.land, t) : 0;
  const beginn = t ? lauf?.examen?.teilBeginn[t] ?? null : null;
  const enCours = lauf?.zustand === 'laufend';
  const enTransition = lauf?.zustand === 'bilanz' && naechsterTeil(lauf) !== null;
  const horloge = useExamDayClock(enCours ? beginn : null, cible, PLAN.alertsSec, nowFn);
  const transition = useExamDayClock(enTransition && beginn !== null ? beginn + cible * 1000 : null, PLAN.transitionSec, [], nowFn);
  const ecoule = Math.min(cible, cible - horloge.remaining);

  const { stempleTeil, tick, terminerPartie, dispatch, versChecklist } = s;
  // Le début du Teil, une fois, à l'entrée dans `laufend(t)` — un champ, pas une transition (§11.1).
  useEffect(() => { if (enCours && t && beginn === null) stempleTeil(t, nowFn()); }, [enCours, t, beginn, stempleTeil, nowFn]);
  // Le chrono du Lauf suit l'horloge murale, plafonné à la cible (INV-E6) : il entre dans `dauerGesamtSec`.
  useEffect(() => { if (enCours && t && beginn !== null) tick(t, ecoule); }, [enCours, t, beginn, ecoule, tick]);
  // Échéance : le Teil se termine seul.
  useEffect(() => { if (enCours && t && horloge.expired) { tick(t, cible); terminerPartie(); } }, [enCours, t, horloge.expired, cible, tick, terminerPartie]);
  // Fin de transition : le Teil suivant.
  useEffect(() => { if (enTransition && transition.expired) dispatch({ typ: 'partieSuivante' }); }, [enTransition, transition.expired, dispatch]);
  // Après la Fallvorstellung : l'auto-évaluation de fin.
  const fini = lauf?.zustand === 'bilanz' && naechsterTeil(lauf) === null;
  useEffect(() => { if (fini) versChecklist(); }, [fini, versChecklist]);

  const abandonner = async () => {
    const joue = !!lauf?.teileGespielt.length;
    if (!window.confirm(joue ? 'Abandonner l’examen ? Les Teile terminés sont enregistrés comme examen interrompu.' : 'Abandonner l’examen ? Rien ne sera enregistré.')) return;
    await s.aufgeben();
    onFin(null);
  };

  if (!c || s.laedt || !lauf) return <div className="text-slate-400">Chargement…</div>;

  const phase = lauf.zustand === 'laufend' ? t! : enTransition ? 'transition' : lauf.zustand === 'checkliste' ? 'bewertung' : 'fin';
  const rang = t ? ORDRE.indexOf(t) + 1 : ORDRE.length;
  return (
    <div data-examen="" data-examen-phase={phase} className="mx-auto max-w-5xl space-y-3">
      {(enCours || enTransition) && (
        <ExamHeader
          titre={`${t ? LABEL[t] : ''} · ${rang}/3${enTransition ? ' · transition' : ''}`}
          reste={enCours ? horloge.remaining : enTransition ? transition.remaining : null}
          alerte={enCours ? horloge.alert : null}
          onAbandon={() => void abandonner()}
        />
      )}

      {enTransition && t && (
        <TransitionView de={t} vers={LABEL[naechsterTeil(lauf)!]} reste={transition.remaining} onPret={() => dispatch({ typ: 'partieSuivante' })} />
      )}

      {enCours && t && (
        <div className={t === 'anamnese' ? '' : 'grid gap-3 lg:grid-cols-2'}>
          <ExamBogen c={c} muster={lauf.muster} notes={lauf.bogen} onChange={(b) => s.setzeFeld({ bogen: b })}
            frozen={t !== 'anamnese' || horloge.expired} />
          {t !== 'anamnese' && (
            <ExamArztbrief text={lauf.arztbriefText} onChange={(x) => s.setzeFeld({ arztbriefText: x })}
              frozen={t !== 'dokumentation' || horloge.expired} />
          )}
        </div>
      )}

      {phase === 'bewertung' && <Bewertung s={s} onFin={onFin} />}
      {phase === 'fin' && <div className="text-slate-400">Enregistrement…</div>}
    </div>
  );
}

/** L'auto-évaluation de fin, un Teil à la fois. Les grilles de langue de l'Anamnese et de la Fallvorstellung sont
 *  exigées : sans elles, la partie ne serait pas en conditions d'examen (décision 4). */
function Bewertung({ s, onFin }: { s: LaufSteuerung; onFin: (simId: string | null) => void }) {
  const lauf = s.lauf!;
  const [i, setI] = useState(0);
  const t = ORDRE[i];
  const pret = grillesCompletes(lauf);
  const enregistrer = async () => { const id = await s.beenden(); if (id) onFin(id); };
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">Fin de l’examen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Évalue chaque Teil. Le cas te sera révélé ensuite.</p>
      </div>
      <nav aria-label="Auto-évaluation" className="flex justify-center gap-2">
        {ORDRE.map((x, k) => (
          <button key={x} type="button" onClick={() => setI(k)} aria-current={k === i ? 'step' : undefined}
            className={`chip min-h-11 ${k === i ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-ink-700 dark:text-slate-300'}`}>
            {LABEL[x]}{hatSprachgitter(x) && languageGridEntered(lauf.entwurf[x]?.grid) ? ' ✓' : ''}
          </button>
        ))}
      </nav>
      <PartEvaluation
        part={t}
        durationSec={lauf.sekundenProTeil[t] ?? 0}
        checklist={checklisteFuer(lauf, t)}
        grid={lauf.entwurf[t]?.grid ?? emptyLanguageGrid()}
        feeling={lauf.entwurf[t]?.feeling ?? NOT_ENTERED}
        onToggle={s.setzeItem}
        onGrid={(g) => s.setzeEntwurfFeld(t, { grid: g })}
        onFeeling={(v) => s.setzeEntwurfFeld(t, { feeling: v })}
        suivant={i < ORDRE.length - 1 ? LABEL[ORDRE[i + 1]] : null}
        suivantLabel={(x) => `${x} →`}
        onSuivant={() => setI(i + 1)}
      />
      {s.fehler && <p role="alert" className="callout callout-warn text-sm">{s.fehler}</p>}
      <div className="flex flex-col items-center gap-1.5">
        <button type="button" onClick={() => void enregistrer()} disabled={!pret} className="btn-primary min-h-11 px-6 disabled:opacity-50">
          Enregistrer l’examen
        </button>
        {!pret && <p className="text-xs text-slate-500 dark:text-slate-400">Note les cinq critères de langue de l’Anamnese et de la Fallvorstellung.</p>}
      </div>
    </div>
  );
}
