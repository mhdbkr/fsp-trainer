import { useState } from 'react';
import type { Case, Guide, AufklaerungItem } from '@/db/types';
import { useGuides, useAufklaerungen } from '@/hooks/useData';
import { AutoLink } from '@/components/AutoLink';
import { Icon } from '@/components/icons';

type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

// Panneau guide RÉTRACTABLE, toujours accessible pendant la simulation.
// Affiche le guide pertinent (standard + spécialité + spécifique au cas) qu'on
// déroule si on bloque ou pour vérifier.
export function GuidePanel({ part, c }: { part: Part; c: Case }) {
  const [open, setOpen] = useState(false);
  const guides = useGuides() ?? [];
  const aufk = useAufklaerungen() ?? [];

  const guideType = part === 'dokumentation' ? 'arztbrief' : part;
  const standard = guides.find((g) => g.type === guideType && g.specialty === null);
  const spezial = guides.find((g) => g.type === 'spezialguide' && g.specialty === c.specialty);
  const komm = guides.find((g) => g.type === 'kommunikation');
  const caseAufk = aufk.filter((a) => c.probableAufklaerungIds.includes(a.id));

  return (
    <div className={`fixed right-0 top-0 z-30 flex h-full flex-col border-l border-slate-200 bg-white shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900 ${open ? 'w-full max-w-md' : 'w-12'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-14 items-center gap-2 border-b border-slate-100 px-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
        title="Panneau guide"
      >
        <Icon name={open ? 'chevron' : 'nav-book'} className={`h-5 w-5 transition-transform ${open ? 'rotate-90' : ''}`} />
        {open && <span className="font-semibold">Guide — {labelForPart(part)}</span>}
      </button>

      {open && (
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700 dark:bg-brand-900/20 dark:text-brand-200">
            Déroule si tu bloques ou pour vérifier. Ça n'affecte pas ton score.
          </p>
          {standard && <GuideBlock guide={standard} defaultOpen />}
          {part === 'anamnese' && spezial && <GuideBlock guide={spezial} />}
          {part === 'anamnese' && komm && <GuideBlock guide={komm} />}
          {part === 'aufklaerung' && caseAufk.map((a) => <AufkBlock key={a.id} item={a} />)}
          {part === 'fallvorstellung' && (
            <div className="card p-3 text-sm">
              <div className="label mb-1">Questions probables des Prüfer</div>
              <ul className="space-y-1">
                {c.examinerQuestions.map((q, i) => <li key={i} className="flex gap-2"><span className="text-brand-400">?</span><AutoLink>{q}</AutoLink></li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function labelForPart(p: Part) {
  return p === 'dokumentation' ? 'Arztbrief' : p === 'anamnese' ? 'Anamnese' : p === 'fallvorstellung' ? 'Fallvorstellung' : 'Aufklärung';
}

function GuideBlock({ guide, defaultOpen }: { guide: Guide; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="card overflow-hidden text-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
        <span>{guide.title}</span><Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
          {guide.sections.map((s) => (
            <div key={s.id}>
              <div className="text-xs font-semibold text-brand-600 dark:text-brand-300">{s.title}</div>
              <ul className="mt-1 space-y-0.5">
                {s.items.map((it, i) => <li key={i} className="flex gap-1.5 text-[13px]"><span className="text-brand-400">·</span><AutoLink>{it}</AutoLink></li>)}
              </ul>
              {s.note && <p className="callout callout-warn mt-1 text-[11px]"><Icon name="alert" className="mt-0.5 h-3 w-3 shrink-0" />{s.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AufkBlock({ item }: { item: AufklaerungItem }) {
  const [open, setOpen] = useState(false);
  const b = item.blocks;
  return (
    <div className="card overflow-hidden text-sm">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-3 py-2 font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="flex items-center gap-1.5"><Icon name="nav-clipboard" className="h-4 w-4 shrink-0" />{item.shortName ?? item.name}</span><Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-100 px-3 py-2 text-[13px] dark:border-slate-800">
          <Line label="Einleitung">{b.einleitung}</Line>
          <Line label="Warum">{b.warum}</Line>
          <Line label="Ablauf">{b.ablauf}</Line>
          <div>
            <div className="text-xs font-semibold text-brand-600 dark:text-brand-300">Spezifische Risiken</div>
            <ul className="mt-0.5 space-y-0.5">{b.spezifischeRisiken.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-rose-400">·</span><AutoLink>{r}</AutoLink></li>)}</ul>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Fragen des Patienten</div>
            <ul className="mt-0.5 space-y-0.5">{item.patientQuestions.map((q, i) => <li key={i}>« {q.frage} »</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}

function Line({ label, children }: { label: string; children: string }) {
  return <div><span className="text-xs font-semibold text-brand-600 dark:text-brand-300">{label}: </span><span><AutoLink>{children}</AutoLink></span></div>;
}
