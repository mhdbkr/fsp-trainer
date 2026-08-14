import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '@/db/db';
import type { AssistanceMode, BogenNotes, Case, MusterCity, PartResult, SketchNotes, Simulation } from '@/db/types';
import { useCase } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useProfiles } from '@/store/profile';
import { useSimSession } from '@/store/simSession';
import { useTimer } from './useTimer';
import { computeAmbiance } from './timeAmbiance';
import { TimeAmbianceProvider, TimeFace, timeGlass } from './TimeCapsule';
import { Portal } from '@/components/Portal';
import { PartEvaluation } from './PartEvaluation';
import { partScore, weightedPartScore } from '@/lib/scoring';
import { AnamneseGuide } from './AnamneseGuide';
import { AnamneseBogen } from './AnamneseBogen';
import { VorstellungGuide } from './VorstellungGuide';
import { ArztbriefGuide } from './ArztbriefGuide';
import { KommunikationPanel } from './KommunikationPanel';
import { QrCode } from '@/components/QrCode';
import { usePatientBroadcast, patientUrl, patientUrlIsOnline, localPatientUrl } from './usePatientSync';
import { Icon } from '@/components/icons';
import { SidePanel } from '@/components/SidePanel';
import { ImmersiveMode } from './ImmersiveMode';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';
const FLOW: { key: Part; label: string; target: number; icon: string }[] = [
  { key: 'anamnese', label: 'Anamnese', target: 20 * 60, icon: 'pain' },
  { key: 'dokumentation', label: 'Dokumentation', target: 20 * 60, icon: 'history' },
  { key: 'fallvorstellung', label: 'Fallvorstellung', target: 12 * 60, icon: 'stethoscope' },
];

