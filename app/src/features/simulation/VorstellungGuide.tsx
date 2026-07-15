import { useEffect, useState } from 'react';
import type { AssistanceMode, BogenNotes, Case, MusterCity } from '@/db/types';
import { VORSTELLUNG_CHAPTERS } from '@/data/guides/vorstellungChapters';
import { Icon } from '@/components/icons';
import { PhraseLine } from '@/components/PhraseLine';
import { BogenPreview } from '@/components/BogenPreview';
import { SidePanel } from '@/components/SidePanel';
import { ImmersiveMode } from './ImmersiveMode';
import { MusterCard } from './MusterCard';
import { useSimSession } from '@/store/simSession';

// ============================================================================
// Fallvorstellung (oral, Arzt-Arzt) — apprendre les chapitres PAR CŒUR et dire
// les bonnes phrases. Vue en STEPPER (progression chapitre par chapitre).
// JAMAIS de trame orale auto-générée : le candidat récite lui-même.
//  • Assisté  : chapitre actif ouvert, Redewendungen + mots-clés visibles.
//  • Autonome : Redewendungen masquées, révélées à la demande (coup de pouce).
// ============================================================================

export function VorstellungGuide({ c, assistance, bogen, muster }: {
  c: Case; assistance: AssistanceMode; bogen: BogenNotes; muster: MusterCity;
}) {
  const chapters = VORSTELLUNG_CHAPTERS;
  const isAssiste = assistance === 'assiste';
  const [activeId, setActiveId] = useState(chapters[0].id);
  // Chapitres « parcourus » : marqués en vert dès qu'on passe au suivant.
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [hints, setHints] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const doneCount = passed.size;
  const pct = Math.round((doneCount / chapters.length) * 100);
  const activeIdx = chapters.findIndex((ch) => ch.id === activeId);

  // Publie le chapitre le plus loin atteint (actif ou parcouru) → le mode focus démarre là.
  useEffect(() => {
    let maxIdx = activeIdx;
    passed.forEach((id) => { const i = chapters.findIndex((ch) => ch.id === id); if (i > maxIdx) maxIdx = i; });
    const chId = chapters[Math.max(0, maxIdx)]?.id;
    if (chId) useSimSession.getState().setGuideChapter({ caseId: c.id, part: 'fallvorstellung', chapterId: chId });
  }, [activeId, passed, activeIdx, chapters, c.id]);

  const goNext = () => {
    setPassed((p) => new Set(p).add(activeId));
    if (activeIdx < chapters.length - 1) setActiveId(chapters[activeIdx + 1].id);
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Notes (Antwortbogen) — panneau latéral réductible sur le côté */}
      <SidePanel title="Antwortbogen" icon="id" width="w-80">
        <BogenPreview bogen={bogen} muster={muster} title="Tes notes" />
      </SidePanel>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex justify-end">
          <button onClick={() => setImmersive(true)} className="btn gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"><Icon name="target" className="h-3.5 w-3.5" />Mode focus</button>
        </div>
        {immersive && <ImmersiveMode part="fallvorstellung" c={c} initialChapterId={activeId} onClose={() => setImmersive(false)} />}
      {/* Barre de progression « par cœur » */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">Chapitres parcourus</span>
            <span className="font-semibold text-brand-600 dark:text-brand-300">{doneCount}/{chapters.length}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${Math.max(3, pct)}%` }} />
          </div>
        </div>
        {assistance === 'autonome' && (
          <span className={`shrink-0 chip ${hints === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}><Icon name="bulb" className="h-3.5 w-3.5" />{hints}</span>
        )}
      </div>

      {/* Rail de chapitres (numéros cliquables) — repère visuel de progression */}
      <div className="flex flex-wrap gap-1.5">
        {chapters.map((ch, i) => {
          const done = passed.has(ch.id);
          const active = ch.id === activeId;
          return (
            <button key={ch.id} onClick={() => setActiveId(ch.id)} title={ch.title}
              className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium transition-colors ${active ? 'bg-brand-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <span className="opacity-70">{i + 1}</span>
              <Icon name={ch.icon} className="h-3.5 w-3.5" />
            </button>
          );
        })}
      </div>

      {/* Chapitre actif */}
      {chapters[activeIdx] && (
        <ActiveChapter
          ch={chapters[activeIdx]} isAssiste={isAssiste} c={c}
          onHint={() => setHints((h) => h + 1)}
          onPrev={activeIdx > 0 ? () => setActiveId(chapters[activeIdx - 1].id) : undefined}
          onNext={activeIdx < chapters.length - 1 ? goNext : undefined}
        />
      )}
      </div>
    </div>
  );
}

function ActiveChapter({ ch, isAssiste, c, onHint, onPrev, onNext }: {
  ch: (typeof VORSTELLUNG_CHAPTERS)[number]; isAssiste: boolean; c: Case;
  onHint: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const muster = c.musterSaetze?.vorstellung[ch.id];
  const [revealed, setRevealed] = useState(isAssiste);
  // Re-masque quand on change de chapitre en mode Autonome.
  const [lastId, setLastId] = useState(ch.id);
  if (lastId !== ch.id) { setLastId(ch.id); setRevealed(isAssiste); }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Icon name={ch.icon} className="h-5 w-5" /></span>
        <div className="flex-1">
          <div className="text-sm font-semibold">{ch.order}. {ch.title}</div>
          <div className="text-[11px] text-slate-400">{ch.subtitle}</div>
        </div>
      </div>

      <div className="px-4 py-3">
        {revealed ? (
          <>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Formulations possibles — dis-en une à voix haute</div>
            <ul className="space-y-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
              {ch.redewendungen.map((r, i) => (
                <PhraseLine key={i} phrase={r} keywords={isAssiste ? ch.keywords : []} />
              ))}
            </ul>
            {muster && <MusterCard text={muster} keywords={isAssiste ? ch.keywords : []} />}
          </>
        ) : (
          <button onClick={() => { setRevealed(true); onHint(); }} className="btn-outline w-full justify-center text-xs">
            <Icon name="bulb" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />Je bloque — révéler une formulation (coup de pouce)
          </button>
        )}

        <div className="mt-3 flex justify-between">
          <button onClick={onPrev} disabled={!onPrev} className="btn-ghost text-xs disabled:opacity-30">← Précédent</button>
          <button onClick={onNext} disabled={!onNext} className="btn-primary text-xs disabled:opacity-30">Suivant →</button>
        </div>
      </div>
    </div>
  );
}
