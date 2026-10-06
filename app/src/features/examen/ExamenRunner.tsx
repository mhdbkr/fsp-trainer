// ============================================================================
// Le runner de l'Examen (simulation-run.md §11). UN moteur : `useLauf`, en mode examen. Ce runner ne fait qu'ordonner,
// à l'horloge murale, les transitions de l'automate :
//   laufend(t) ──échéance──▶ terminerPartie ──▶ bilanz(t) ──60 s ou « Prêt »──▶ partieSuivante ──▶ laufend(t+1)
//   bilanz(Fallvorstellung) ──▶ versChecklist ──▶ auto-évaluation (grilles A et F obligatoires) ──▶ speichern
// Aucune aide montée (scripts/checkExamen.mjs). Le cas n'apparaît nulle part : ni nom, ni id, ni spécialité.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useCase } from '@/hooks/useData';
import { now } from '@/lib/clock';
import { languageGridEntered, NOT_ENTERED, emptyLanguageGrid } from '@/lib/scoring';
import { checklisteFuer, hatSprachgitter, naechsterTeil } from '@/lib/lauf/automat';
import type { Lauf, LaufTeil } from '@/lib/lauf/types';
import { useLauf, type LaufSteuerung } from '@/features/simulation/useLauf';
import { usePatientBroadcast } from '@/features/simulation/usePatientSync';
import { PartEvaluation } from '@/features/simulation/PartEvaluation';
import { EXAM_DAY_PLAN, targetSec } from './plan';
import { useExamDayClock } from './horloge';
import { AufklaerungAuftrag, ExamArztbrief, ExamBogen, ExamHeader, TransitionView } from './vues';

const PLAN = EXAM_DAY_PLAN.BW;
const LABEL = { ...Object.fromEntries(PLAN.parts.map((p) => [p.key, p.label])), aufklaerung: PLAN.aufklaerung.label } as Record<LaufTeil, string>;
const ORDRE = PLAN.parts.map((p) => p.key);

/** La fenêtre murale d'un Teil. Quand le cas a une Aufklärung, elle occupe la FIN du créneau de l'Anamnese (le jury
 *  interrompt l'entretien, règle 7) : l'Anamnese dure le créneau moins l'Aufklärung, et l'Aufklärung la suit. */
