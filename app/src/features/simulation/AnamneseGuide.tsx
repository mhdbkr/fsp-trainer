import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AssistanceMode, Case } from '@/db/types';
import { ALLGEMEINE_ANAMNESE, getFachanamnese, type AnamneseChapter } from '@/data/guides/anamneseChapters';
import { Icon } from '@/components/icons';
import { GuidedText } from '@/components/GuidedText';

// ============================================================================
// Guide d'anamnèse interactif.
//  • Assisté  : tous les chapitres déroulés, questions + conseils + mots-clés
//               visibles, Fachbegriffe cliquables, cases à cocher.
//  • Autonome : « Prüfungsmodus » — chapitres repliés (titres seulement),
//               aucun conseil affiché ; l'aide se révèle question par question
//               et incrémente un compteur de coups de pouce (impacte le score).
// Fachanamnese injectée en sous-chapitre EXTRA si le cas ∈ spécialité.
// ============================================================================

export function AnamneseGuide({ c, assistance }: { c: Case; assistance: AssistanceMode }) {
  const fach = getFachanamnese(c.specialty);
  const chapters = ALLGEMEINE_ANAMNESE;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hints, setHints] = useState(0);
  const toggle = (id: string) => setChecked((s) => ({ ...s, [id]: !s[id] }));

  const total = chapters.length + (fach ? 1 : 0);
  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-3">
      {/* Barre de progression + (Autonome) compteur de coups de pouce */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-1 flex-wrap gap-1">
          {chapters.map((ch) => (
            <span key={ch.id} title={ch.title}
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${checked[ch.id] ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
              <Icon name={ch.icon} className="h-4 w-4" />
            </span>
          ))}
          {fach && (
            <span title={fach.chapter.title}
              className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-violet-300 ${checked[fach.chapter.id] ? 'bg-violet-500 text-white' : 'bg-violet-50 text-violet-400 dark:bg-violet-900/20'}`}>
              <Icon name={fach.icon} className="h-4 w-4" />
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500">{doneCount}/{total}</span>
        {assistance === 'autonome' && (
          <span className={`shrink-0 chip ${hints === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}
            title="Chaque coup de pouce réduit un peu ton crédit — vise le minimum.">
            💡 {hints}
          </span>
        )}
      </div>

      {assistance === 'autonome' && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700 dark:border-violet-900/50 dark:bg-violet-900/10 dark:text-violet-200">
          🎯 <b>Prüfungsmodus</b> — conduis l'entretien de mémoire. Les questions sont masquées ; ne les révèle que si tu bloques.
        </div>
      )}

      {chapters.map((ch) => (
        <ChapterToggle key={ch.id} ch={ch} checked={!!checked[ch.id]} onToggle={() => toggle(ch.id)} assistance={assistance}
          onHint={() => setHints((h) => h + 1)} fachwissenId={ch.id === 'aktuell' ? c.linkedFachwissenId : undefined} />
      ))}

      {/* Fachanamnese — sous-chapitre extra, visuellement distinct */}
      {fach && (
        <div className="rounded-xl border-2 border-dashed border-violet-300 p-1 dark:border-violet-900/50">
          <div className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-violet-500">
            Fachanamnese · {c.specialty}
          </div>
          <ChapterToggle ch={fach.chapter} checked={!!checked[fach.chapter.id]} onToggle={() => toggle(fach.chapter.id)}
            assistance={assistance} onHint={() => setHints((h) => h + 1)} fachwissenId={c.linkedFachwissenId} tone="violet" />
        </div>
      )}
    </div>
  );
}

function ChapterToggle({ ch, checked, onToggle, assistance, onHint, fachwissenId, tone = 'brand' }: {
  ch: AnamneseChapter; checked: boolean; onToggle: () => void; assistance: AssistanceMode;
  onHint: () => void; fachwissenId?: string; tone?: 'brand' | 'violet';
}) {
  const isAssiste = assistance === 'assiste';
  const [open, setOpen] = useState(isAssiste);       // Assisté : ouvert d'emblée
  const [revealed, setRevealed] = useState(isAssiste); // Autonome : contenu masqué
  const accent = tone === 'violet' ? 'text-violet-600 dark:text-violet-300' : 'text-brand-600 dark:text-brand-300';

  const reveal = () => { setRevealed(true); onHint(); };

  return (
    <div className={`card overflow-hidden ${checked ? 'border-emerald-300 dark:border-emerald-800' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <input type="checkbox" checked={checked} onChange={() => { if (!checked) setOpen(false); onToggle(); }} className="h-4 w-4 shrink-0 accent-emerald-600" title="Marquer comme abordé (ferme le chapitre)" />
        <button onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-2 text-left">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 ${accent}`}>
            <Icon name={ch.icon} className="h-5 w-5" />
          </span>
          <span>
            <span className="font-semibold">{ch.title}</span>
            {ch.subtitle && isAssiste && <span className="ml-2 text-xs text-slate-400">{ch.subtitle}</span>}
          </span>
        </button>
        {fachwissenId && (
          <Link to={`/fachwissen/${fachwissenId}`} title="Fiche Fachwissen de la pathologie"
            className="chip shrink-0 bg-slate-100 text-slate-500 hover:bg-brand-100 dark:bg-slate-800">📚</Link>
        )}
        <button onClick={() => setOpen((o) => !o)} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</button>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {revealed ? (
            <>
              <ul className="space-y-1.5 text-sm">
                {ch.questions.map((q, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    <span><GuidedText text={q} keywords={isAssiste ? ch.keywords : []} /></span>
                  </li>
                ))}
              </ul>
              {isAssiste && ch.tip && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  💡 {ch.tip}
                </p>
              )}
            </>
          ) : (
            <button onClick={reveal} className="btn-outline w-full justify-center text-xs">
              💡 Je bloque — révéler les questions (compte comme un coup de pouce)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
