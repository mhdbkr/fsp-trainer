import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SimTeil } from '@/db/types';
import type { CaseDialData } from '@/lib/dialData';
import { AnimatePresence, m, spring, useReducedMotion } from '@/lib/motion';
import { Portal } from '../Portal';
import { etatTeil, etiquette, lienAction, actionSuivante, lignesDetail, phrasePret, phraseReprise, resume, type EtatTeil } from './CaseDialText';
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
//     texte, « à confirmer » porte un liseré pétrole sur le bord de l'arc ;
//   · tant que les trois Teile ne sont pas joués, le chiffre et l'anneau intérieur
//     sont en ton discret : « 100 sur 1 Teil » ne se lit pas « fini ».
//
// OUVERTURE (le cœur de la demande : « élargit les cercles et dévoile des détails »).
// Le cadran GRANDIT jusqu'à ~96 px au-dessus de la carte (z-index, la grille ne bouge
// pas), les arcs s'écartent de 9 unités et s'épaississent, les repères Teil + score
// apparaissent, et le panneau de détail NAÎT du cadran (même origine de transformation)
// avec ses lignes qui arrivent l'une après l'autre. Tout est interruptible : CSS
// transition pour le cadran, ressort de lib/motion pour le panneau.
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
const ECART = 9;                                 // l'écart des arcs à l'ouverture, en unités
const R_REPERE = 63;                             // rayon des repères Teil + score
const TAILLE_OUVERTE = 96;                       // un cadran plus petit grandit jusqu'ici (px)
const POLICE_MIN = 11;                           // px de rendu : rien de plus petit (lisibilité)
/** Le facteur de grossissement à l'ouverture. */
const echelleOuverte = (size: number): number => (size < TAILLE_OUVERTE ? TAILLE_OUVERTE / size : 1.1);
const ANGLES: Record<SimTeil, [number, number]> = { anamnese: [-90, 30], dokumentation: [30, 150], fallvorstellung: [150, 270] };
const INITIALE: Record<SimTeil, string> = { anamnese: 'A', dokumentation: 'D', fallvorstellung: 'F' };