export function SimulationRunner() {
  const { caseId } = useParams();
  const c = useCase(caseId);
  const activeProfile = useProfiles((s) => s.active());
  const assistance = useUi((s) => s.assistance);
  const layer = useUi((s) => s.layer);
  const muster = useUi((s) => s.muster);
  const session = useSimSession();

  // Restaure une session en pause pour ce cas (sinon départ à zéro).
  const restore = session.snapshot && session.snapshot.caseId === caseId ? session.snapshot : null;
  const [active, setActive] = useState<Part>(restore?.active ?? 'anamnese');
  const [phase, setPhase] = useState<'play' | 'eval'>(restore?.phase ?? 'play');
  const [notes] = useState<SketchNotes>({}); // legacy croquis (remplacé par le Bogen structuré)
  const [bogen, setBogen] = useState<BogenNotes>(restore?.bogen ?? {});
  const [arztbriefText, setArztbriefText] = useState(restore?.arztbriefText ?? '');
  const [results, setResults] = useState<Partial<Record<Part, PartResult>>>(restore?.results ?? {});
  const [aufklaerungOpen, setAufklaerungOpen] = useState(restore?.aufklaerungOpen ?? false);
  const [elapsed, setElapsed] = useState<Partial<Record<Part, number>>>(restore?.elapsed ?? {});
  const [finished, setFinished] = useState<Simulation | null>(null);
  const [showQr, setShowQr] = useState(false);

  // Fusion des deux étiquettes au défilement. Ce n'est PAS la fenêtre qui défile mais le
  // <main class="overflow-y-auto"> du layout : écouter `window` ne déclencherait
  // jamais rien. On remonte donc jusqu'au premier ancêtre réellement scrollable.
  // Deux seuils (90 px pour condenser, 40 px pour rouvrir) : sans cette
  // hystérésis, s'arrêter pile sur le seuil ferait osciller la barre.
  const headerRef = useRef<HTMLDivElement>(null);
  // Repères de destination des commandes de chrono : le coin haut-droit libéré
  // par Aufklärung (fusionné) et leur place au repos, à droite du chrono. On
  // MESURE les deux plutôt que de coder un décalage en dur, sinon le trajet
  // serait faux dès qu'un libellé change de taille.
  const slotMergedRef = useRef<HTMLDivElement>(null);
  const slotRestRef = useRef<HTMLDivElement>(null);
  const [merged, setMerged] = useState(false);
  const [headerH, setHeaderH] = useState(0);
  // Deux nœuds « flottants » : les commandes et le chrono. Ils gardent leur
  // identité DOM et se déplacent par translation d'un emplacement à l'autre.
  const ctrlPos = useTwoSlots(headerRef, slotMergedRef, slotRestRef, merged);
  // Dépend de `c` : au tout premier rendu le cas n'est pas chargé, l'en-tête
  // n'existe pas encore et l'effet capterait `window` par défaut — sans jamais
  // se réexécuter. On (ré)attache donc dès que l'en-tête est monté.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    // Écoute en CAPTURE sur `document` : les événements de défilement ne
    // remontent pas (`scroll` ne bulle pas), mais ils descendent en capture. On
    // attrape donc le scroll quel que soit le conteneur — ici le <main>, qu'il
    // serait fragile d'identifier au montage puisqu'il n'est pas encore
    // débordant à cet instant. On ignore les scrollers internes (Muster-Bogen)
    // en ne retenant que ceux qui contiennent réellement l'en-tête.
    // Deux seuils = hystérésis : sans elle, s'arrêter pile sur le seuil ferait
    // osciller la barre à chaque micro-défilement.
    const onScroll = (ev: Event) => {
      const t = ev.target as HTMLElement | Document;
      const y = t === document ? window.scrollY : (t as HTMLElement).scrollTop;
      if (typeof y !== 'number') return;
      if (t !== document && !(t as HTMLElement).contains(el)) return;
      setMerged((prev) => (prev ? y > 40 : y > 90));
    };
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });

    // La hauteur de l'en-tête change quand il se condense : on la mesure au lieu
    // de la coder en dur, sinon la capsule chrono se replacerait mal (c'est ce
    // qui la faisait passer sous l'en-tête).
    const applyH = () => setHeaderH((prev) => (prev === el.offsetHeight ? prev : el.offsetHeight));
    const ro = new ResizeObserver(applyH);
    ro.observe(el);
    applyH();

    return () => { document.removeEventListener('scroll', onScroll, true); ro.disconnect(); };
    // `c?.id` et NON `c` : useCase renvoie un nouvel objet à chaque rendu.
  }, [c?.id]);

  // Diffuse le cas actif vers d'éventuelles fenêtres « rôle patient ».
  usePatientBroadcast(c?.id);

  // On rentre dans le Runner → session active (plus minimisée). En quittant le
  // Runner par N'IMPORTE quel moyen (nav bar, lien, retour…), la session est
  // mise en pause automatiquement : elle flotte dans la barre « reprendre » au
  // lieu d'être perdue. (minimize() est sans effet si la session est terminée.)
  useEffect(() => {
    useSimSession.getState().resume();
    return () => { useSimSession.getState().minimize(); };
  }, []);

  // Miroir de l'état local vers le store persistant (survit à la navigation).
  useEffect(() => {
    if (!c || finished) return;
    useSimSession.getState().sync({ caseId: c.id, caseName: c.name, active, phase, bogen, arztbriefText, results, aufklaerungOpen, elapsed });
  }, [c, finished, active, phase, bogen, arztbriefText, results, aufklaerungOpen, elapsed]);

  if (!c) return <div className="text-slate-400">Chargement…</div>;
  if (finished) return <ResultScreen sim={finished} c={c} />;

  const target = (aufklaerungOpen ? 5 * 60 : FLOW.find((f) => f.key === active)?.target) ?? 20 * 60;

  const savePart = async (part: Part, res: PartResult) => {
    setResults((r) => ({ ...r, [part]: res }));
    setPhase('play');
    if (part === 'aufklaerung') { setAufklaerungOpen(false); setActive('anamnese'); return; }
    // avance à la partie suivante
    const idx = FLOW.findIndex((f) => f.key === part);
    if (idx < FLOW.length - 1) setActive(FLOW[idx + 1].key);
  };

  const finishSimulation = async () => {
    const parts = { ...results };
    const sim: Simulation = {
      id: `sim-${Date.now()}`,
      caseId: c.id,
      date: Date.now(),
      profileId: useProfiles.getState().activeId,
      parts,
      notes,
      bogen,
      arztbriefText,
      prioritizedCorrections: buildCorrections(parts),
      passed: Object.values(parts).filter((p) => p?.done).every((p) => partScore(p!) >= 60),
      assistance, layer, muster,
    };
    await db.simulations.put(sim);
    // met à jour confiance + statut du cas — confiance pondérée (assistance × couche)
    const done = Object.values(parts).filter((p): p is PartResult => !!p?.done);
    if (done.length) {
      const conf = Math.round(done.reduce((s, p) => s + weightedPartScore(p, { assistance, layer }), 0) / done.length);
      const status = conf >= 80 ? 'Maîtrisé' : conf >= 40 ? 'En cours' : 'À faire';
      await db.cases.update(c.id, { confidence: conf, status, lastSimulationId: sim.id, layerProgress: layer });
    }
    useSimSession.getState().end(); // session terminée → efface le brouillon persistant
    setFinished(sim);
  };

  const doneCount = Object.values(results).filter((p) => p?.done).length;

  const partKey: Part = aufklaerungOpen ? 'aufklaerung' : active;

  return (
    // --panel-offset : hauteur réelle de l'en-tête collant, publiée en variable
    // CSS pour que les panneaux latéraux (Muster-Bogen, notes, guide) s'y
    // alignent au lieu de passer dessous. Une seule source de vérité.
    <div style={{ '--panel-offset': `calc(3.5rem + ${headerH || 148}px + 0.75rem)` } as React.CSSProperties}>
      <SimTimer
        key={partKey}
        target={target}
        initialElapsed={elapsed[partKey] ?? 0}
        running={phase === 'play'}
        onElapsed={(sec) => setElapsed((e) => (e[partKey] === sec ? e : { ...e, [partKey]: sec }))}
      >
        {(timer) => {
          const amb = computeAmbiance(timer.elapsed, target);
          const navIdx = Math.max(0, FLOW.findIndex((f) => f.key === active));
          return (
            <TimeAmbianceProvider elapsed={timer.elapsed} target={target}>
              {/* Les DEUX étiquettes vivent dans le MÊME conteneur collant.
                  C'est ce qui rend la fusion possible sans saccade : rien ne se
                  téléporte d'une carte à l'autre, on ferme seulement l'espace
                  et on soude les bordures. Chaque élément reste monté. */}
              {/* PERFORMANCE — pendant la fusion on n'anime QUE des
                  transformations et des opacités (compositeur). Trois
                  propriétés de disposition subsistent, confinées.
                  FUSION — les deux étiquettes ne sont pas « superposées » : au
                  repos chacune porte sa propre surface de verre, et en
                  fusionnant ces deux surfaces s'effacent au profit d'UNE SEULE,
                  continue, posée sur l'ensemble. C'est ce qui supprime le trait
                  de jointure : il n'y a plus deux plaques bord à bord mais une
                  seule goutte. */}
              <div ref={headerRef}
                className={`sticky top-14 z-30 flex flex-col relative transition-[gap] duration-[420ms] ease-fluid ${merged ? 'gap-0' : 'gap-2.5'}`}
                // PAS de `contain: paint` ici : il crée une RACINE
                // D'ARRIÈRE-PLAN, et le backdrop-filter des surfaces de verre
                // ne « voit » alors plus la page derrière — le flou disparaît
                // et le verre redevient un simple aplat translucide. C'était la
                // cause du rendu non-verre. `contain: layout` seul est sûr.
                style={{ contain: 'layout' }}>

                {/* Surface UNIQUE de l'état fusionné */}
                <div aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-[420ms] ease-fluid"
                  style={{ ...timeGlass(amb, 0.85), opacity: merged ? 1 : 0 }} />

                {/* ── Étiquette 1 — identité + parcours ─────────────────── */}
                <div className={`relative rounded-2xl px-4 pt-2.5 transition-[padding-bottom] duration-[420ms] ease-fluid ${merged ? 'pb-1' : 'pb-3'}`}>
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-[420ms] ease-fluid"
                    style={{ ...timeGlass(amb, 0.5), opacity: merged ? 0 : 1 }} />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="relative min-w-0 flex-1">
                      <div className={`origin-left truncate text-sm font-bold transition-transform duration-[420ms] ease-fluid ${merged ? 'scale-[1.12]' : 'scale-100'}`}>{c.name}</div>
                      {/* Ligne profil en absolu : effacement par simple opacité.
                          La marge haute du parcours (mt-7) lui réserve la
                          place : la réserve doit être ENTRE le titre et les
                          pastilles, pas en bas de carte — sinon la ligne mord
                          sur la pastille « Anamnese ». */}
                      <div className={`pointer-events-none absolute left-0 top-full flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 transition-opacity duration-300 ${merged ? 'opacity-0' : 'opacity-100'}`}>
                        <span className="whitespace-nowrap">Médecin : {activeProfile?.name ?? '—'}</span>
                        <span className={`chip whitespace-nowrap py-0 text-[10px] ${assistance === 'autonome' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
                          {assistance === 'autonome' ? 'Autonome' : 'Assisté'} · Couche {layer}
                        </span>
                      </div>
                    </div>
                    {/* Coin haut-droit : QR + Aufklärung au repos, libéré en
                        fusionnant pour accueillir les commandes de chrono. */}
                    <div ref={slotMergedRef} className="relative flex h-7 shrink-0 items-center">
                      <div className={`flex items-center gap-2 whitespace-nowrap transition-opacity duration-300 ${merged ? 'pointer-events-none absolute right-0 opacity-0' : 'opacity-100'}`}>
                        <button onClick={() => setShowQr(true)} title="Fiche patient sur un 2ᵉ écran" className="btn-ghost text-xs">
                          <Icon name="id" className="h-4 w-4" /> QR
                        </button>
                        <button onClick={() => { setAufklaerungOpen(true); setPhase('play'); }}
                          className={`chip shrink-0 ${aufklaerungOpen ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
                          title="Le jury peut demander une Aufklärung à tout moment">
                          <Icon name="bolt" className="h-3.5 w-3.5" />Aufklärung
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Parcours. Colonnes ÉGALES et FIXES ; centrer l'épreuve
                      active se fait en translatant la rangée d'exactement une
                      colonne (compositeur). */}
                  <div className={`relative overflow-hidden transition-[height,margin-top] duration-[420ms] ease-fluid ${merged ? 'mt-0 h-[50px]' : 'mt-7 h-[62px]'}`}>
                    <div className="grid transition-transform duration-[420ms] ease-fluid"
                      style={{ gridTemplateColumns: `repeat(${FLOW.length}, minmax(0, 1fr))`,
                               transform: `translateX(${merged ? (1 - navIdx) * (100 / FLOW.length) : 0}%)` }}>
                      {FLOW.map((f, i) => {
                        const isActive = active === f.key && !aufklaerungOpen;
                        const isDone = !!results[f.key]?.done;
                        return (
                          <div key={f.key} className={`relative flex min-w-0 flex-col items-center transition-opacity duration-300 ${merged && !isActive ? 'opacity-0' : 'opacity-100'}`}>
                            {/* Trait : s'arrête NETTEMENT avant les pastilles
                                (rayon 20 px + 14 px de dégagement). */}
                            {i < FLOW.length - 1 && (
                              <span aria-hidden
                                className={`absolute top-5 h-0.5 -translate-y-1/2 rounded transition-opacity duration-300 ${merged ? 'opacity-0' : 'opacity-100'} ${isDone ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                                style={{ left: 'calc(50% + 34px)', width: 'calc(100% - 68px)' }} />
                            )}
                            <button
                              onClick={() => { setActive(f.key); setPhase('play'); setAufklaerungOpen(false); }}
                              className={`group relative z-10 flex origin-top flex-col items-center gap-1 transition-transform duration-[420ms] ease-fluid ${merged ? 'scale-[0.94]' : 'scale-100'}`}
                            >
                              <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                                isDone ? 'border-emerald-500 bg-emerald-500 text-white'
                                : isActive ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                                : 'border-slate-300 bg-white/70 text-slate-400 group-hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900/70'}`}>
                                {isDone ? '✓' : <Icon name={f.icon} className="h-5 w-5" />}
                              </span>
                              <span className={`whitespace-nowrap text-[11px] font-medium ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>{f.label}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Étiquette 2 — chrono ──────────────────────────────── */}
                <div className={`relative flex items-center rounded-2xl px-4 transition-[height,padding] duration-[420ms] ease-fluid py-2`}>
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-[420ms] ease-fluid"
                    style={{ ...timeGlass(amb, 1), opacity: merged ? 0 : 1 }} />
                  {/* Emplacements AU REPOS (le chrono et les commandes y
                      reviennent) — vides, ce sont de simples repères. */}
                  <div className="relative"><TimeFace amb={amb} remaining={timer.remaining} /></div>
                  <div ref={slotRestRef} aria-hidden className="relative ml-auto h-8 w-px" />
                </div>

                {/* Commandes de chrono — nœud UNIQUE, positionné en absolu et
                    déplacé par translate : elles REMONTENT réellement vers le
                    coin libéré par Aufklärung au lieu d'apparaître ailleurs
                    (un fondu entre deux copies se lirait comme un saut). */}
                <div
                  className="absolute right-4 z-10 flex gap-2 transition-transform duration-[420ms] ease-fluid"
                  style={{ top: ctrlPos.top, transform: `translateY(${merged ? 0 : ctrlPos.shift}px)` }}>
                  {!timer.running ? (
                    <button onClick={timer.start} className="btn-primary text-xs"><Icon name="play" className="h-3.5 w-3.5" />{timer.elapsed ? 'Reprendre' : 'Démarrer'}</button>
                  ) : (
                    <button onClick={timer.pause} className="btn-outline text-xs">⏸ Pause</button>
                  )}
                  <button onClick={() => setPhase('eval')} className="btn-outline text-xs">Terminer la partie ✓</button>
                </div>
              </div>

              <div className="mt-4">
                {phase === 'eval' ? (
                  <PartEvaluation
                    part={partKey}
                    durationSec={timer.elapsed}
                    onSave={(r) => savePart(partKey, r)}
                    onCancel={() => setPhase('play')}
                  />
                ) : (
                  <PlayArea
                    part={partKey}
                    c={c}
                    assistance={assistance}
                    muster={muster}
                    bogen={bogen}
                    setBogen={setBogen}
                    arztbriefText={arztbriefText}
                    setArztbriefText={setArztbriefText}
                  />
                )}
              </div>
            </TimeAmbianceProvider>
          );
        }}
      </SimTimer>

      {/* Modale QR — fiche patient 2ᵉ écran (Portal : couvre TOUT le viewport) */}
      {showQr && (
        <Portal>
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm" onClick={() => setShowQr(false)}>
            <div className="reveal card max-w-sm p-6 text-center" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center gap-1.5 text-brand-600 dark:text-brand-300"><Icon name="mask" className="h-6 w-6" /><Icon name="phone" className="h-6 w-6" /></div>
              <h3 className="mt-2 font-display font-bold tracking-tightish">Fiche patient sur le smartphone</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Le partenaire scanne ce code pour ouvrir la fiche de rôle du patient sur son téléphone.</p>
              <div className="my-4 flex justify-center"><QrCode value={patientUrl(c.id)} size={180} /></div>
              <code className="block break-all rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 dark:bg-slate-800">{patientUrl(c.id)}</code>
              {patientUrlIsOnline() && (
                <p className="callout callout-warn mt-2 text-left text-[11px]"><Icon name="alert" className="mt-0.5 h-3 w-3 shrink-0" />Le QR ouvre la version EN LIGNE de l'app : elle peut être en retard sur ta version locale tant qu'elle n'a pas été republiée. Sur cet appareil, préfère la 2ᵉ fenêtre (contenu à jour + suivi live).</p>
              )}
              <div className="mt-3 flex gap-2">
                <a href={localPatientUrl(c.id)} target="_blank" rel="noreferrer" className="btn-primary flex-1 justify-center gap-1.5 text-xs"><Icon name="external" className="h-3.5 w-3.5" />Ouvrir en 2ᵉ fenêtre</a>
                <button onClick={() => setShowQr(false)} className="btn-outline flex-1 justify-center text-xs">Fermer</button>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Fin de simulation */}
      {phase === 'play' && doneCount > 0 && (
        <div className="mt-6 flex justify-center">
          <button onClick={finishSimulation} className="btn-primary px-6">Terminer la simulation & voir le bilan →</button>
        </div>
      )}

    </div>
  );
}

// --------------------------------------------------------------- Zone de jeu
/** Nœud UNIQUE qui doit occuper deux emplacements selon l'état. On mesure
 *  UNIQUEMENT à l'état déployé : pendant la fusion les repères sont eux-mêmes
 *  en mouvement, et les lire à cet instant donnait une cible fausse — c'était
 *  la cause des à-coups au retour vers le haut. `top` reste donc constant et
 *  seule la translation s'anime (compositeur). */
function useTwoSlots(
  hostRef: React.RefObject<HTMLElement>,
  destRef: React.RefObject<HTMLElement>,
  restRef: React.RefObject<HTMLElement>,
  merged: boolean,
) {
  const [pos, setPos] = useState({ top: 0, shift: 0 });
  useLayoutEffect(() => {
    if (merged) return;
    const host = hostRef.current, dest = destRef.current, rest = restRef.current;
    if (!host || !dest || !rest) return;
    const h = host.getBoundingClientRect();
    const rd = dest.getBoundingClientRect(), rr = rest.getBoundingClientRect();
    const top = rd.top - h.top;
    const shift = (rr.top + rr.height / 2) - (rd.top + rd.height / 2);
    setPos((p) => (Math.abs(p.top - top) < 0.5 && Math.abs(p.shift - shift) < 0.5 ? p : { top, shift }));
  });
  return pos;
}

/** Porte le chrono de la partie en cours. Monté par `key={partKey}` : changer
 *  d'épreuve le remonte, donc le remet à zéro — c'est le comportement qu'assurait
 *  auparavant le remontage de PlayArea, désormais que le chrono est remonté dans
 *  l'en-tête (il doit vivre au-dessus de la zone d'examen pour pouvoir fusionner
 *  avec l'étiquette titre). */
function SimTimer({ target, initialElapsed, running, onElapsed, children }: {
  target: number; initialElapsed: number; running: boolean;
  onElapsed: (sec: number) => void;
  children: (timer: ReturnType<typeof useTimer>) => React.ReactNode;
}) {
  const timer = useTimer(target, initialElapsed, onElapsed, true);
  const setRunning = timer.setRunning;
  // Le chrono ne doit pas continuer à courir pendant l'écran d'évaluation.
  useEffect(() => { setRunning(running); }, [running, setRunning]);
  return <>{children(timer)}</>;
}

interface PlayAreaProps {
  part: Part; c: Case; assistance: AssistanceMode; muster: MusterCity;
  bogen: BogenNotes; setBogen: (b: BogenNotes) => void;
  arztbriefText: string; setArztbriefText: (t: string) => void;
}
// Le chrono ne vit plus ici : il est remonté dans l'en-tête pour pouvoir
// fusionner avec l'étiquette titre au défilement. PlayArea ne s'occupe donc
// plus que du contenu de l'épreuve.
function PlayArea({ part, c, assistance, muster, bogen, setBogen, arztbriefText, setArztbriefText }: PlayAreaProps) {
  return (
    <>
      {part === 'anamnese' && <AnamneseArea c={c} assistance={assistance} muster={muster} bogen={bogen} setBogen={setBogen} />}
      {part === 'dokumentation' && <ArztbriefGuide c={c} assistance={assistance} text={arztbriefText} onText={setArztbriefText} bogen={bogen} muster={muster} />}
      {part === 'fallvorstellung' && <VorstellungGuide c={c} assistance={assistance} bogen={bogen} muster={muster} />}
      {part === 'aufklaerung' && <AufklaerungArea c={c} />}
    </>
  );
}

function AnamneseArea({ c, assistance, muster, bogen, setBogen }: {
  c: Case; assistance: AssistanceMode; muster: MusterCity; bogen: BogenNotes; setBogen: (b: BogenNotes) => void;
}) {
  const [immersive, setImmersive] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Muster-Bogen : panneau latéral réductible sur le côté */}
        <SidePanel title="Muster-Bogen" icon="id" width="w-96">
          <AnamneseBogen muster={muster} notes={bogen} onChange={setBogen} assistance={assistance} />
        </SidePanel>
        {/* Guide interactif de questions par chapitre (+ Fachanamnese) */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between">
            <div className="label">Guide de questions {assistance === 'autonome' && <span className="text-[10px] text-violet-500">(Autonome : en tête)</span>}</div>
            <button onClick={() => setImmersive(true)} className="btn gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"><Icon name="target" className="h-3.5 w-3.5" />Mode focus</button>
          </div>
          <AnamneseGuide c={c} assistance={assistance} />
        </div>
      </div>
      <KommunikationPanel situationIds={c.kommunikativeSituationIds} />
      {immersive && <ImmersiveMode part="anamnese" c={c} onClose={() => setImmersive(false)} />}
    </div>
  );
}

function AufklaerungArea({ c }: { c: Case }) {
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="bolt" className="h-5 w-5 text-amber-500" />
        <div className="label">Aufklärung à la demande</div>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Le jury t'interrompt : « Klären Sie den Patienten auf. » Suis la trame en 7 blocs — ouvre l'acte concerné ci-dessous, explique à voix haute, gère les questions, puis évalue-toi.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {c.probableAufklaerungIds.map((id) => (
          <Link key={id} to={`/aufklaerung?open=${id}`} className="chip bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"><Icon name="nav-clipboard" className="h-3.5 w-3.5" />{id.replace('auf-', '')}</Link>
        ))}
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Bilan final
function ResultScreen({ sim, c }: { sim: Simulation; c: Case }) {
  const parts = Object.entries(sim.parts).filter(([, p]) => p?.done) as [Part, PartResult][];
  const avg = parts.length ? Math.round(parts.reduce((s, [, p]) => s + partScore(p), 0) / parts.length) : 0;
  const passed = sim.passed;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className={`card p-6 text-center ${passed ? 'border-emerald-300 dark:border-emerald-800' : 'border-amber-300 dark:border-amber-800'}`}>
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}><Icon name={passed ? 'spark' : 'flame'} className="h-8 w-8" /></div>
        <h1 className="mt-2 text-2xl font-bold">{passed ? 'Bestanden-Simulation !' : 'Encore un effort'}</h1>
        <p className="text-slate-500 dark:text-slate-400">{c.name} · score moyen {avg}%</p>
        <p className="mt-1 text-sm">{passed ? 'Toutes les parties tentées ≥ 60% (règle FSP).' : 'Au moins une partie sous les 60% — retravaille-la.'}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {parts.map(([k, p]) => {
          const sc = partScore(p);
          return (
            <div key={k} className="card p-4 text-center">
              <div className="label">{k}</div>
              <div className={`mt-1 text-2xl font-bold ${sc >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{sc}%</div>
              <div className="text-[11px] text-slate-400">contenu {p.contentPct}%{p.languageGrid ? ` · langue ${p.officialPct}%` : ''}</div>
            </div>
          );
        })}
      </div>

      {sim.prioritizedCorrections.length > 0 && (
        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="target" className="h-3.5 w-3.5" />Corrections prioritaires</div>
          <ul className="space-y-1.5 text-sm">
            {sim.prioritizedCorrections.map((corr, i) => <li key={i} className="flex gap-2"><span className="text-rose-400">→</span>{corr}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/fachbegriffe/drill" className="btn-primary gap-1.5"><Icon name="nav-abc" className="h-4 w-4" />Drill des termes du cas →</Link>
        <Link to={`/cas/${c.id}`} className="btn-outline">Revoir la fiche</Link>
        <Link to="/" className="btn-ghost">Accueil</Link>
      </div>
    </div>
  );
}

// Corrections prioritaires : dérivées des critères non cochés + langue faible.
function buildCorrections(parts: Partial<Record<Part, PartResult>>): string[] {
  const out: string[] = [];
  for (const [part, res] of Object.entries(parts)) {
    if (!res?.done) continue;
    const missed = res.checklist.filter((it) => !it.checked).slice(0, 2);
    for (const m of missed) out.push(`${part} — ${m.label}`);
    if (res.languageGrid) {
      const weak = Object.entries(res.languageGrid).filter(([, v]) => v <= 2);
      for (const [k] of weak) out.push(`${part} — Sprache: ${k} verbessern`);
    }
  }
  return out.slice(0, 6);
}
