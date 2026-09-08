import type { Phrase } from '@/data/guides/phrases';
import { phraseFollowUp, phraseLabel } from '@/data/guides/phrases';
import { GuidedText } from '@/components/GuidedText';
import { FollowUpControls, VariantPicker, useVariant } from '@/components/PhraseControls';

// ============================================================================
// Rendu riche d'une Phrase de guide :
//  • texte principal (mots-clés surlignés) — c'est la formulation CHOISIE :
//    sélectionner une variante la remplace en douceur (key + `reveal`), au lieu
//    d'empiler des synonymes en italique sous la standard ;
//  • étiquette de situation (« Nichtraucher », « Rettungsphrase »…) ;
//  • relances « Falls ja : » en TOGGLES (Ja/Nein, choix, échelle) : on joue la
//    réponse du patient, la relance n'apparaît que si elle est déclenchée.
// ============================================================================

export function PhraseLine({ phrase, keywords = [], tone = 'brand' }: {
  phrase: Phrase; keywords?: string[]; tone?: 'brand' | 'emerald';
}) {
  const { text, idx, setIdx, alts } = useVariant(phrase);
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
        {/* `key={idx}` : changer de variante remonte un nouveau nœud → `reveal`
            joue, le texte glisse en place au lieu de sauter. */}
        <span key={idx} className="reveal inline-block text-sm">
          <GuidedText text={text} keywords={keywords} />
          {idx >= 0 && <span className="ml-1.5 align-middle font-mono text-[9px] uppercase tracking-wider text-brand-500">variante {idx + 1}</span>}
        </span>

        <VariantPicker alts={alts} idx={idx} onSelect={setIdx} />
        <FollowUpControls raws={followUp} keywords={keywords} />
      </div>
    </li>
  );
}