const vec = (r: number, deg: number): [number, number] => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
const polar = (r: number, deg: number): [number, number] => { const [x, y] = vec(r, deg); return [60 + x, 60 + y]; };
const arcPath = (a0: number, a1: number, r = R_OUT): string => {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

const COULEUR: Record<EtatTeil, string> = {
  vierge: 'var(--cd-vierge)', 'non-mesure': 'var(--cd-vierge)', fragile: 'var(--cd-fragile)',
  acquis: 'var(--cd-acquis)', 'a-confirmer': 'var(--cd-acquis)', solide: 'var(--cd-solide)',
};
const EPAISSEUR: Record<EtatTeil, number> = { vierge: 3, 'non-mesure': 4, fragile: 7, acquis: 7, 'a-confirmer': 7, solide: 7 };

// « Une fois » : ce qui s'est dessiné reste dessiné tant que l'onglet vit. Sans cela, filtrer la liste
// (les cartes se remontent) redessinerait chaque arc. La clé suit l'instant du dernier jeu : une
// nouvelle partie dessine à nouveau.
const dessines = new Set<string>();
/** Pour les tests : oublier ce qui a déjà été dessiné. */
export const oublieLesTraces = (): void => dessines.clear();

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
  const reduit = useReducedMotion() ?? false;   // motion l'écoute une fois, dans un seul MediaQueryList (comme MotionRoot)
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

  // La décision d'animer est prise au premier rendu et gardée : retirer la classe en cours de route
  // couperait l'animation net.
  const aDessiner = useRef<Set<string> | null>(null);
  if (aDessiner.current === null) {
    const ids = [...(data.vientDEtreJoue ?? []).map((t) => `${data.caseId}:${t}:${data.teile[t].lastAt}`), ...(vientDeSouder ? [`${data.caseId}:soude:${data.pretAt}`] : [])];
    aDessiner.current = new Set(ids.filter((k) => !dessines.has(k)));
  }
  useEffect(() => { aDessiner.current?.forEach((k) => dessines.add(k)); }, []);
  const trace = (t: SimTeil) => !reduit && !!aDessiner.current?.has(`${data.caseId}:${t}:${data.teile[t].lastAt}`);
  const soude = data.soude;
  const maitrise = data.maitrise;
  const etats = Object.fromEntries(TEILE.map(({ key }) => [key, etatTeil(data.teile[key])])) as Record<SimTeil, EtatTeil>;
  const avecCentre = size >= 64;
  const echelle = reduit ? 1 : echelleOuverte(size);       // sous mouvement réduit, rien ne grandit
  const avecRepere = size * echelle >= TAILLE_OUVERTE;      // un repère de moins de 11 px ne se lirait pas
  const taillePolice = (POLICE_MIN * 120) / (size * echelle);   // unités du viewBox → POLICE_MIN px de rendu à l'ouverture
  const complet = data.couverture === 3;                    // couleur pleine seulement avec les trois Teile

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
        style={{ width: Math.max(size, 44), height: Math.max(size, 44), '--cd-echelle': echelle } as React.CSSProperties}
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
        // Clavier et lecteur d'écran activent un bouton par un CLIC dont `detail` vaut 0 (Entrée, Espace, double-tap
        // VoiceOver/TalkBack). Un tap de souris ou de doigt (detail ≥ 1) n'ouvre rien : le geste est le survol ou l'appui long.
        onClick={(e) => {
          if (e.detail !== 0) return;
          if (ouvert) ferme(); else { parClavier.current = true; ouvre(); }
        }}
      >
        <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false">
          <circle className="cd-fond" cx="60" cy="60" r="70" />
          <circle cx="60" cy="60" r={R_IN} fill="none" stroke="var(--cd-piste)" strokeWidth="7" />
          {maitrise !== null && (
            <circle
              data-maitrise="" data-valeur={maitrise} data-complet={complet || undefined} cx="60" cy="60" r={R_IN} fill="none"
              stroke={complet ? 'var(--cd-maitrise)' : 'var(--cd-discret)'} strokeWidth="7"
              strokeLinecap="round" pathLength={100} strokeDasharray={`${Math.max(2, maitrise)} 100`} transform="rotate(-90 60 60)"
            />
          )}
          {soude ? (
            <g transform="rotate(-90 60 60)">
              <circle
                data-soude="" cx="60" cy="60" r={R_OUT} fill="none" stroke="var(--cd-solide)" strokeWidth="7" pathLength={1}
                className={`cd-soude${!reduit && aDessiner.current?.has(`${data.caseId}:soude:${data.pretAt}`) ? ' cd-soude-trace' : ''}`}
              />
            </g>
          ) : (
            TEILE.map(({ key }) => {
              const [de, a] = ANGLES[key];
              const milieu = (de + a) / 2;
              const d = arcPath(de + GAP / 2, a - GAP / 2);
              const [dx, dy] = vec(ECART, milieu);
              const etat = etats[key];
              const [lx, ly] = polar(R_REPERE, milieu);
              const score = data.teile[key].lastScore;
              return (
                <g key={key} className="cd-groupe" style={{ '--dx': `${dx.toFixed(2)}px`, '--dy': `${dy.toFixed(2)}px` } as React.CSSProperties}>
                  <path
                    data-arc={key} data-etat={etat} d={d} fill="none" stroke={COULEUR[etat]} strokeWidth={EPAISSEUR[etat]}
                    strokeLinecap="round" pathLength={1} strokeDasharray={etat === 'non-mesure' ? '0.07 0.05' : undefined}   /* pathLength = 1 : des tirets de 0,07 du tracé */
                    className={`cd-arc${trace(key) && etat !== 'vierge' && etat !== 'non-mesure' ? ' cd-trace' : ''}`}
                  />
                  {etat === 'a-confirmer' && (
                    // Liseré : le bord extérieur de l'arc est dessiné en pétrole profond, « sur le chemin du solide ».
                    <path data-liseret={key} d={arcPath(de + GAP / 2, a - GAP / 2, R_OUT + 5.25)} fill="none" stroke="var(--cd-solide)" strokeWidth="1.5" strokeLinecap="round" />
                  )}
                  {avecRepere && (
                    <text
                      className="cd-label" data-repere={key} x={lx.toFixed(1)} y={(ly + taillePolice * 0.35).toFixed(1)} fontSize={taillePolice.toFixed(2)}
                      textAnchor={lx < 56 ? 'end' : lx > 64 ? 'start' : 'middle'}
                    >
                      {INITIALE[key]}{score !== null ? ` ${score}` : ''}
                    </text>
                  )}
                </g>
              );
            })
          )}
          {avecCentre && (
            <>
              <text data-centre="" data-complet={complet || undefined} className="cd-num" x="60" y={size >= 160 ? 60 : 68} textAnchor="middle" fontSize={size >= 96 ? 22 : 28}>
                {maitrise === null ? '—' : maitrise}
              </text>
              {size >= 160 && <text className="cd-sub" x="60" y="76" textAnchor="middle" fontSize="8.25">maîtrise</text>}
            </>
          )}
        </svg>
      </button>

      <DetailFlottant
        ouvert={ouvert} data={data} nom={nom} action={action} ancre={ancre} size={size} echelle={echelle} refDetail={detail} reduit={reduit}
        onEntree={efface} onSortie={() => planifie(ferme, GRACE_MS)}
        onPerdFocus={(vers) => { if (!detail.current?.contains(vers) && vers !== bouton.current) ferme(); }}
        onTab={() => { ferme(); bouton.current?.focus(); }}      // le détail n'a qu'une cible : Tab (ou Maj+Tab) rend le focus au cadran
      />
    </>
  );
}

