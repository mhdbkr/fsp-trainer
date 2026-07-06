import { useMemo, useState } from 'react';
import type { Case } from '@/db/types';
import { ALLGEMEINE_ANAMNESE, getFachanamnese } from '@/data/guides/anamneseChapters';
import { VORSTELLUNG_CHAPTERS } from '@/data/guides/vorstellungChapters';
import { Icon } from '@/components/icons';

// ============================================================================
// Mode focus / immersif — concentre l'attention sur UN chapitre et UNE
// question/phrase à la fois, en grand, au centre. Navigation étape par étape ;
// petite transition en passant au chapitre suivant. 💡 conseil après ouverture.
// Pour l'Anamnese (questions) et la Fallvorstellung (Redewendungen).
// ============================================================================

interface FocusChapter { id: string; title: string; icon: string; items: string[]; tip?: string }

export function ImmersiveMode({ part, c, onClose }: { part: 'anamnese' | 'fallvorstellung'; c: Case; onClose: () => void }) {
  const chapters = useMemo<FocusChapter[]>(() => {
    if (part === 'anamnese') {
      const base = ALLGEMEINE_ANAMNESE.map((ch) => ({ id: ch.id, title: ch.title, icon: ch.icon, items: ch.questions, tip: ch.tip }));
      const fach = getFachanamnese(c.specialty);
      if (fach) base.push({ id: fach.chapter.id, title: `Fachanamnese · ${c.specialty}`, icon: fach.icon, items: fach.chapter.questions, tip: fach.chapter.tip });
      return base;
    }
    return VORSTELLUNG_CHAPTERS.map((ch) => ({ id: ch.id, title: ch.title, icon: ch.icon, items: ch.redewendungen, tip: ch.subtitle }));
  }, [part, c]);

  const [ci, setCi] = useState(0);
  const [ii, setIi] = useState(-1); // -1 = écran d'intro du chapitre
  const [flash, setFlash] = useState(false);
  const [showTip, setShowTip] = useState(false);

  const chapter = chapters[ci];
  const atChapterIntro = ii === -1;
  const totalItems = chapter.items.length;

  const goChapter = (idx: number, startAtIntro = true) => {
    setFlash(true);
    setTimeout(() => setFlash(false), 350);
    setCi(idx); setIi(startAtIntro ? -1 : chapters[idx].items.length - 1); setShowTip(false);
  };

  const next = () => {
    if (atChapterIntro) { setIi(0); return; }
    if (ii < totalItems - 1) { setIi(ii + 1); return; }
    if (ci < chapters.length - 1) goChapter(ci + 1);
    else onClose(); // fini
  };
  const prev = () => {
    if (!atChapterIntro && ii > 0) { setIi(ii - 1); return; }
    if (!atChapterIntro && ii === 0) { setIi(-1); return; }
    if (ci > 0) goChapter(ci - 1, false);
  };

  const isLastItemOfLastChapter = ci === chapters.length - 1 && ii === totalItems - 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950 text-slate-100">
      {/* En-tête : progression des chapitres */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {chapters.map((ch, i) => (
            <button key={ch.id} onClick={() => goChapter(i)} title={ch.title}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${i === ci ? 'bg-brand-500 text-white' : i < ci ? 'bg-emerald-600/70 text-white' : 'bg-slate-800 text-slate-500'}`}>
              <Icon name={ch.icon} className="h-4 w-4" />
            </button>
          ))}
        </div>
        <button onClick={onClose} className="rounded-lg px-3 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">✕ Quitter le focus</button>
      </div>

      {/* Centre : contenu focalisé */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div key={`${ci}-${ii}-${flash}`} className={`w-full max-w-2xl text-center ${flash ? 'animate-fade-in' : 'animate-fade-in'}`}>
          {atChapterIntro ? (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/20 text-brand-300">
                <Icon name={chapter.icon} className="h-10 w-10" />
              </div>
              <div className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-500">Chapitre {ci + 1} / {chapters.length}</div>
              <h2 className="mt-2 text-4xl font-bold">{chapter.title}</h2>
              <p className="mt-3 text-slate-400">{totalItems} {part === 'anamnese' ? 'questions' : 'formulations'} à parcourir.</p>
              {chapter.tip && (
                <button onClick={() => setShowTip((s) => !s)} className="mt-4 text-sm text-amber-400 hover:underline">💡 {showTip ? 'Masquer le conseil' : 'Voir le conseil'}</button>
              )}
              {showTip && chapter.tip && <p className="mx-auto mt-2 max-w-lg rounded-xl bg-slate-800/80 px-4 py-3 text-sm text-amber-100">{chapter.tip}</p>}
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Icon name={chapter.icon} className="h-4 w-4" /> {chapter.title}
              </div>
              <div className="mt-1 text-xs text-slate-600">{ii + 1} / {totalItems}</div>
              <p className="mt-6 text-2xl font-semibold leading-relaxed md:text-3xl">{chapter.items[ii]}</p>
            </>
          )}
        </div>
      </div>

      {/* Bas : navigation */}
      <div className="flex items-center justify-between px-6 py-5">
        <button onClick={prev} disabled={ci === 0 && atChapterIntro}
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 disabled:opacity-30">← Précédent</button>
        {/* progression au sein du chapitre */}
        {!atChapterIntro && (
          <div className="flex gap-1">
            {chapter.items.map((_, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= ii ? 'bg-brand-400' : 'bg-slate-700'}`} />)}
          </div>
        )}
        <button onClick={next}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700">
          {isLastItemOfLastChapter ? 'Terminer ✓' : atChapterIntro ? 'Commencer →' : ii === totalItems - 1 ? 'Chapitre suivant →' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
