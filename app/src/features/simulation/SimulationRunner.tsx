import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { TEILE, isTeil, caseMastery } from '@/lib/simScope';
import { db } from '@/db/db';
import type { AssistanceMode, BogenNotes, Case, MusterCity, PartResult, SketchNotes, Simulation } from '@/db/types';
import { useCase, useAufklaerungen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { syncQueue } from '@/lib/sync/queue';
import { useSimSession } from '@/store/simSession';
import { CaseTermsPanel } from '@/features/fachbegriffe/CaseTermsPanel';
import { CaseContext } from '@/features/fachbegriffe/CaseContext';
import { termsOfCase } from '@/lib/collections/caseTerms';
import { useTimer } from './useTimer';
import { computeAmbiance } from './timeAmbiance';
import { TimeAmbianceProvider, TimeFace, timeGlass } from './TimeCapsule';
import { Portal } from '@/components/Portal';
import { PartEvaluation } from './PartEvaluation';
import { partScore } from '@/lib/scoring';
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
import { CAT_META } from '@/features/aufklaerung/AufklaerungPage';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';
const FLOW: { key: Part; label: string; target: number; icon: string }[] = [
  { key: 'anamnese', label: 'Anamnese', target: 20 * 60, icon: 'pain' },
  { key: 'dokumentation', label: 'Dokumentation', target: 20 * 60, icon: 'history' },
  { key: 'fallvorstellung', label: 'Fallvorstellung', target: 12 * 60, icon: 'stethoscope' },
];

export function SimulationRunner() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Mode (FB2-P) : ?teil=anamnese|dokumentation|fallvorstellung → un seul Teil ;
  // sinon la simulation complète. Le fil des parties se restreint au mode.
  const teilParam = params.get('teil');
  const session0 = useSimSession.getState().snapshot;
  // Reprise d'une session en pause : son mode fait foi si l'URL ne le porte pas.
  const teil = isTeil(teilParam) ? teilParam : (session0 && session0.caseId === caseId && session0.teil) || null;
  const flow = teil ? FLOW.filter((f) => f.key === teil) : FLOW;
  const c = useCase(caseId);
  const assistance = useUi((s) => s.assistance);
  const layer = useUi((s) => s.layer);
  const muster = useUi((s) => s.muster);
  const session = useSimSession();

  // Restaure une session en pause pour ce cas (sinon départ à zéro).
  const restore = session.snapshot && session.snapshot.caseId === caseId ? session.snapshot : null;
  const [active, setActive] = useState<Part>(restore?.active ?? teil ?? 'anamnese');
  const [phase, setPhase] = useState<'play' | 'eval'>(restore?.phase ?? 'play');
  const [notes] = useState<SketchNotes>({}); // legacy croquis (remplacé par le Bogen structuré)
  const [bogen, setBogen] = useState<BogenNotes>(restore?.bogen ?? {});
  const [arztbriefText, setArztbriefText] = useState(restore?.arztbriefText ?? '');
  const [results, setResults] = useState<Partial<Record<Part, PartResult>>>(restore?.results ?? {});
  const [aufklaerungOpen, setAufklaerungOpen] = useState(restore?.aufklaerungOpen ?? false);
  const [elapsed, setElapsed] = useState<Partial<Record<Part, number>>>(restore?.elapsed ?? {});
  const [finished, setFinished] = useState<Simulation | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  // Compte réel des termes du cas (liés ∪ marqués pendant la session) pour le
  // chip — une approximation via linkedFachbegriffeIds seul sous-compterait
  // les termes ajoutés en cours de route.
  const begriffe = useFachbegriffe();
  const termEvents = useLiveQuery(() => db.progress_events.where('type').anyOf(['term.favorited', 'deck.term_added']).toArray(), []);
  const termCount = c && begriffe ? termsOfCase(c.id, begriffe, c, termEvents ?? []).length : 0;

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
  const chronoRef = useRef<HTMLDivElement>(null);
  const chronoPrev = useRef<DOMRect | null>(null);
  const ctrlRef = useRef<HTMLDivElement>(null);
  const ctrlPrev = useRef<DOMRect | null>(null);
  const [merged, setMerged] = useState(false);
  const [headerH, setHeaderH] = useState(0);
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
      setMerged((prev) => {
        const next = prev ? y > 40 : y > 90;
        // FLIP — on relève la position AVANT que React ne re-dispose. Sans ce
        // relevé antérieur, toute mesure faite après coup lit une position déjà
        // en mouvement : c'était l'origine des à-coups.
        if (next !== prev) {
          if (chronoRef.current) chronoPrev.current = chronoRef.current.getBoundingClientRect();
          if (ctrlRef.current) ctrlPrev.current = ctrlRef.current.getBoundingClientRect();
        }
        return next;
      });
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

  // FLIP : on inverse l'écart puis on laisse filer vers zéro. `el.animate`
  // s'exécute sur le compositeur, hors du cycle de rendu React — aucune classe
  // CSS concurrente, aucune propriété de disposition animée.
  useLayoutEffect(() => {
    const play = (el: HTMLElement | null, prev: DOMRect | null) => {
      if (!el || !prev) return;
      const now = el.getBoundingClientRect();
      const dx = prev.left - now.left, dy = prev.top - now.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 460, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      );
    };
    play(chronoRef.current, chronoPrev.current);
    play(ctrlRef.current, ctrlPrev.current);
    chronoPrev.current = null;
    ctrlPrev.current = null;
  }, [merged]);

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
    useSimSession.getState().sync({ caseId: c.id, caseName: c.name, active, phase, bogen, arztbriefText, results, aufklaerungOpen, elapsed, teil });
  }, [c, finished, active, phase, bogen, arztbriefText, results, aufklaerungOpen, elapsed]);

  if (!c) return <div className="text-slate-400">Chargement…</div>;
  if (finished) return <ResultScreen sim={finished} c={c} />;

  const target = (aufklaerungOpen ? 5 * 60 : flow.find((f) => f.key === active)?.target) ?? 20 * 60;

  const savePart = async (part: Part, res: PartResult) => {
    setResults((r) => ({ ...r, [part]: res }));
    setPhase('play');
    if (part === 'aufklaerung') { setAufklaerungOpen(false); setActive('anamnese'); return; }
    // avance à la partie suivante
    const idx = flow.findIndex((f) => f.key === part);
    if (idx < flow.length - 1) setActive(flow[idx + 1].key);
  };

  const finishSimulation = async () => {
    const parts = { ...results };
    const sim: Simulation = {
      id: `sim-${Date.now()}`,
      caseId: c.id,
      date: Date.now(),
      parts,
      notes,
      bogen,
      arztbriefText,
      prioritizedCorrections: buildCorrections(parts),
      passed: Object.values(parts).filter((p) => p?.done).every((p) => partScore(p!) >= 60),
      assistance, layer, muster,
      scope: teil ? 'teil' : 'full', teil: teil ?? undefined,
    };
    await db.simulations.put(sim);
    // La sync ne doit jamais bloquer la fin de simulation : la sauvegarde
    // locale est faite, un échec d'enfilement se journalise sans casser l'écran.
    syncQueue.push({ type: 'simulation.completed', subject_id: c.id, payload: sim }).catch((e) => console.warn('[sync]', e));
    // met à jour confiance + statut du cas — confiance pondérée (assistance × couche)
    const done = Object.values(parts).filter((p): p is PartResult => !!p?.done);
    // Toute session fait avancer le cas (FB2-P, retour direction) : la
    // confiance est la maîtrise au prorata des trois parties, dernière
    // session de chaque partie comprise — celle-ci incluse.
    if (done.length) {
      const prior = await db.simulations.where('caseId').equals(c.id).toArray();
      const mastery = caseMastery(prior, c.id, sim).score ?? 0;
      const conf = Math.round(mastery * (assistance === 'autonome' ? 1 : 0.9));
      const status = conf >= 80 ? 'Maîtrisé' : conf >= 40 ? 'En cours' : 'À faire';
      await db.cases.update(c.id, { confidence: conf, status, lastSimulationId: sim.id, layerProgress: layer });
      syncQueue.push({ type: 'case.layer_reached', subject_id: c.id, payload: { layer } }).catch((e) => console.warn('[sync]', e));
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
    <CaseContext.Provider value={c.id}>
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
          const navIdx = Math.max(0, flow.findIndex((f) => f.key === active));
          return (
            <TimeAmbianceProvider elapsed={timer.elapsed} target={target}>
              {/* Les DEUX étiquettes vivent dans le MÊME conteneur collant.
                  C'est ce qui rend la fusion possible sans saccade : rien ne se
                  téléporte d'une carte à l'autre, on ferme seulement l'espace
                  et on soude les bordures. Chaque élément reste monté. */}
              {/* DEUX barres au repos (identité + parcours / chrono +
                  commandes) qui n'en forment plus qu'UNE en défilant.
                  Géométrie en CONSTANTES et non mesurée : les repères mesurés
                  bougeaient eux-mêmes pendant la transition, ce qui donnait des
                  cibles fausses et les à-coups. Ici les hauteurs sont fixées,
                  donc les positions sont exactes à tout instant.
                  Le chrono et les commandes sont des nœuds UNIQUES en position
                  absolue : leur `top` change d'un coup, et c'est le FLIP qui
                  joue le trajet en translation pure (compositeur). */}
              <div ref={headerRef}
                className={`sticky top-14 z-30 relative flex flex-col transition-[gap] duration-[440ms] ease-fluid ${merged ? 'gap-0' : 'gap-2.5'}`}>

                {/* Surface UNIQUE de l'état fusionné — supprime toute jointure */}
                <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-[440ms] ease-fluid"
                  style={{ ...timeGlass(amb, 1), opacity: merged ? 1 : 0 }} />

                {/* ── Barre 1 — identité + parcours ─────────────────────── */}
                <div className={`relative rounded-2xl px-4 transition-[height] duration-[440ms] ease-fluid ${merged ? 'h-[100px]' : 'h-[128px]'}`}>
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-[440ms] ease-fluid"
                    style={{ ...timeGlass(amb, 0.75), opacity: merged ? 0 : 1 }} />

                  {/* Titre — descend un peu en fusionnant et grossit légèrement */}
                  <div className={`absolute left-4 origin-left truncate pr-4 text-sm font-bold transition-[top,transform] duration-[440ms] ease-fluid ${merged ? 'top-[16px] scale-[1.14]' : 'top-[10px] scale-100'}`}
                    style={{ maxWidth: 'calc(60% - 1rem)' }}>{c.name}</div>

                  {/* Ligne mode / couche */}
                  <div className={`pointer-events-none absolute left-4 top-[30px] flex items-center gap-1.5 text-[11px] text-slate-400 transition-opacity duration-300 ${merged ? 'opacity-0' : 'opacity-100'}`}>
                    <span className={`chip whitespace-nowrap py-0 text-[10px] ${assistance === 'autonome' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
                      {assistance === 'autonome' ? 'Autonome' : 'Assisté'} · Couche {layer}{teil ? ` · ${TEILE.find((t) => t.key === teil)?.label} seule` : ''}
                    </span>
                  </div>

                  {/* QR + Aufklärung — cèdent le coin aux commandes */}
                  <div className={`absolute right-4 top-[8px] flex items-center gap-2 whitespace-nowrap transition-opacity duration-300 ${merged ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
                    <button onClick={() => setShowQr(true)} title="Fiche patient sur un 2ᵉ écran" className="btn-ghost text-xs">
                      <Icon name="id" className="h-4 w-4" /> QR
                    </button>
                    <button onClick={() => { setAufklaerungOpen(true); setPhase('play'); }}
                      className={`chip shrink-0 ${aufklaerungOpen ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
                      title="Le jury peut demander une Aufklärung à tout moment">
                      <Icon name="bolt" className="h-3.5 w-3.5" />Aufklärung
                    </button>
                    <button onClick={() => setTermsOpen(true)}
                      className="chip shrink-0 bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                      title="Termes du cas — référence libre">
                      <Icon name="nav-abc" className="h-3.5 w-3.5" />Fachbegriffe ({termCount})
                    </button>
                  </div>

                  {/* Parcours — en bas au repos ; parfaitement centré (des deux
                      axes) une fois fusionné. */}
                  <div className={`absolute inset-x-4 overflow-hidden transition-[top,height] duration-[440ms] ease-fluid ${merged ? 'top-[22px] h-[62px]' : 'top-[58px] h-[62px]'}`}>
                    <div className="grid h-full transition-transform duration-[440ms] ease-fluid"
                      style={{ gridTemplateColumns: `repeat(${flow.length}, minmax(0, 1fr))`,
                               transform: `translateX(${merged ? (1 - navIdx) * (100 / flow.length) : 0}%)` }}>
                      {flow.map((f, i) => {
                        const isActive = active === f.key && !aufklaerungOpen;
                        const isDone = !!results[f.key]?.done;
                        return (
                          <div key={f.key} className={`relative flex min-w-0 flex-col items-center justify-center transition-opacity duration-300 ${merged && !isActive ? 'opacity-0' : 'opacity-100'}`}>
                            {i < flow.length - 1 && (
                              <span aria-hidden
                                className={`absolute top-[19px] h-0.5 -translate-y-1/2 rounded transition-opacity duration-300 ${merged ? 'opacity-0' : 'opacity-100'} ${isDone ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`}
                                style={{ left: 'calc(50% + 34px)', width: 'calc(100% - 68px)' }} />
                            )}
                            <button
                              onClick={() => { setActive(f.key); setPhase('play'); setAufklaerungOpen(false); }}
                              className="group relative z-10 flex flex-col items-center gap-1"
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

                {/* ── Barre 2 — chrono + commandes (se replie en fusionnant) ── */}
                <div className={`relative rounded-2xl transition-[height] duration-[440ms] ease-fluid ${merged ? 'h-0' : 'h-[56px]'}`}>
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-[440ms] ease-fluid"
                    style={{ ...timeGlass(amb, 1), opacity: merged ? 0 : 1 }} />
                </div>

                {/* Chrono — remonte au plus près du titre en fusionnant */}
                <div ref={chronoRef} className="absolute left-4 z-10"
                  style={{ top: merged ? 42 : 148 }}>
                  <TimeFace amb={amb} remaining={timer.remaining} />
                </div>

                {/* Commandes — regagnent le coin haut-droit libéré.
                    `top` vise la LIGNE MÉDIANE de la barre courante (fusionnée :
                    100/2 ; au repos : barre 2 à 138 px sur 56 de haut, donc
                    138+28), et l'enveloppe intérieure remonte d'une demi-hauteur.
                    Le centrage est ainsi exact quelle que soit la hauteur réelle
                    des boutons, sans valeur devinée.
                    Ce translate vit sur l'enveloppe INTÉRIEURE : celui du FLIP
                    s'applique à l'extérieure, les deux ne se marchent pas dessus. */}
                <div ref={ctrlRef} className="absolute right-4 z-10"
                  style={{ top: merged ? 50 : 166 }}>
                  <div className="flex -translate-y-1/2 gap-2">
                    {!timer.running ? (
                      <button onClick={timer.start} className="btn-primary text-xs"><Icon name="play" className="h-3.5 w-3.5" />{timer.elapsed ? 'Reprendre' : 'Démarrer'}</button>
                    ) : (
                      <button onClick={timer.pause} className="btn-outline text-xs">⏸ Pause</button>
                    )}
                    <button onClick={() => setPhase('eval')} className="btn-outline text-xs">Terminer la partie ✓</button>
                  </div>
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
          <button onClick={finishSimulation} className="btn-primary px-6">{teil ? `Terminer — ${TEILE.find((t) => t.key === teil)?.label} seule → bilan` : 'Terminer la simulation & voir le bilan →'}</button>
        </div>
      )}

      {/* Termes du cas — référence libre (F2a D6), tiroir. Pause explicite de
          la session avant de quitter : le sync miroir tourne déjà sur chaque
          changement, mais on force un dernier appel pour être certain que
          l'instantané est à jour au moment précis où l'on minimise. */}
      {termsOpen && (
        <CaseTermsPanel
          caseId={c.id}
          mode="drawer"
          onClose={() => setTermsOpen(false)}
          onDrill={() => {
            useSimSession.getState().sync({ caseId: c.id, caseName: c.name, active, phase, bogen, arztbriefText, results, aufklaerungOpen, elapsed, teil });
            useSimSession.getState().minimize();
            navigate(`/fachbegriffe/drill?case=${c.id}`);
          }}
        />
      )}
    </div>
    </CaseContext.Provider>
  );
}

// --------------------------------------------------------------- Zone de jeu
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
      {immersive && <ImmersiveMode part="anamnese" c={c} onClose={() => setImmersive(false)} muster={muster} bogen={bogen} setBogen={setBogen} />}
    </div>
  );
}

function AufklaerungArea({ c }: { c: Case }) {
  const all = useAufklaerungen() ?? [];
  // Les actes LIÉS au cas d'abord, en vraies cartes : c'est ce que le jury va
  // demander. Les autres restent accessibles, mais en second plan — avant, la
  // zone n'affichait que des ids bruts (« gastroskopie ») en petits chips, et
  // la page paraissait vide.
  const linked = all.filter((a) => c.probableAufklaerungIds.includes(a.id));
  const others = all.filter((a) => !c.probableAufklaerungIds.includes(a.id));
  const firstSentence = (t: string) => (t.match(/^[^.!?]+[.!?]/)?.[0] ?? t).trim();

  return (
    <div className="space-y-4">
      <div className="card card-accent p-5 pl-6">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"><Icon name="bolt" className="h-5 w-5" /></span>
          <div className="min-w-0">
            <div className="eyebrow">Aufklärung à la demande</div>
            <h2 className="mt-1 font-display text-[17px] font-semibold tracking-tightish">« Klären Sie den Patienten auf. »</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Le jury t'interrompt. Ouvre l'acte concerné : tu arrives directement sur sa trame en 7 étapes, explique à voix haute, gère les questions du patient, puis évalue-toi.</p>
          </div>
        </div>
      </div>

      {linked.length > 0 && (
        <div>
          <div className="label mb-2">Probable pour ce cas</div>
          <div className="grid gap-3 sm:grid-cols-2">
            {linked.map((a) => {
              const cat = CAT_META[a.category];
              return (
                <Link key={a.id} to={`/aufklaerung?open=${a.id}`}
                  className="card card-interactive group flex flex-col gap-2.5 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cat.cls}`}><Icon name={cat.icon} className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{a.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <span className={`chip py-0 text-[10px] ${cat.cls}`}>{cat.label}</span>
                        {a.shortName && <span className="mono-tag">{a.shortName}</span>}
                      </div>
                    </div>
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{firstSentence(a.blocks.warum)}</p>
                  <span className="mt-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-300">Ouvrir la trame <Icon name="chevron" className="h-3.5 w-3.5" /></span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <div className="label mb-2">{linked.length ? 'Autres actes' : 'Tous les actes'}</div>
          <div className="flex flex-wrap gap-2">
            {others.map((a) => {
              const cat = CAT_META[a.category];
              return (
                <Link key={a.id} to={`/aufklaerung?open=${a.id}`} className="chip bg-slate-100 text-slate-700 hover:bg-brand-100 hover:text-brand-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-900/40">
                  <Icon name={cat.icon} className="h-3.5 w-3.5 opacity-70" />{a.shortName ?? a.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------- Bilan final
export function ResultScreen({ sim, c }: { sim: Simulation; c: Case }) {
  const parts = Object.entries(sim.parts).filter(([, p]) => p?.done) as [Part, PartResult][];
  const avg = parts.length ? Math.round(parts.reduce((s, [, p]) => s + partScore(p), 0) / parts.length) : 0;
  const passed = sim.passed;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className={`card p-6 text-center ${passed ? 'border-emerald-300 dark:border-emerald-800' : 'border-amber-300 dark:border-amber-800'}`}>
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${passed ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}><Icon name={passed ? 'spark' : 'flame'} className="h-8 w-8" /></div>
        <h1 className="mt-2 text-2xl font-bold">{passed ? 'Bestanden-Simulation !' : 'Encore un effort'}</h1>
        <p className="text-slate-500 dark:text-slate-400">{c.name} · score moyen {avg}%</p>
        <p className="mt-1 text-sm">{sim.scope === 'teil' ? (passed ? 'Cette partie ≥ 60 % (règle FSP). Elle compte pour un tiers de la maîtrise du cas et remet ton programme à jour.' : 'Cette partie est sous les 60 % — retravaille-la.') : passed ? 'Toutes les parties tentées ≥ 60% (règle FSP).' : 'Au moins une partie sous les 60% — retravaille-la.'}</p>
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
        <Link to={`/fachbegriffe/drill?case=${c.id}`} className="btn-primary gap-1.5"><Icon name="nav-abc" className="h-4 w-4" />Drill des termes du cas →</Link>
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
