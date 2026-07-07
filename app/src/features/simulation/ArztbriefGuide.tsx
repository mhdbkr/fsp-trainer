import { useState } from 'react';
import type { AssistanceMode, BogenNotes, Case, MusterCity } from '@/db/types';
import { ARZTBRIEF_CHAPTERS, type ArztbriefChapter } from '@/data/guides/arztbriefChapters';
import { compareArztbrief, type ArztbriefFeedback } from '@/lib/arztbriefCompare';
import { arztbriefExample } from '@/lib/caseExamples';
import { GuidedText } from '@/components/GuidedText';
import { Icon } from '@/components/icons';
import { BogenPreview } from '@/components/BogenPreview';
import { SidePanel } from '@/components/SidePanel';
import { ArztbriefDiff } from './ArztbriefDiff';

// ============================================================================
// Dokumentation / Arztbrief — le candidat RÉDIGE lui-même (jamais auto-généré).
// Vue à deux colonnes, tout en vue simultanée (pas besoin de faire défiler) :
//  • Gauche : bascule [📋 Mes notes (Bogen) | 📖 Guide de rédaction].
//  • Droite : zone de saisie (sticky) + comparaison au corrigé.
// Registre ÉCRIT (Konjunktiv I / Passiv) — aucune formule orale.
// ============================================================================

export function ArztbriefGuide({ c, assistance, text, onText, bogen, muster }: {
  c: Case; assistance: AssistanceMode; text: string; onText: (t: string) => void;
  bogen: BogenNotes; muster: MusterCity;
}) {
  const [fb, setFb] = useState<ArztbriefFeedback | null>(null);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Panneau 1 : mes notes (séparé) */}
      <SidePanel title="Mes notes" icon="id" width="w-80">
        <BogenPreview bogen={bogen} muster={muster} title="Notes de l'anamnèse" />
      </SidePanel>

      {/* Panneau 2 : guide de rédaction (séparé) */}
      <SidePanel title="Guide de rédaction" icon="history" width="w-96">
        <div className="space-y-2">
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-200">
            ✍️ Rédige toi-même. <b>Konjunktiv I</b> pour rapporter le patient, <b>Passiv</b> pour les mesures, et n'oublie jamais la formule de politesse finale.
          </div>
          {ARZTBRIEF_CHAPTERS.map((ch) => (
            <GuideChapter key={ch.id} ch={ch} assistance={assistance} c={c} />
          ))}
        </div>
      </SidePanel>

      {/* Éditeur (occupe l'espace, reste en vue) */}
      <div className="min-w-0 flex-1 space-y-2 lg:sticky lg:top-24 lg:self-start">
        <div className="label">Ton Arztbrief</div>
        <textarea value={text} onChange={(e) => onText(e.target.value)} rows={18}
          placeholder="Sehr geehrte Frau Kollegin, sehr geehrter Herr Kollege,&#10;wir berichten Ihnen nachfolgend über …"
          className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900" />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">{text.trim() ? text.trim().split(/\s+/).length : 0} mots</span>
          <button onClick={() => setFb(compareArztbrief(text, c.referenceArztbrief))} disabled={!text.trim()}
            className="btn-primary text-xs disabled:opacity-40">Comparer au corrigé →</button>
        </div>

        {fb && (
          <div className="card p-4">
            <ArztbriefDiff fb={fb} />
            {c.referenceArztbrief && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-brand-500">Voir la réponse-type (après avoir rédigé)</summary>
                <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-[12px] dark:bg-slate-800/60">{c.referenceArztbrief}</pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Chapitre du guide de rédaction (écrit) ---------------------------------
const REGISTER_BADGE: Record<ArztbriefChapter['register'], string> = {
  'Konjunktiv I': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Passiv': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'Form': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function GuideChapter({ ch, assistance, c }: { ch: ArztbriefChapter; assistance: AssistanceMode; c: Case }) {
  const isAssiste = assistance === 'assiste';
  const [open, setOpen] = useState(isAssiste && ch.order <= 3);
  const example = arztbriefExample(ch.id, c);
  return (
    <div className="card overflow-hidden text-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{ch.order}</span>
        <Icon name={ch.icon} className="h-4 w-4 text-brand-500" />
        <span className="flex-1 font-medium">{ch.title}{isAssiste && <span className="ml-1 text-xs font-normal text-slate-400">· {ch.subtitle}</span>}</span>
        <span className={`chip py-0 text-[10px] ${REGISTER_BADGE[ch.register]}`}>{ch.register}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          <ul className="space-y-1">
            {ch.redewendungen.map((r, i) => (
              <li key={i} className="flex gap-1.5 text-[13px]"><span className="text-brand-400">·</span><span><GuidedText text={r} keywords={isAssiste ? ch.keywords : []} /></span></li>
            ))}
          </ul>
          {example && (
            <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-900/10">
              <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Pour ce cas</div>
              <p className="text-[13px] text-emerald-900 dark:text-emerald-200"><GuidedText text={example} keywords={[]} /></p>
            </div>
          )}
          {isAssiste && ch.tip && <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">💡 {ch.tip}</p>}
        </div>
      )}
    </div>
  );
}
