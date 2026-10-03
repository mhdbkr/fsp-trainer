// ============================================================================
// La carte recto/verso — UNE pour le drill, le tiroir (« Carte », D9) et la
// miniature de confirmation (D7). Sens « Terme → sens » : recto = terme, verso
// = la fiche (TermSheet, compacte en miniature). Sens « Sens → terme » : recto =
// Bedeutung (déjà la réponse du sens), verso = le terme seul. Carte personnelle
// sans Bedeutung : le recto « Sens → terme » masque le terme dans son contexte ;
// jamais de face vide, jamais la réponse au recto (F3 I-1). Le verso n'est
// monté qu'une fois retourné : la réponse n'est ni lue ni trouvée avant.
// ============================================================================
import { useEffect, useState } from 'react';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { isPersonalView } from '@/lib/collections/allTerms';
import { Icon } from './icons';
import { ipa, TermSheet } from './TermSheet';

export type CardDirection = 'term2simple' | 'simple2term';

// ponytail : masquage naïf (occurrences du terme entier, insensible à la casse, lookarounds
// Unicode — \b est ASCII-only) ; suffit pour un seul terme dans une phrase de contexte.
function maskTerm(text: string, term: string): string {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'giu'), '…');
}

/** Recto selon le sens. */
export function cardFront(card: AnyTerm, direction: CardDirection): string {
  if (direction === 'term2simple') return card.term;
  const bedeutung = card.translationSimple.trim();
  if (bedeutung) return bedeutung;
  const context = isPersonalView(card) ? card.context : undefined;
  return context ? maskTerm(context, card.term) : card.term;
}

/** Le sélecteur gravé dans la carte (F4c) : Recto | Verso, une pastille pétrole
 *  qui glisse sous la face visible. Hors de la surface qui tourne : jamais en miroir. */
function FaceSwitch({ revealed, onFlip, mini }: { revealed: boolean; onFlip: (revealed: boolean) => void; mini: boolean }) {
  return (
    <div role="group" aria-label="Face de la carte" className={`engraved absolute left-1/2 z-10 flex -translate-x-1/2 rounded-full p-0.5 font-medium ${mini ? 'bottom-2 text-xs' : 'bottom-4 text-sm'}`}>
      <span aria-hidden className={`absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] engraved-thumb rounded-full bg-brand-600 transition-transform duration-300 ease-fluid motion-reduce:transition-none dark:bg-brand-500 ${revealed ? 'translate-x-full' : ''}`} />
      {(['Recto', 'Verso'] as const).map((f) => {
        const on = (f === 'Verso') === revealed;
        return (
          <button key={f} type="button" aria-pressed={on} aria-keyshortcuts={f === 'Verso' && !mini ? 'Space' : undefined} onClick={() => onFlip(f === 'Verso')}
            className={`relative min-h-11 rounded-full transition-colors duration-300 ${mini ? 'w-16' : 'w-20'} ${on ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`}>{f}</button>
        );
      })}
    </div>
  );
}

/** L'indice discret (drill, miniature — retour du 4 oct. : le sélecteur y pesait trop) : une
 *  ligne fine au pied de la carte, flèche qui tourne au survol, « Espace » (ou « Toucher » sur
 *  écran tactile). C'est un vrai bouton : le clavier retourne la carte aussi par lui. */
function FlipHint({ onFlip, revealed, mini }: { onFlip: (revealed: boolean) => void; revealed: boolean; mini: boolean }) {
  return (
    <button type="button" data-flip-hint aria-label="Retourner la carte" aria-keyshortcuts="Space" onClick={() => onFlip(!revealed)}
      className={`absolute left-1/2 z-10 inline-flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full px-3 font-medium text-slate-400 transition-colors duration-300 hover:text-brand-700 group-hover/card:text-slate-500 dark:text-slate-500 dark:hover:text-brand-300 dark:group-hover/card:text-slate-400 ${mini ? 'bottom-0 text-[11px]' : 'bottom-2 text-xs'}`}>
      <Icon name="refresh" className="h-3.5 w-3.5 transition-transform duration-500 ease-fluid group-hover/card:rotate-180 motion-reduce:transition-none" />
      <kbd className="rounded border border-current px-1 font-mono text-[10.5px] leading-4 opacity-80 [@media(hover:none)]:hidden">Espace</kbd>
      <span className="hidden [@media(hover:none)]:inline">Toucher</span>
    </button>
  );
}

