import { GuidedText } from '@/components/GuidedText';
import { Icon } from '@/components/icons';

// ============================================================================
// Vignette « Pour ce cas » (Muster) — phrase-modèle AUTHORÉE, personnalisée au
// cas, calée sur les slots du guide. Partagée par la Dokumentation (écrit) et la
// Fallvorstellung (oral). Les mots-clés du chapitre sont surlignés pour montrer
// les ancres standard que le candidat doit reproduire.
// ============================================================================
export function MusterCard({ text, keywords, tone = 'brand' }: {
  text: string; keywords?: string[]; tone?: 'brand' | 'violet';
}) {
  const c = tone === 'violet'
    ? { border: 'border-violet-200 dark:border-violet-900/40', grad: 'from-violet-50 dark:from-violet-900/20', head: 'border-violet-100 bg-violet-50/60 dark:border-violet-900/30 dark:bg-violet-900/10', label: 'text-violet-600 dark:text-violet-300', sub: 'text-violet-400', icon: 'text-violet-500', body: 'text-violet-900 dark:text-violet-100' }
    : { border: 'border-brand-200 dark:border-brand-900/40', grad: 'from-brand-50 dark:from-brand-900/20', head: 'border-brand-100 bg-brand-50/60 dark:border-brand-900/30 dark:bg-brand-900/10', label: 'text-brand-600 dark:text-brand-300', sub: 'text-brand-400', icon: 'text-brand-500', body: 'text-brand-900 dark:text-brand-100' };
  return (
    <div className={`mt-2.5 overflow-hidden rounded-xl border bg-gradient-to-br to-transparent ${c.border} ${c.grad}`}>
      <div className={`flex items-center gap-1.5 border-b px-3 py-1.5 ${c.head}`}>
        <Icon name="doctopus" className={`h-3.5 w-3.5 ${c.icon}`} />
        <span className={`font-mono text-[9px] font-bold uppercase tracking-[0.16em] ${c.label}`}>Pour ce cas</span>
        <span className={`ml-auto font-mono text-[9px] uppercase tracking-wider ${c.sub}`}>Muster</span>
      </div>
      <p className={`px-3 py-2 text-[13px] leading-relaxed ${c.body}`}><GuidedText text={text} keywords={keywords ?? []} /></p>
    </div>
  );
}
