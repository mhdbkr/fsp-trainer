// ============================================================================
// La carte recto/verso — UNE pour le drill, le tiroir (« Carte », D9) et la
// miniature de confirmation (D7). Sens « Terme → sens » : recto = terme, verso
// = la fiche (TermSheet, compacte en miniature). Sens « Sens → terme » : recto =
// Bedeutung (déjà la réponse du sens), verso = le terme seul. Carte personnelle
// sans Bedeutung : le recto « Sens → terme » masque le terme dans son contexte ;
// jamais de face vide, jamais la réponse au recto (F3 I-1). Le verso n'est
// monté qu'une fois retourné : la réponse n'est ni lue ni trouvée avant.
// ============================================================================
import type { AnyTerm } from '@/lib/collections/allTerms';
import { isPersonalView } from '@/lib/collections/allTerms';
import { TermSheet } from './TermSheet';

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

export function CardFlip({ card, direction, revealed, onFlip, hint = '', size = 'full' }: {
  card: AnyTerm; direction: CardDirection; revealed: boolean; onFlip: () => void; hint?: string; size?: 'full' | 'mini';
}) {
  const mini = size === 'mini';
  const face = `card absolute inset-0 flex flex-col items-center [backface-visibility:hidden] ${mini ? 'p-3' : 'p-8'}`;
  return (
    <div className="[perspective:1200px]">
      <div data-card-flip={revealed ? 'verso' : 'recto'} className={`relative ${mini ? 'h-40' : 'h-[320px]'} transition-transform duration-500 motion-reduce:transition-none [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : ''}`}>
        <div className={`${face} justify-center text-center`} aria-hidden={revealed}>
          <div className="label">{direction === 'term2simple' ? 'Fachbegriff' : 'Bedeutung'}{mini ? '' : ` · ${card.specialty}`}</div>
          <div className={`${mini ? 'mt-1 text-lg' : 'mt-4 text-2xl'} font-display font-bold tracking-tightish`}>{cardFront(card, direction)}</div>
          {direction === 'term2simple' && card.pronunciation && !mini && <div className="mt-1 font-mono text-sm text-slate-400">/{card.pronunciation}/</div>}
          {!mini && <button type="button" onClick={onFlip} tabIndex={revealed ? -1 : 0} className="btn-outline mt-8">Révéler{hint}</button>}
        </div>
        <div className={`${face} overflow-y-auto text-left [transform:rotateY(180deg)]`} aria-hidden={!revealed}>
          {revealed && (direction === 'term2simple'
            ? <div className="w-full"><TermSheet term={card} compact={mini} /></div>
            : <div className="m-auto text-center">
                <div className={`${mini ? 'text-lg' : 'text-2xl'} font-display font-bold text-brand-700 dark:text-brand-300`}>{card.term}</div>
                {card.pronunciation && <div className="mt-1 font-mono text-sm text-slate-400">/{card.pronunciation}/</div>}
              </div>)}
        </div>
      </div>
    </div>
  );
}
