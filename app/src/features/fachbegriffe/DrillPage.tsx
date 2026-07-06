import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '@/db/db';
import { useFachbegriffe } from '@/hooks/useData';
import type { Fachbegriff } from '@/db/types';
import { reviewSrs, isDue, type Grade } from '@/lib/srs';

// Drill SM-2 bidirectionnel. Priorité aux termes de la spécialité/pathologie
// du cas travaillé, puis progression libre (couverture inclusive).
export function DrillPage() {
  const begriffe = useFachbegriffe();
  const [params] = useSearchParams();
  const prioritySpecialty = params.get('specialty');
  const priorityPathology = params.get('pathology');

  const [queue, setQueue] = useState<Fachbegriff[]>([]);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [direction, setDirection] = useState<'term2simple' | 'simple2term'>('term2simple');
  const [stats, setStats] = useState({ done: 0, again: 0 });

  // Construit la file : dus d'abord (priorité spécialité/pathologie), puis Neu.
  const buildQueue = useMemo(() => (all: Fachbegriff[]) => {
    const dueItems = all.filter((b) => isDue(b.srs));
    const priority = (b: Fachbegriff) => {
      if (priorityPathology && b.pathologyTags.includes(priorityPathology)) return 0;
      if (prioritySpecialty && b.specialty === prioritySpecialty) return 1;
      return 2;
    };
    const sorted = [...dueItems].sort((a, b) => priority(a) - priority(b) || a.srs.dueDate - b.srs.dueDate);
    // complète avec des Neu jamais vus si peu de dus
    const news = all.filter((b) => b.srs.state === 'Neu' && !dueItems.includes(b)).sort((a, b) => priority(a) - priority(b));
    return [...sorted, ...news].slice(0, 20);
  }, [prioritySpecialty, priorityPathology]);

  useEffect(() => {
    if (begriffe && !started) setQueue(buildQueue(begriffe));
  }, [begriffe, started, buildQueue]);

  if (!begriffe) return <div className="text-slate-400">Chargement…</div>;

  const start = () => { setQueue(buildQueue(begriffe)); setStarted(true); setIdx(0); setRevealed(false); setStats({ done: 0, again: 0 }); };

  if (!started) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <h1 className="text-2xl font-bold">Drill Fachbegriffe</h1>
        <div className="card p-6">
          <div className="text-4xl">🔤</div>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {queue.length} cartes prêtes{prioritySpecialty ? ` · priorité ${prioritySpecialty}` : ''}.
            Répétition espacée (SM-2), cartes bidirectionnelles.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-sm">Sens :</span>
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
              <button onClick={() => setDirection('term2simple')} className={`rounded px-2 py-1 ${direction === 'term2simple' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Terme → sens</button>
              <button onClick={() => setDirection('simple2term')} className={`rounded px-2 py-1 ${direction === 'simple2term' ? 'bg-white shadow-sm dark:bg-slate-700' : 'text-slate-500'}`}>Sens → terme</button>
            </div>
          </div>
          {queue.length === 0 ? (
            <p className="mt-4 text-emerald-600 dark:text-emerald-400">✅ Rien à réviser pour l'instant. Reviens plus tard !</p>
          ) : (
            <button onClick={start} className="btn-primary mt-5 px-8 py-3 text-base">Commencer ▶</button>
          )}
        </div>
        <Link to="/fachbegriffe" className="btn-ghost">← Glossaire</Link>
      </div>
    );
  }

  if (idx >= queue.length) {
    return (
      <div className="mx-auto max-w-xl space-y-5 text-center">
        <div className="card p-8">
          <div className="text-5xl">🎉</div>
          <h1 className="mt-2 text-2xl font-bold">Session terminée</h1>
          <p className="text-slate-500 dark:text-slate-400">{stats.done} cartes revues · {stats.again} à retravailler</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={start} className="btn-primary">Nouvelle session</button>
            <Link to="/" className="btn-outline">Accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  const card = queue[idx];
  const front = direction === 'term2simple' ? card.term : card.translationSimple;
  const back = direction === 'term2simple' ? card.translationSimple : card.term;

  const grade = async (g: Grade) => {
    const newSrs = reviewSrs(card.srs, g);
    await db.fachbegriffe.update(card.id, { srs: newSrs });
    setStats((s) => ({ done: s.done + 1, again: s.again + (g < 3 ? 1 : 0) }));
    if (g < 3) {
      // remet la carte en fin de file pour la revoir dans la session
      setQueue((q) => [...q, { ...card, srs: newSrs }]);
    }
    setRevealed(false);
    setIdx((i) => i + 1);
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <Link to="/fachbegriffe" className="hover:text-brand-600">✕ Quitter</Link>
        <span>{idx + 1} / {queue.length}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full bg-brand-500 transition-all" style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      <div className="card min-h-[280px] p-8 text-center">
        <div className="text-xs uppercase tracking-wide text-slate-400">{direction === 'term2simple' ? 'Fachbegriff' : 'Bedeutung'} · {card.specialty}</div>
        <div className="mt-6 text-2xl font-bold">{front}</div>
        {direction === 'term2simple' && card.pronunciation && <div className="mt-1 text-sm text-slate-400">/{card.pronunciation}/</div>}

        {revealed ? (
          <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
            <div className="text-lg font-medium text-brand-700 dark:text-brand-300">{back}</div>
            {card.definitionDetailed && <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{card.definitionDetailed}</p>}
          </div>
        ) : (
          <button onClick={() => setRevealed(true)} className="btn-outline mt-8">Révéler (Leertaste)</button>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          <GradeBtn label="Wieder" sub="<1 min" color="rose" onClick={() => grade(0)} />
          <GradeBtn label="Schwer" sub="1 j" color="amber" onClick={() => grade(3)} />
          <GradeBtn label="Gut" sub={`${card.srs.repetitions >= 2 ? Math.round(card.srs.interval * card.srs.easeFactor) || 6 : card.srs.repetitions === 1 ? 6 : 1} j`} color="emerald" onClick={() => grade(4)} />
          <GradeBtn label="Einfach" sub="+" color="sky" onClick={() => grade(5)} />
        </div>
      )}

      <KeyboardShortcuts revealed={revealed} onReveal={() => setRevealed(true)} onGrade={grade} />
    </div>
  );
}

function GradeBtn({ label, sub, color, onClick }: { label: string; sub: string; color: 'rose' | 'amber' | 'emerald' | 'sky'; onClick: () => void }) {
  const cls = {
    rose: 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300',
    amber: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300',
    sky: 'bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300',
  }[color];
  return (
    <button onClick={onClick} className={`rounded-lg py-3 text-center transition-colors ${cls}`}>
      <div className="text-sm font-bold">{label}</div>
      <div className="text-[10px] opacity-70">{sub}</div>
    </button>
  );
}

function KeyboardShortcuts({ revealed, onReveal, onGrade }: { revealed: boolean; onReveal: () => void; onGrade: (g: Grade) => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === ' ' && !revealed) { e.preventDefault(); onReveal(); }
      else if (revealed) {
        if (e.key === '1') onGrade(0);
        else if (e.key === '2') onGrade(3);
        else if (e.key === '3') onGrade(4);
        else if (e.key === '4') onGrade(5);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [revealed, onReveal, onGrade]);
  return null;
}
