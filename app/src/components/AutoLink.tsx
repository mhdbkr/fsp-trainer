import { AutoLinkText } from '@/lib/autolink';
import { useLinkIndex } from '@/hooks/useData';
import { useUi } from '@/store/ui';

// Wrapper prêt à l'emploi : rend un texte avec Fachbegriffe cliquables reliés
// au panneau glossaire global. À utiliser partout où du texte médical s'affiche.
export function AutoLink({ children }: { children: string }) {
  const index = useLinkIndex();
  const openGlossary = useUi((s) => s.openGlossary);
  return <AutoLinkText text={children} index={index} onOpen={openGlossary} />;
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
