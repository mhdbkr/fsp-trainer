import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SimTeil } from '@/db/types';
import type { CaseDialData } from '@/lib/dialData';
import { AnimatePresence, appear, m } from '@/lib/motion';
import { Portal } from './Portal';
import { actionSuivante, etatTeil, etiquette, lignesDetail, phrasePret, phraseReprise, resume, type EtatTeil } from './CaseDialText';
import { TEILE } from '@/lib/simScope';

// ============================================================================
// Le cadran d'un cas (`CaseDial`, S4-4) — le signe unique d'un cas partout où il
// apparaît. UNE primitive, quatre tailles.
//
//   · POSITION = Teil (Anamnese en haut à droite, Dokumentation en bas,
//     Fallvorstellung à gauche : toujours au même endroit) ;
//   · COULEUR = état (vierge neutre — jamais un défaut —, fragile, acquis, solide) ;
//   · CENTRE = maîtrise ; anneau intérieur = maîtrise, anneau extérieur = trois
//     arcs (la couverture). Cas `prêt` : les arcs se SOUDENT en anneau continu.
//   · La couleur n'est jamais seule : étiquette accessible complète, détail en
//     texte, « à confirmer » porte un fil pétrole sur l'arc.
//
// INV-59 : le cadran LIT une `CaseDialData` (training-journal.md §12.7), il ne
// calcule rien — pas d'accès à la base, pas de lecture du journal.
// Mouvement (index.css, bloc `.case-dial`) : grossissement et écart des arcs
// sous `prefers-reduced-motion: no-preference` SEULEMENT ; en mouvement réduit,
// le détail s'ouvre en panneau immobile.
// ============================================================================

export type CaseDialSize = 36 | 64 | 96 | 160;

const R_IN = 33;
const R_OUT = 48;
const GAP = 7;                                   // degrés laissés entre deux arcs
const ANGLES: Record<SimTeil, [number, number]> = { anamnese: [-90, 30], dokumentation: [30, 150], fallvorstellung: [150, 270] };
const INITIALE: Record<SimTeil, string> = { anamnese: 'A', dokumentation: 'D', fallvorstellung: 'F' };

