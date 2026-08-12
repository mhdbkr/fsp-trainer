import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '@/db/db';
import type { AssistanceMode, BogenNotes, Case, MusterCity, PartResult, SketchNotes, Simulation } from '@/db/types';
import { useCase } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useProfiles } from '@/store/profile';
import { useSimSession } from '@/store/simSession';
import { useTimer } from './useTimer';
import { computeAmbiance } from './timeAmbiance';
import { TimeAmbianceProvider, TimeCapsule } from './TimeCapsule';
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

  // En-tête condensé au défilement. Ce n'est PAS la fenêtre qui défile mais le
  // <main class="overflow-y-auto"> du layout : écouter `window` ne déclencherait
  // jamais rien. On remonte donc jusqu'au premier ancêtre réellement scrollable.
  // Deux seuils (90 px pour condenser, 40 px pour rouvrir) : sans cette
  // hystérésis, s'arrêter pile sur le seuil ferait osciller la barre.
  const headerRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
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
      setCondensed((prev) => (prev ? y > 40 : y > 90));
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

  return (
    <div>
      {/* Barre supérieure : capsule flottante à l'identité (arrondie, translucide).
          Elle se CONDENSE au défilement pour rendre l'espace à l'examen — seuls
          le titre et l'épreuve en cours subsistent, cette dernière glissant vers
          le centre. Tout est monté en permanence : ce sont la largeur et
          l'opacité qui s'animent, jamais un démontage (donc aucun saut). */}
      <div ref={headerRef} className={`sticky top-12 z-20 rounded-2xl border border-slate-200/70 bg-white/80 px-4 shadow-sm backdrop-blur-md transition-[padding] duration-500 ease-fluid dark:border-ink-600/70 dark:bg-ink-800/80 ${condensed ? 'py-2' : 'py-3'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <div className="text-sm font-bold">{c.name}</div>
              <div className={`grid transition-all duration-500 ease-fluid ${condensed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}`}>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    Médecin : {activeProfile?.name ?? '—'}
                    <span className={`chip py-0 text-[10px] ${assistance === 'autonome' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' : 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'}`}>
                      {assistance === 'autonome' ? 'Autonome' : 'Assisté'} · Couche {layer}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowQr(true)} title="Fiche patient sur un 2ᵉ écran"
              className={`btn-ghost overflow-hidden text-xs transition-all duration-500 ease-fluid ${condensed ? 'pointer-events-none w-0 scale-90 px-0 opacity-0' : 'w-auto opacity-100'}`}>
              <Icon name="id" className="h-4 w-4" /> QR
            </button>
          </div>
          {/* Aufklärung à la demande */}
          <button onClick={() => { setAufklaerungOpen(true); setPhase('play'); }}
            className={`chip ${aufklaerungOpen ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
            title="Le jury peut demander une Aufklärung à tout moment">
            <Icon name="bolt" className="h-3.5 w-3.5" />Aufklärung
          </button>
        </div>

        {/* Navigateur de modules graphique */}
        <div className={`flex items-center transition-all duration-500 ease-fluid ${condensed ? 'mt-1.5 justify-center' : 'mt-3'}`}>
          {FLOW.map((f, i) => {
            const isActive = active === f.key && !aufklaerungOpen;
            const isDone = !!results[f.key]?.done;
            // Condensé : seule l'épreuve en cours reste ; les autres se rétractent
            // à largeur nulle, ce qui fait GLISSER l'active vers le centre.
            const hidden = condensed && !isActive;
            return (
              <div key={f.key} className={`flex items-center transition-all duration-500 ease-fluid ${hidden ? 'w-0 flex-none opacity-0' : condensed ? 'flex-none opacity-100' : 'flex-1 opacity-100'}`}>
                <button
                  onClick={() => { setActive(f.key); setPhase('play'); setAufklaerungOpen(false); }}
                  className={`group flex flex-1 items-center justify-center gap-2 transition-all duration-500 ease-fluid ${hidden ? 'pointer-events-none scale-75' : ''} ${condensed ? 'flex-row' : 'flex-col gap-1'}`}
                >
                  <span className={`flex items-center justify-center rounded-full border-2 transition-all duration-500 ease-fluid ${condensed ? 'h-7 w-7' : 'h-10 w-10'} ${
                    isDone ? 'border-emerald-500 bg-emerald-500 text-white'
                    : isActive ? 'border-brand-600 bg-brand-600 text-white shadow-md scale-105'
                    : 'border-slate-300 bg-white text-slate-400 group-hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900'}`}>
                    {isDone ? '✓' : <Icon name={f.icon} className={condensed ? 'h-4 w-4' : 'h-5 w-5'} />}
                  </span>
                  <span className={`whitespace-nowrap text-[11px] font-medium transition-colors ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400'}`}>{f.label}</span>
                </button>
                {i < FLOW.length - 1 && (
                  <div className={`h-0.5 rounded transition-all duration-500 ease-fluid ${condensed ? 'mx-0 w-0 opacity-0' : 'mx-1 flex-1 -translate-y-2 opacity-100'} ${results[f.key]?.done ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {phase === 'eval' ? (
        <PartEvaluation
          part={aufklaerungOpen ? 'aufklaerung' : active}
          durationSec={0}
          onSave={(r) => savePart(aufklaerungOpen ? 'aufklaerung' : active, r)}
          onCancel={() => setPhase('play')}
        />
      ) : (
        <PlayArea
          key={aufklaerungOpen ? 'aufklaerung' : active}
          part={aufklaerungOpen ? 'aufklaerung' : active}
          c={c}
          assistance={assistance}
          muster={muster}
          bogen={bogen}
          setBogen={setBogen}
          arztbriefText={arztbriefText}
          setArztbriefText={setArztbriefText}
          target={target}
          stickyTop={headerH ? headerH + 56 : 120}
          initialElapsed={elapsed[aufklaerungOpen ? 'aufklaerung' : active] ?? 0}
          onElapsed={(sec) => { const k = aufklaerungOpen ? 'aufklaerung' : active; setElapsed((e) => (e[k] === sec ? e : { ...e, [k]: sec })); }}
          onEndPart={() => setPhase('eval')}
        />
      )}

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
interface PlayAreaProps {
  part: Part; c: Case; assistance: AssistanceMode; muster: MusterCity;
  bogen: BogenNotes; setBogen: (b: BogenNotes) => void;
  arztbriefText: string; setArztbriefText: (t: string) => void;
  target: number; stickyTop: number; initialElapsed: number; onElapsed: (sec: number) => void; onEndPart: () => void;
}
function PlayArea({ part, c, assistance, muster, bogen, setBogen, arztbriefText, setArztbriefText, target, stickyTop, initialElapsed, onElapsed, onEndPart }: PlayAreaProps) {
  // autoStart : le chrono démarre dès l'entrée dans la partie (pas de clic requis).
  const timer = useTimer(target, initialElapsed, onElapsed, true);

  const amb = computeAmbiance(timer.elapsed, target);

  return (
    <TimeAmbianceProvider elapsed={timer.elapsed} target={target}>
      {/* Capsule chrono ÉPINGLÉE — z-30 la place au-dessus de l'en-tête (z-20) :
          c'est la donnée qu'on ne doit jamais perdre de vue, elle ne peut donc
          pas passer sous la barre des épreuves en défilant. Le décalage `top`
          la pose juste sous l'en-tête une fois celui-ci condensé. */}
      <div className="sticky z-30 mb-4" style={{ top: stickyTop }}>
        <TimeCapsule
          amb={amb}
          remaining={timer.remaining}
          controls={
            <div className="flex gap-2">
              {!timer.running ? (
                <button onClick={timer.start} className="btn-primary text-xs"><Icon name="play" className="h-3.5 w-3.5" />{timer.elapsed ? 'Reprendre' : 'Démarrer'}</button>
              ) : (
                <button onClick={timer.pause} className="btn-outline text-xs">⏸ Pause</button>
              )}
              <button onClick={onEndPart} className="btn-outline text-xs">Terminer la partie ✓</button>
            </div>
          }
        />
      </div>

      {part === 'anamnese' && <AnamneseArea c={c} assistance={assistance} muster={muster} bogen={bogen} setBogen={setBogen} />}
      {part === 'dokumentation' && <ArztbriefGuide c={c} assistance={assistance} text={arztbriefText} onText={setArztbriefText} bogen={bogen} muster={muster} />}
      {part === 'fallvorstellung' && <VorstellungGuide c={c} assistance={assistance} bogen={bogen} muster={muster} />}
      {part === 'aufklaerung' && <AufklaerungArea c={c} />}
    </TimeAmbianceProvider>
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