export function fenetre(l: Lauf, t: LaufTeil): { debut: number | null; sec: number } {
  const a = targetSec(PLAN.land, 'anamnese');
  const k = l.examen?.aufklaerung ? PLAN.aufklaerung.targetSec : 0;
  const debutA = l.examen?.teilBeginn.anamnese ?? null;
  if (t === 'aufklaerung') return { debut: debutA === null ? null : debutA + (a - k) * 1000, sec: k };
  return { debut: l.examen?.teilBeginn[t] ?? null, sec: t === 'anamnese' ? a - k : targetSec(PLAN.land, t) };
}
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

  const t = lauf?.aktuellerTeil ?? null;
  const { debut, sec } = lauf && t ? fenetre(lauf, t) : { debut: null, sec: 0 };
  const enCours = lauf?.zustand === 'laufend';
  // Au bilan de l'Aufklärung, on revient tout de suite à l'Anamnese interrompue (règle 7) : ce n'est pas une transition.
  const auBilan = lauf?.zustand === 'bilanz' && t !== 'aufklaerung';
  const enTransition = auBilan && naechsterTeil(lauf!) !== null;
  const horloge = useExamDayClock(enCours ? debut : null, sec, PLAN.alertsSec, nowFn);
  // La transition part de la fin du CRÉNEAU du Teil (l'Aufklärung comprise dans celui de l'Anamnese).
  const finCreneau = lauf && t && t !== 'aufklaerung' && typeof lauf.examen?.teilBeginn[t] === 'number'
    ? lauf.examen.teilBeginn[t]! + targetSec(PLAN.land, t) * 1000 : null;
  const transition = useExamDayClock(enTransition ? finCreneau : null, PLAN.transitionSec, [], nowFn);
  const ecoule = Math.min(sec, sec - horloge.remaining);

  const { stempleTeil, tick, terminerPartie, dispatch, versChecklist, aufklaerungOeffnen } = s;
  // Le début du Teil, une fois, à l'entrée dans `laufend(t)` — un champ, pas une transition (§11.1). L'Aufklärung n'a pas
  // de début propre : elle occupe la fin du créneau de l'Anamnese.
  useEffect(() => { if (enCours && t && t !== 'aufklaerung' && debut === null) stempleTeil(t, nowFn()); }, [enCours, t, debut, stempleTeil, nowFn]);
  // Le chrono du Lauf suit l'horloge murale, plafonné à la cible (INV-E6) : il entre dans `dauerGesamtSec`.
  useEffect(() => { if (enCours && t && debut !== null) tick(t, ecoule); }, [enCours, t, debut, ecoule, tick]);
  // Échéance : le jury demande l'Aufklärung du cas à la fin de l'Anamnese ; sinon, le Teil se termine seul.
  const aufklaerungDue = t === 'anamnese' && !!lauf?.examen?.aufklaerung && !lauf.teileGespielt.includes('aufklaerung');
  useEffect(() => {
    if (!enCours || !t || !horloge.expired) return;
    tick(t, sec);
    if (aufklaerungDue) aufklaerungOeffnen(); else terminerPartie();
  }, [enCours, t, horloge.expired, sec, aufklaerungDue, tick, terminerPartie, aufklaerungOeffnen]);
  useEffect(() => { if (lauf?.zustand === 'bilanz' && t === 'aufklaerung') dispatch({ typ: 'partieSuivante' }); }, [lauf?.zustand, t, dispatch]);
  // Fin de transition : le Teil suivant.
  useEffect(() => { if (enTransition && transition.expired) dispatch({ typ: 'partieSuivante' }); }, [enTransition, transition.expired, dispatch]);
  // Après la Fallvorstellung : l'auto-évaluation de fin.
  const fini = auBilan && naechsterTeil(lauf!) === null;
  useEffect(() => { if (fini) versChecklist(); }, [fini, versChecklist]);
  const acte = useLiveQuery(async () => (lauf?.examen?.aufklaerung ? (await db.aufklaerungen.get(lauf.examen.aufklaerung))?.name ?? null : null), [lauf?.examen?.aufklaerung]);

  const abandonner = async () => {
    const joue = !!lauf?.teileGespielt.length;
    if (!window.confirm(joue ? 'Abandonner l’examen ? Les Teile terminés sont enregistrés comme examen interrompu.' : 'Abandonner l’examen ? Rien ne sera enregistré.')) return;
    await s.aufgeben();
    onFin(null);
  };

  if (!c || s.laedt || !lauf) return <div className="text-slate-400">Chargement…</div>;

  const phase = lauf.zustand === 'laufend' ? t! : enTransition ? 'transition' : lauf.zustand === 'checkliste' ? 'bewertung' : 'fin';
  const rang = t === 'aufklaerung' ? 1 : t ? ORDRE.indexOf(t) + 1 : ORDRE.length;
  return (
    <div data-examen="" data-examen-phase={phase} className="mx-auto max-w-5xl space-y-3">
      {(enCours || enTransition) && (
        <ExamHeader
          titre={enTransition ? 'Transition' : t ? LABEL[t] : ''}
          rang={`${rang}/3`}
          reste={enCours ? horloge.remaining : enTransition ? transition.remaining : null}
          alerte={enCours ? horloge.alert : null}
          onAbandon={() => void abandonner()}
        />
      )}

      {enTransition && t && (
        <TransitionView de={t} vers={LABEL[naechsterTeil(lauf)!]} reste={transition.remaining} onPret={() => dispatch({ typ: 'partieSuivante' })} />
      )}

      {enCours && t === 'aufklaerung' && <AufklaerungAuftrag acte={acte ?? null} />}

      {enCours && t && (
        <div className={t === 'anamnese' || t === 'aufklaerung' ? '' : 'grid gap-3 lg:grid-cols-2'}>
          <ExamBogen c={c} muster={lauf.muster} notes={lauf.bogen} onChange={(b) => s.setzeFeld({ bogen: b })}
            frozen={(t !== 'anamnese' && t !== 'aufklaerung') || horloge.expired} />
          {t !== 'anamnese' && t !== 'aufklaerung' && (
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
  // L'Aufklärung jouée s'évalue à sa place, après l'Anamnese ; sa grille n'est pas exigée (`conditionsExamen`).
  const ordre: LaufTeil[] = lauf.teileGespielt.includes('aufklaerung') ? ['anamnese', 'aufklaerung', 'dokumentation', 'fallvorstellung'] : ORDRE;
  const t = ordre[i];
  const pret = grillesCompletes(lauf);
  const enregistrer = async () => { const id = await s.beenden(); if (id) onFin(id); };
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-xl font-bold">Fin de l’examen</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Évalue chaque Teil. Le cas te sera révélé ensuite.</p>
      </div>
      <nav aria-label="Auto-évaluation" className="flex justify-center gap-2">
        {ordre.map((x, k) => (
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
        suivant={i < ordre.length - 1 ? LABEL[ordre[i + 1]] : null}
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
