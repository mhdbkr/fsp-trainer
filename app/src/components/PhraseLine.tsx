import { useState } from 'react';
import type { Phrase } from '@/data/guides/phrases';
import { phraseAlts, phraseFollowUp, phraseLabel, phraseText } from '@/data/guides/phrases';
import { GuidedText } from '@/components/GuidedText';

// ============================================================================
// Rendu riche d'une Phrase de guide :
//  • texte principal (mots-clés surlignés),
//  • étiquette de situation (« Nichtraucher », « Rettungsphrase »…),
//  • variantes équivalentes repliées derrière « ⇄ n variantes » (anti-mur de
//    texte : on montre UNE formulation, les synonymes restent à un clic),
//  • relances « Falls ja : » en retrait, style dialogue.
// ============================================================================

export function PhraseLine({ phrase, keywords = [], tone = 'brand' }: {
  phrase: Phrase; keywords?: string[]; tone?: 'brand' | 'emerald';
}) {
  const [showAlts, setShowAlts] = useState(false);
  const alts = phraseAlts(phrase);
  const followUp = phraseFollowUp(phrase);
  const label = phraseLabel(phrase);
  const dot = tone === 'emerald' ? 'bg-emerald-400' : 'bg-brand-400';

  return (
    <li className="flex gap-2">
      <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        {label && (
          <span className="mb-0.5 mr-1.5 inline-block rounded bg-slate-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {label}
          </span>
        )}
        <span className="text-sm"><GuidedText text={phraseText(phrase)} keywords={keywords} /></span>

        {alts.length > 0 && (
          <button onClick={() => setShowAlts((s) => !s)}
            className="ml-1.5 inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
            title="Formulations équivalentes — choisis celle qui te vient naturellement">
            ⇄ {alts.length} variante{alts.length > 1 ? 's' : ''}
          </button>
        )}
        {showAlts && (
          <ul className="mt-1 space-y-0.5 border-l-2 border-brand-100 pl-2.5 dark:border-brand-900/40">
            {alts.map((a, i) => (
              <li key={i} className="text-[13px] italic text-slate-500 dark:text-slate-400">{a}</li>
            ))}
          </ul>
        )}

        {followUp.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {followUp.map((f, i) => (
              <li key={i} className="flex gap-1.5 text-[13px] text-slate-500 dark:text-slate-400">
                <span className="shrink-0 text-amber-500">↳</span>{f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