const vec = (r: number, deg: number): [number, number] => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
const polar = (r: number, deg: number): [number, number] => { const [x, y] = vec(r, deg); return [60 + x, 60 + y]; };
const arcPath = (a0: number, a1: number): string => {
  const [x0, y0] = polar(R_OUT, a0);
  const [x1, y1] = polar(R_OUT, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R_OUT} ${R_OUT} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const COULEUR: Record<EtatTeil, string> = {
  vierge: 'var(--cd-vierge)', 'non-mesure': 'var(--cd-vierge)', fragile: 'var(--cd-fragile)',
  acquis: 'var(--cd-acquis)', 'a-confirmer': 'var(--cd-acquis)', solide: 'var(--cd-solide)',
};
const EPAISSEUR: Record<EtatTeil, number> = { vierge: 3, 'non-mesure': 4, fragile: 7, acquis: 7, 'a-confirmer': 7, solide: 7 };

/** Le mouvement est-il réduit ? Relu au changement de réglage système. */
function useMouvementReduit(): boolean {
  const lit = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [reduit, setReduit] = useState(lit);
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined;
    if (!mq?.addEventListener) return;
    const on = () => setReduit(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduit;
}

const SURVOL_MS = 300;
const APPUI_LONG_MS = 450;
const GRACE_MS = 250;                            // le temps de passer du cadran au détail

export function CaseDial({ data, size = 64, nom, vientDeSouder = false, action = true }: {
  data: CaseDialData;
  size?: CaseDialSize;
  /** Le nom du cas, dit en tête de l'étiquette accessible. */
  nom?: string;
  /** Le cas vient de devenir `prêt` : l'anneau se soude d'un trait, avec une pulsation. */
  vientDeSouder?: boolean;
  /** Montrer l'action suivante dans le détail (inutile là où l'on est déjà dans le cas). */
  action?: boolean;
}) {
  const reduit = useMouvementReduit();
  const [ouvert, setOuvert] = useState(false);
  const [ancre, setAncre] = useState<DOMRect | null>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const parClavier = useRef(false);

  const efface = () => { clearTimeout(timer.current); };
  const planifie = (fn: () => void, ms: number) => { efface(); timer.current = setTimeout(fn, ms); };
  useEffect(() => efface, []);

  const ouvre = useCallback(() => { setAncre(bouton.current?.getBoundingClientRect() ?? null); setOuvert(true); }, []);
  const ferme = useCallback(() => setOuvert(false), []);

  // Ouvert : Échap, clic ailleurs, défilement referment. Le focus revient au cadran.
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOuvert(false); bouton.current?.focus(); } };
    const surAppui = (e: PointerEvent) => {
      const c = e.target as Node;
      if (!bouton.current?.contains(c) && !detail.current?.contains(c)) setOuvert(false);
    };
    const depuis = performance.now();
    const surDefilement = () => { if (performance.now() - depuis > 250) setOuvert(false); };
    document.addEventListener('keydown', surTouche);
    document.addEventListener('pointerdown', surAppui);
    document.addEventListener('scroll', surDefilement, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.removeEventListener('pointerdown', surAppui);
      document.removeEventListener('scroll', surDefilement, { capture: true });
    };
  }, [ouvert]);

  // Ouvert au clavier : le focus entre dans le détail (sur l'action).
  useEffect(() => {
    if (ouvert && parClavier.current) detail.current?.querySelector<HTMLElement>('a')?.focus();
    if (!ouvert) parClavier.current = false;
  }, [ouvert]);

  const soude = data.soude;
  const maitrise = data.maitrise;
  const etats = Object.fromEntries(TEILE.map(({ key }) => [key, etatTeil(data.teile[key])])) as Record<SimTeil, EtatTeil>;
  const joue = new Set(data.vientDEtreJoue ?? []);
  const avecCentre = size >= 64;
  const avecLegende = size >= 96;

  return (
    <>
      <button
        ref={bouton}
        type="button"
        className="case-dial"
        data-size={size}
        data-ouvert={ouvert || undefined}
        data-pret={soude}
        data-mouvement={reduit ? 'reduit' : undefined}
        style={{ width: Math.max(size, 44), height: Math.max(size, 44) }}
        aria-label={etiquette(data, nom)}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') planifie(ouvre, SURVOL_MS); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') planifie(ferme, GRACE_MS); else efface(); }}
        onPointerDown={(e) => {
          if (e.pointerType === 'mouse') return;
          planifie(() => {
            if (ouvert) ferme(); else ouvre();
            try { navigator.vibrate?.(12); } catch { /* pas de vibration sur cet appareil */ }
          }, APPUI_LONG_MS);
        }}
        onPointerUp={(e) => { if (e.pointerType !== 'mouse') efface(); }}
        onPointerCancel={efface}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          if (ouvert) ferme(); else { parClavier.current = true; ouvre(); }
        }}
      >
        <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
          <circle cx="60" cy="60" r={R_IN} fill="none" stroke="var(--cd-piste)" strokeWidth="7" />
          {maitrise !== null && (
            <circle
              data-maitrise="" data-valeur={maitrise} cx="60" cy="60" r={R_IN} fill="none" stroke="var(--cd-maitrise)" strokeWidth="7"
              strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(2, maitrise)} 100`} transform="rotate(-90 60 60)"
            />
          )}
          {soude ? (
            <g transform="rotate(-90 60 60)">
              <circle
                data-soude="" cx="60" cy="60" r={R_OUT} fill="none" stroke="var(--cd-solide)" strokeWidth="7" pathLength={1}
                className={`cd-soude${vientDeSouder && !reduit ? ' cd-soude-trace' : ''}`}
              />
            </g>
          ) : (
            TEILE.map(({ key }) => {
              const [de, a] = ANGLES[key];
              const d = arcPath(de + GAP / 2, a - GAP / 2);
              const [dx, dy] = vec(5, (de + a) / 2);           // l'écart d'ouverture : 5 unités vers l'extérieur
              const etat = etats[key];
              const [lx, ly] = polar(64, (de + a) / 2);
              return (
                <g key={key} className="cd-groupe" style={{ '--dx': `${dx.toFixed(2)}px`, '--dy': `${dy.toFixed(2)}px` } as React.CSSProperties}>
                  <path
                    data-arc={key} data-etat={etat} d={d} fill="none" stroke={COULEUR[etat]} strokeWidth={EPAISSEUR[etat]}
                    strokeLinecap="round" pathLength={1} strokeDasharray={etat === 'non-mesure' ? '3 4' : undefined}
                    className={`cd-arc${joue.has(key) && etat !== 'vierge' && etat !== 'non-mesure' && !reduit ? ' cd-trace' : ''}`}
                  />
                  {etat === 'a-confirmer' && (
                    <path data-fil={key} d={d} fill="none" stroke="var(--cd-solide)" strokeWidth="2" strokeLinecap="round" />
                  )}
                  {avecLegende && (
                    <text className="cd-label" x={lx.toFixed(1)} y={(ly + 3).toFixed(1)} fontSize="8" textAnchor={lx < 56 ? 'end' : lx > 64 ? 'start' : 'middle'}>
                      {INITIALE[key]}{data.teile[key].lastScore !== null ? ` ${data.teile[key].lastScore}` : ''}
                    </text>
                  )}
                </g>
              );
            })
          )}
          {avecCentre && (
            <>
              <text data-centre="" className="cd-num" x="60" y={avecLegende ? 60 : 68} textAnchor="middle" fontSize={avecLegende ? 22 : 28}>
                {maitrise === null ? '—' : maitrise}
              </text>
              {avecLegende && <text className="cd-sub" x="60" y="76" textAnchor="middle" fontSize="7.5">maîtrise</text>}
            </>
          )}
        </svg>
      </button>

      <AnimatePresence>
        {ouvert && (
          <Portal>
            <DetailFlottant
              key="detail" data={data} nom={nom} action={action} ancre={ancre} refDetail={detail} reduit={reduit}
              onEntree={efface} onSortie={() => planifie(ferme, GRACE_MS)}
              onPerdFocus={(vers) => { if (!detail.current?.contains(vers) && vers !== bouton.current) ferme(); }}
            />
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}

const L = 288;

/** Le détail, ancré sous le cadran. Verre plein (matériau flottant), jamais d'ombre portée. */
function DetailFlottant({ data, nom, action, ancre, refDetail, reduit, onEntree, onSortie, onPerdFocus }: {
  data: CaseDialData; nom?: string; action: boolean; ancre: DOMRect | null; refDetail: React.RefObject<HTMLDivElement>; reduit: boolean;
  onEntree: () => void; onSortie: () => void; onPerdFocus: (vers: Node | null) => void;
}) {
  const [hauteur, setHauteur] = useState(220);
  useLayoutEffect(() => {
    const h = refDetail.current?.getBoundingClientRect().height;
    if (h) setHauteur(h);
  }, [refDetail]);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const largeur = Math.min(L, vw - 16);
  const a = ancre ?? new DOMRect(8, 8, 0, 0);
  const left = Math.max(8, Math.min(a.right - largeur, vw - largeur - 8));
  const dessous = a.bottom + 12;
  const top = Math.max(8, dessous + hauteur + 8 <= vh ? dessous : a.top - 12 - hauteur);

  return (
    <m.div
      {...(reduit ? {} : appear)}
      ref={refDetail}
      role="dialog"
      aria-label={nom ? `Détail de ${nom}` : 'Détail du cas'}
      data-panneau={reduit || undefined}
      tabIndex={-1}
      style={{ position: 'fixed', left, top, width: largeur, zIndex: 60 }}
      onPointerEnter={onEntree}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onSortie(); }}
      onBlur={(e) => onPerdFocus(e.relatedTarget as Node | null)}
      className="glass-full case-dial-detail rounded-xl p-3 text-sm"
    >
      <CaseDialDetail data={data} action={action} />
    </m.div>
  );
}

/** Le contenu du détail, seul : chaque Teil avec son état, son score et sa date, la raison, l'action suivante.
 *  Exporté pour les écrans qui le montrent déjà ouvert (pré-simulation, fin de partie). */
export function CaseDialDetail({ data, action = true }: { data: CaseDialData; action?: boolean }) {
  const pret = phrasePret(data);
  const reprise = phraseReprise(data);
  const suite = actionSuivante(data);
  const lien = `/simulation/${data.caseId}/pre${suite.teil ? `?teil=${suite.teil}` : ''}`;
  return (
    <div>
      <p className="font-semibold text-slate-800 dark:text-slate-100">{resume(data)}</p>
      <ul className="mt-2.5 space-y-2.5">
        {lignesDetail(data).map((l) => (
          <li key={l.teil} className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-2.5">
            <i aria-hidden="true" className="cd-pastille mt-1.5" data-etat={l.etat} />
            <span>
              <span className="block font-medium text-slate-800 dark:text-slate-100">{l.nom}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{l.mot}{l.quand ? ` · ${l.quand}` : ''}</span>
              {l.phrase && <span className="mt-0.5 block text-xs text-slate-600 dark:text-slate-300">{l.phrase}</span>}
            </span>
            <span className="font-mono text-sm tabular-nums text-slate-700 dark:text-slate-200">{l.score ?? ''}</span>
          </li>
        ))}
      </ul>
      {pret && <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300">{pret}</p>}
      {reprise && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{reprise}</p>}
      {action && (
        <Link to={lien} className="btn-primary mt-3 min-h-11 w-full justify-center text-xs">{suite.label}</Link>
      )}
    </div>
  );
}