const L = 288;

/** Le détail naît du cadran : même origine de transformation, il grandit depuis lui. Verre plein, jamais d'ombre portée. */
function DetailFlottant({ ouvert, data, nom, action, ancre, size, echelle, refDetail, reduit, onEntree, onSortie, onPerdFocus, onTab }: {
  ouvert: boolean; data: CaseDialData; nom?: string; action: boolean; ancre: DOMRect | null; size: number; echelle: number;
  refDetail: React.RefObject<HTMLDivElement>; reduit: boolean;
  onEntree: () => void; onSortie: () => void; onPerdFocus: (vers: Node | null) => void; onTab: () => void;
}) {
  const [hauteur, setHauteur] = useState(240);
  useLayoutEffect(() => {
    const h = refDetail.current?.getBoundingClientRect().height;
    if (h) setHauteur(h);
  }, [refDetail, ouvert]);
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const largeur = Math.min(L, vw - 16);
  const a = ancre ?? new DOMRect(8, 8, 0, 0);
  const cx = a.left + a.width / 2;
  const cy = a.top + a.height / 2;
  const rayon = ((size * echelle) / 120) * 82;               // le cadran ouvert, repères compris
  const left = Math.max(8, Math.min(cx + 56 - largeur, vw - largeur - 8));
  const dessous = cy + rayon + 4;
  const top = Math.max(8, dessous + hauteur + 8 <= vh ? dessous : cy - rayon - 4 - hauteur);
  const mouvement = reduit ? {} : {
    initial: { opacity: 0, scale: 0.55 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.55 }, transition: spring,
  };

  // `fixed` dans un <Portal> (checkFixedOverlays) : un ancêtre en verre ou en transform en ferait un fixed de page.
  return (
    <Portal>
    <AnimatePresence>
    {ouvert && (
    <m.div
      {...mouvement}
      ref={refDetail}
      role="dialog"
      aria-label={nom ? `Détail de ${nom}` : 'Détail du cas'}
      data-panneau={reduit || undefined}
      tabIndex={-1}
      style={{ position: 'fixed', left, top, width: largeur, zIndex: 60, transformOrigin: `${cx - left}px ${cy - top}px` }}
      onPointerEnter={onEntree}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') onSortie(); }}
      onBlur={(e) => onPerdFocus(e.relatedTarget as Node | null)}
      onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); onTab(); } }}
      className="glass-full case-dial-detail rounded-card p-3 text-sm"
    >
      <CaseDialDetail data={data} action={action} />
    </m.div>
    )}
    </AnimatePresence>
    </Portal>
  );
}

/** Le contenu du détail, seul : chaque Teil avec son état, son score et sa date, la raison, l'action suivante.
 *  Exporté pour les écrans qui le montrent déjà ouvert (pré-simulation, fin de partie). */
export function CaseDialDetail({ data, action = true }: { data: CaseDialData; action?: boolean }) {
  const pret = phrasePret(data);
  const reprise = phraseReprise(data);
  const suite = actionSuivante(data);
  // `--i` : l'ordre d'arrivée des lignes (CSS `.case-dial-detail .cd-ligne`, sous no-preference seulement).
  const ligne = (i: number) => ({ '--i': i }) as React.CSSProperties;
  return (
    <div>
      <p className="cd-ligne cd-t1 font-semibold" style={ligne(0)}>{resume(data)}</p>
      <ul className="mt-2.5 space-y-2.5">
        {lignesDetail(data).map((l, i) => (
          <li key={l.teil} className="cd-ligne grid grid-cols-[10px_minmax(0,1fr)_auto] items-start gap-x-2.5" style={ligne(i + 1)}>
            <i aria-hidden="true" className="cd-pastille mt-1.5" data-etat={l.etat} />
            <span>
              <span className="cd-t1 block font-medium">{l.nom}</span>
              <span className="cd-t2 block text-xs">{l.mot}{l.quand ? ` · ${l.quand}` : ''}</span>
              {l.phrase && <span className="cd-t1 mt-0.5 block text-xs">{l.phrase}</span>}
            </span>
            <span className="cd-t1 font-mono text-sm tabular-nums">{l.score ?? ''}</span>
          </li>
        ))}
      </ul>
      {pret && <p className="cd-ligne cd-t1 mt-2.5 text-xs" style={ligne(4)}>{pret}</p>}
      {reprise && <p className="cd-ligne cd-t2 mt-1.5 text-xs" style={ligne(5)}>{reprise}</p>}
      {action && (
        <Link to={lienAction(data)} className="cd-ligne btn-primary mt-3 min-h-11 w-full justify-center text-xs" style={ligne(6)}>{suite.label}</Link>
      )}
    </div>
  );
}
