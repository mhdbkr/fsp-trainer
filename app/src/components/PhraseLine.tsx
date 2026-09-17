import type { Phrase } from '@/data/guides/phrases';
import { phraseFollowUp, phraseIsCaseSpecific, phraseLabel, phraseProbes, phraseText, splitDimension } from '@/data/guides/phrases';
import { PROBE_BY_ID } from '@/data/guides/anamneseProbes';
import { GuidedText } from '@/components/GuidedText';
import { FollowUpControls, ProgressiveSteps, VariantPicker, useVariant } from '@/components/PhraseControls';

// ============================================================================
// Rendu riche d'une Phrase de guide :
//  • texte principal (mots-clés surlignés) — c'est la formulation CHOISIE :
//    sélectionner une variante la remplace en douceur (key + `reveal`), au lieu
//    d'empiler des synonymes en italique sous la standard ;
//  • étiquette de situation (« Nichtraucher », « Rettungsphrase »…) ;
//  • relances « Falls ja : » en TOGGLES (Ja/Nein, choix, échelle) : on joue la
//    réponse du patient, la relance n'apparaît que si elle est déclenchée.
// ============================================================================

export function PhraseLine({ phrase, keywords = [], tone = 'brand', active = false, onAsk, overlapHints = true, caseLabel = true }: {
  phrase: Phrase; keywords?: string[]; tone?: 'brand' | 'emerald';
  /** Question en train d'être posée (suivi live vers le simulant). */
  active?: boolean;
  /** Le médecin « pose » cette question : remonte la sonde à suivre. */
  onAsk?: (probeId: string | null) => void;
  /** Badges « approfondit / déjà demandé » : dans la trame d'un cas, la
   *  modulation par symptôme a déjà retiré les doublons — on ne garde le
   *  badge que vers « Aktuelle Beschwerden », qui précède réellement. */
  overlapHints?: boolean;
  /** Libellé « Für diesen Fall » sur la ligne ; faux quand le groupe l'affiche. */
  caseLabel?: boolean;
}) {
  const { text, idx, setIdx, alts } = useVariant(phrase);
  // « Beginn — Seit wann … » : la dimension devient une étiquette (FB2-J11),
  // le texte affiché est le reste ; une variante choisie n'a pas de préfixe.
  const main = splitDimension(phraseText(phrase));
  const body = idx >= 0 ? text : main.body;
  const followUp = phraseFollowUp(phrase);
  const label = phraseLabel(phrase);
  const probes = phraseProbes(phrase);
  // Question propre au cas (FB2-J4) : marqueur sobre — puce pétrole pleine un
  // peu plus grande et libellé « Für diesen Fall », apparition en `reveal`.
  // Pas de couleur criarde : c'est un signal de priorité, pas une alerte.
  const caseSpecific = phraseIsCaseSpecific(phrase);
  // Dans un cadre « Für diesen Fall » (caseLabel=false), le titre du cadre porte
  // déjà la grosse puce : les lignes reprennent la puce fine.
  const dot = caseSpecific && caseLabel ? 'h-2 w-2 bg-brand-600 ring-2 ring-brand-200 dark:bg-brand-400 dark:ring-brand-900' : tone === 'emerald' ? 'bg-emerald-400' : 'bg-brand-400';
  const askable = !!onAsk && probes.length > 0;
  // Recouvrement avec l'anamnèse générale : le candidat a déjà posé la question
  // plus haut. On le DIT au lieu de le laisser répéter — « approfondit » quand
  // la version Fach ajoute un axe clinique, « déjà demandé » quand elle
  // n'ajoute rien.
  const src = probes.length === 1 ? PROBE_BY_ID[probes[0]] : undefined;
  const target = src?.deepens ? PROBE_BY_ID[src.deepens] : undefined;
  const covered = target && (overlapHints || target.kapitel === 'aktuell') ? target : undefined;

  return (
    <li className={`flex gap-2 rounded-lg transition-colors duration-300 ${caseSpecific ? 'reveal' : ''} ${active ? '-mx-2 bg-brand-50/70 px-2 py-1 ring-1 ring-brand-300/60 dark:bg-brand-900/20 dark:ring-brand-700/50' : ''}`}>
      <span className={`mt-1.5 shrink-0 rounded-full ${caseSpecific && caseLabel ? '' : 'h-1 w-1'} ${active ? 'h-1 w-1 bg-brand-500 ring-2 ring-brand-200 dark:ring-brand-800' : dot}`} />
      <div className="min-w-0 flex-1">
        {caseSpecific && caseLabel && (
          <span className="mb-0.5 mr-1.5 inline-block text-[10px] font-semibold text-brand-600 dark:text-brand-300" title="Question importante pour ce cas — à ne pas oublier">
            Für diesen Fall
          </span>
        )}
        {main.dim && <div className="mb-1"><span className="dim-tag">{main.dim}</span></div>}
        {label && (
          <span className="mb-0.5 mr-1.5 inline-block rounded bg-slate-100 px-1.5 py-px text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {label}
          </span>
        )}
        {/* `key={idx}` : changer de variante remonte un nouveau nœud → `reveal`
            joue, le texte glisse en place au lieu de sauter. */}
        <span key={idx} className={`reveal inline-block text-sm ${askable ? 'cursor-pointer' : ''}`}
          onClick={askable ? () => onAsk!(active ? null : probes[0]) : undefined}
          title={askable ? (active ? 'Question en cours — cliquer pour désélectionner' : 'Cliquer = « je pose cette question » (le simulant voit la réplique)') : undefined}>
          <GuidedText text={body} keywords={keywords} />
          {idx >= 0 && <span className="ml-1.5 align-middle text-[10px] font-medium text-slate-400" title="Ta formulation retenue">retenue</span>}
        </span>

        {covered && (
          <span title={`Anamnèse générale : « ${covered.frage} »`}
            className={`ml-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-px align-middle text-[10px] font-semibold ${
              src?.redundant
                ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'}`}>
            {src?.redundant ? '↻ déjà demandé' : '↗ approfondit'}
          </span>
        )}

        <VariantPicker alts={alts} idx={idx} onSelect={setIdx} />
        <ProgressiveSteps probes={probes} onStep={onAsk} />
        <FollowUpControls raws={followUp} keywords={keywords} />
      </div>
    </li>
  );
}
