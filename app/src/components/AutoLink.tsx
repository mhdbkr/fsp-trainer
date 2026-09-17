import { AutoLinkText } from '@/lib/autolink';
import { useLinkIndex } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useCaseId } from '@/features/fachbegriffe/CaseContext';
import { armClose, disarmClose } from './hoverTimer';

// Wrapper prêt à l'emploi : rend un texte avec Fachbegriffe cliquables reliés
// au panneau glossaire global. À utiliser partout où du texte médical s'affiche.
// Survol/focus → hover-card (★ rapide) ; tap mobile ouvre la même carte.
// `caseId` est lu ICI (AutoLink est rendu à l'intérieur du CaseContext.Provider
// de la page) et transmis au store, car TermHoverCard est montée dans Shell,
// hors de tout provider.
export function AutoLink({ children }: { children: string }) {
  const index = useLinkIndex();
  const caseId = useCaseId();
  const hoverOpen = useUi((s) => !!s.hoverTerm);
  const openGlossary = useUi((s) => s.openGlossary);
  const openHover = useUi((s) => s.openHover);
  const closeHover = useUi((s) => s.closeHover);
  return (
    <AutoLinkText
      text={children}
      index={index}
      onOpen={(fb) => { closeHover(); openGlossary(fb); }}
      onHover={(fb, anchor) => { disarmClose(); openHover(fb, anchor, caseId); }}
      onLeave={() => armClose(closeHover, 300)}
      onTap={(fb, anchor) => { disarmClose(); openHover(fb, anchor, caseId); }}
      hoverOpen={hoverOpen}
    />
  );
}

/** Variante bloc : chaque élément d'une liste passe par l'auto-link. */
export function AutoLinkList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={className ?? 'space-y-1.5 text-sm'}>
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
          <span><AutoLink>{it}</AutoLink></span>
        </li>
      ))}
    </ul>
  );
}
