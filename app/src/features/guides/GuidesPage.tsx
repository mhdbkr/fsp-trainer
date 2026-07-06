import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGuides } from '@/hooks/useData';
import { AutoLink } from '@/components/AutoLink';
import { Icon } from '@/components/icons';
import { KommunikationGuide } from './KommunikationGuide';
import type { Guide, GuideType } from '@/db/types';

// Catégories de guides (la communication est rendue par le composant dédié —
// on n'affiche PAS le guide seedé 'kommunikation' pour éviter le doublon).
type Category = 'anamnese' | 'arztbrief' | 'fallvorstellung' | 'kommunikation' | 'spezialguide';
const CATEGORIES: { id: Category; label: string; icon: string; hint: string }[] = [
  { id: 'anamnese', label: 'Anamnese', icon: 'pain', hint: "Mener l'entretien patient" },
  { id: 'arztbrief', label: 'Arztbrief', icon: 'history', hint: 'Rédiger le courrier' },
  { id: 'fallvorstellung', label: 'Fallvorstellung', icon: 'stethoscope', hint: 'Présenter le cas' },
  { id: 'kommunikation', label: 'Communication', icon: 'shield', hint: 'Patient difficile' },
  { id: 'spezialguide', label: 'Par spécialité', icon: 'brain', hint: 'Fachanamnese' },
];

export function GuidesPage() {
  const guides = useGuides();
  const [params] = useSearchParams();
  const openId = params.get('open');
  const [cat, setCat] = useState<Category>('anamnese');
  if (!guides) return <div className="text-slate-400">Chargement…</div>;

  const items = guides.filter((g) => g.type === (cat as GuideType) && g.type !== 'kommunikation');

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Guides & templates</h1>
        <p className="text-slate-500 dark:text-slate-400">Trames officielles, tactiques de communication et sous-guides par spécialité.</p>
      </header>

      {/* Onglets de catégorie */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CATEGORIES.map((cc) => (
          <button key={cc.id} onClick={() => setCat(cc.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${cat === cc.id ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 hover:border-brand-300 dark:border-slate-800'}`}>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${cat === cc.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <Icon name={cc.icon} className="h-5 w-5" />
            </span>
            <span className="text-xs font-semibold">{cc.label}</span>
            <span className="hidden text-[10px] text-slate-400 sm:block">{cc.hint}</span>
          </button>
        ))}
      </div>

      {/* Contenu de la catégorie */}
      {cat === 'kommunikation' ? (
        <KommunikationGuide />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">
          Aucun guide dans cette catégorie pour l'instant.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((g) => <GuideCard key={g.id} guide={g} defaultOpen={g.id === openId || items.length === 1} />)}
        </div>
      )}
    </div>
  );
}

function GuideCard({ guide, defaultOpen }: { guide: Guide; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div>
          <div className="font-semibold">{guide.title}</div>
          {guide.intro && <div className="text-xs text-slate-400">{guide.intro}</div>}
        </div>
        <span className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800 md:grid-cols-2">
          {guide.sections.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800/60">
              <div className="text-sm font-semibold text-brand-600 dark:text-brand-300">{s.title}</div>
              <ul className="mt-1.5 space-y-1">
                {s.items.map((it, i) => (
                  <li key={i} className="flex gap-2 text-sm"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" /><span><AutoLink>{it}</AutoLink></span></li>
                ))}
              </ul>
              {s.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">⚠️ {s.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