/** Toucher la carte la retourne (souris, doigt) ; le clavier passe par le sélecteur ou l'indice.
 *  Un contrôle DANS la carte (Définition complète, Modifier…) garde son clic, une sélection de texte aussi. */
const isControl = (t: EventTarget) => t instanceof Element && !!t.closest('button, a, input, textarea, summary, select, label');
const selecting = () => !!window.getSelection?.()?.toString();
/** Mouvement permis ? (pas sous prefers-reduced-motion, ni sans matchMedia — tests). */
const mayMove = () => typeof window !== 'undefined' && !!window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Une face cachée sort aussi du parcours clavier (ses contrôles ne sont pas atteignables). */
const hidden = (h: boolean) => (h ? { 'aria-hidden': true, inert: '' } : {}) as object;

/** `control` : « hint » (défaut — drill, miniature) = l'indice discret ; « switch » = le sélecteur
 *  Recto | Verso (tiroir d'un terme, où l'on va et vient entre les faces). */
export function CardFlip({ card, direction, revealed, onFlip, size = 'full', control = 'hint' }: {
  card: AnyTerm; direction: CardDirection; revealed: boolean; onFlip: (revealed: boolean) => void; size?: 'full' | 'mini'; control?: 'hint' | 'switch';
}) {
  const mini = size === 'mini';
  const personal = isPersonalView(card);
  // Le verso est monté au premier retournement — à mi-rotation, quand la carte est de profil :
  // la hauteur qui s'ajuste ne se voit pas — puis reste monté (revenir au recto ne tourne plus
  // vers un dos vide). La réponse n'est jamais dans le DOM avant d'avoir été montrée. Une
  // nouvelle carte = un nouveau composant (`key` côté appelant).
  const [seen, setSeen] = useState(revealed);
  useEffect(() => {
    if (!revealed || seen) return;
    if (!mayMove()) { setSeen(true); return; }
    const t = setTimeout(() => setSeen(true), 200);
    return () => clearTimeout(t);
  }, [revealed, seen]);
  // Faces empilées dans UNE cellule de grille : la carte prend la hauteur de sa face la plus haute
  // (le verso n'a plus à défiler, F4c) ; le recto garde une hauteur de carte.
  const face = `card flex flex-col items-center [backface-visibility:hidden] [grid-area:1/1] ${control === 'switch' ? (mini ? 'px-3 pb-14 pt-3' : 'px-6 pb-20 pt-7 sm:px-8') : mini ? 'px-3 pb-9 pt-3' : 'px-6 pb-14 pt-7 sm:px-8'}`;
  return (
    <div className="group/card relative [perspective:1200px]">
      <div data-card-flip={revealed ? 'verso' : 'recto'} onClick={(e) => { if (!isControl(e.target) && !selecting()) onFlip(!revealed); }}
        className={`grid cursor-pointer transition-transform duration-500 ease-fluid motion-reduce:transition-none [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
        <div className={`${face} ${mini ? 'min-h-40' : 'min-h-[320px]'} justify-center text-center`} {...hidden(revealed)}>
          <div className="label">{direction === 'term2simple' ? (personal ? 'Ma carte' : 'Fachbegriff') : 'Bedeutung'}{mini || personal ? '' : ` · ${card.specialty}`}</div>
          <div className={`${mini ? 'mt-1 text-lg' : 'mt-4 text-3xl'} font-display font-bold tracking-tightish`}>{cardFront(card, direction)}</div>
          {direction === 'term2simple' && card.pronunciation && !mini && <div className="ipa mt-1">{ipa(card.pronunciation)}</div>}
        </div>
        <div className={`${face} text-left [transform:rotateY(180deg)]`} {...hidden(!revealed)}>
          {seen && (direction === 'term2simple'
            ? <div className="w-full"><TermSheet term={card} compact={mini} /></div>
            : <div className="m-auto text-center">
                <div className={`${mini ? 'text-lg' : 'text-3xl'} font-display font-bold text-brand-700 dark:text-brand-300`}>{card.term}</div>
                {card.pronunciation && <div className="ipa mt-1">{ipa(card.pronunciation)}</div>}
              </div>)}
        </div>
      </div>
      {control === 'switch' ? <FaceSwitch revealed={revealed} onFlip={onFlip} mini={mini} /> : <FlipHint revealed={revealed} onFlip={onFlip} mini={mini} />}
    </div>
  );
}
