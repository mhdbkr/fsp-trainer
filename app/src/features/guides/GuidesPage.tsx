import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGuides } from '@/hooks/useData';
import { AutoLink } from '@/components/AutoLink';
import { Icon } from '@/components/icons';
import { PhraseLine } from '@/components/PhraseLine';
import { KommunikationGuide } from './KommunikationGuide';
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, LEITSYMPTOM_LABEL, aktuellChapterFor, type LeitsymptomKategorie } from '@/data/guides/anamneseChapters';
import { ARZTBRIEF_CHAPTERS } from '@/data/guides/arztbriefChapters';
import { VORSTELLUNG_CHAPTERS } from '@/data/guides/vorstellungChapters';
import type { Phrase } from '@/data/guides/phrases';
import type { Guide } from '@/db/types';

// ============================================================================
// Guides & templates — reflète EXACTEMENT le contenu linguistique du mode
// simulation (même source de données), affiché en lecture/référence :
//  • Anamnese      : Allgemeine Anamnese + Fachanamnese (toutes spécialités).
//  • Arztbrief / Fallvorstellung : chapitres avec variantes (PhraseLine).
//  • Communication : patient difficile (composant dédié).
//  • Grammatik     : Redemittel & pièges (guide seedé).
// ============================================================================

type Category = 'anamnese' | 'arztbrief' | 'fallvorstellung' | 'kommunikation' | 'grammatik';
const CATEGORIES: { id: Category; label: string; icon: string; hint: string }[] = [
  { id: 'anamnese', label: 'Anamnese', icon: 'pain', hint: 'Entretien patient + Fachanamnese' },
  { id: 'arztbrief', label: 'Arztbrief', icon: 'history', hint: 'Rédiger le courrier' },
  { id: 'fallvorstellung', label: 'Fallvorstellung', icon: 'stethoscope', hint: 'Présenter le cas' },
  { id: 'kommunikation', label: 'Communication', icon: 'shield', hint: 'Patient difficile' },
  { id: 'grammatik', label: 'Grammatik', icon: 'brain', hint: 'Redemittel & pièges' },
];

// Modèle normalisé de chapitre pour l'affichage.
interface GChapter { id: string; title: string; subtitle?: string; icon: string; keywords: string[]; phrases: Phrase[]; tip?: string; badge?: string }

const toG = (c: typeof ALLGEMEINE_ANAMNESE[number]): GChapter => ({ id: c.id, title: c.title, subtitle: c.subtitle, icon: c.icon, keywords: c.keywords, phrases: c.questions, tip: c.tip });
// « Aktuelle Beschwerden » se décline par nature du motif (FB2-J1) : le
// lecteur choisit la variante qu'il révise ; les autres chapitres sont fixes.
const anamneseChapters = (kat: LeitsymptomKategorie): GChapter[] =>
  ALLGEMEINE_ANAMNESE.map((c) => (c.id === 'aktuell' ? toG(aktuellChapterFor(kat)) : toG(c)));
const ARZTBRIEF_CH: GChapter[] = ARZTBRIEF_CHAPTERS.map((c) => ({
  id: c.id, title: `${c.order}. ${c.title}`, subtitle: c.subtitle, icon: c.icon, keywords: c.keywords, phrases: c.redewendungen, tip: c.tip, badge: c.register,
}));
const VORSTELLUNG_CH: GChapter[] = VORSTELLUNG_CHAPTERS.map((c) => ({
  id: c.id, title: `${c.order}. ${c.title}`, subtitle: c.subtitle, icon: c.icon, keywords: c.keywords, phrases: c.redewendungen,
}));

export function GuidesPage() {
  const guides = useGuides();
  const [params] = useSearchParams();
  const openId = params.get('open');
  const [cat, setCat] = useState<Category>('anamnese');
  const [kat, setKat] = useState<LeitsymptomKategorie>('schmerz');
  if (!guides) return <div className="text-slate-400">Chargement…</div>;

  const grammatik = guides.filter((g) => g.type === 'grammatik');

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">Méthode</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Guides & templates</h1>
        <p className="text-slate-500 dark:text-slate-400">Le contenu linguistique complet de l'examen — mêmes formulations que le mode simulation.</p>
      </header>

      {/* Onglets de catégorie */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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

      {cat === 'anamnese' && (
        <div className="space-y-3">
          <SectionIntro text="Trame d'entretien d'admission (registre patient). Chaque question propose ses autres formulations et ses relances selon la réponse du patient." />
          {/* Fachanamnese mise en avant : questions ciblées à poser tôt, selon le motif. */}
          <FachanamneseSection />
          <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />Allgemeine Anamnese — étape par étape<span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
          {anamneseChapters(kat).map((ch, i) => (
            <div key={ch.id}>
              {ch.id === 'aktuell' && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <span className="label mr-1">Nature du motif</span>
                  {LEITSYMPTOM_KATEGORIEN.map((k) => (
                    <button key={k} type="button" onClick={() => setKat(k)} aria-pressed={kat === k}
                      className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${kat === k ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-ink-700 dark:text-slate-300 dark:hover:bg-ink-600'}`}>
                      {LEITSYMPTOM_LABEL[k]}
                    </button>
                  ))}
                </div>
              )}
              <ChapterCard ch={ch} step={i + 1} defaultOpen={ch.id === openId} />
            </div>
          ))}
        </div>
      )}
      {cat === 'arztbrief' && (
        <div className="space-y-3">
          <SectionIntro text="Courrier écrit : anamnèse au Konjunktiv I, mesures au Passiv. Rédige toi-même — jamais de génération auto. La formule finale est obligatoire." />
          {ARZTBRIEF_CH.map((ch, i) => <ChapterCard key={ch.id} ch={ch} step={i + 1} defaultOpen={ch.id === openId} />)}
        </div>
      )}
      {cat === 'fallvorstellung' && (
        <div className="space-y-3">
          <SectionIntro text="Présentation orale en Fachsprache, à partir des seules notes d'anamnèse. Récite toi-même une formulation par chapitre." />
          {VORSTELLUNG_CH.map((ch, i) => <ChapterCard key={ch.id} ch={ch} step={i + 1} defaultOpen={ch.id === openId} />)}
        </div>
      )}
      {cat === 'kommunikation' && <KommunikationGuide />}
      {cat === 'grammatik' && (
        <div className="space-y-3">
          <SectionIntro text="Les tournures qui font gagner des points — et les pièges de grammaire qui en font perdre. À réviser avant chaque simulation." />
          {grammatik.length === 0
            ? <Empty />
            : grammatik.map((g) => <SeededGuideCard key={g.id} guide={g} defaultOpen />)}
        </div>
      )}
    </div>
  );
}

function SectionIntro({ text }: { text: string }) {
  return <p className="rounded-xl bg-slate-50 px-4 py-2.5 text-[13px] leading-relaxed text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">{text}</p>;
}
function Empty() {
  return <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400 dark:border-slate-700">Aucun guide dans cette catégorie.</div>;
}

// --- Carte de chapitre (données de simulation) ------------------------------
const BADGE: Record<string, string> = {
  'Konjunktiv I': 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Passiv: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Form: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function ChapterCard({ ch, defaultOpen, tone = 'brand', step }: { ch: GChapter; defaultOpen?: boolean; tone?: 'brand' | 'violet'; step?: number }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const ring = tone === 'violet' ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300';
  return (
    <div className={`card overflow-hidden transition-shadow ${open ? 'shadow-md ring-1 ring-brand-200 dark:ring-brand-900/40' : ''}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        {/* Pastille : numéro d'étape (timeline) ou picto */}
        <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ring}`}>
          {step ? <span className="font-mono text-sm font-bold tabular-nums">{String(step).padStart(2, '0')}</span> : <Icon name={ch.icon} className="h-5 w-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold">
            {step != null && <Icon name={ch.icon} className={`h-4 w-4 ${tone === 'violet' ? 'text-violet-400' : 'text-brand-400'}`} />}
            {ch.title}
          </span>
          {ch.subtitle && <span className="text-xs text-slate-400">{ch.subtitle}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] text-slate-400">{ch.phrases.length} phrase{ch.phrases.length > 1 ? 's' : ''}</span>
        {ch.badge && <span className={`chip py-0 text-[10px] ${BADGE[ch.badge] ?? BADGE.Form}`}>{ch.badge}</span>}
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 pl-14 dark:border-slate-800">
          <ul className="space-y-1.5">
            {ch.phrases.map((p, i) => <PhraseLine key={i} phrase={p} keywords={ch.keywords} tone={tone === 'violet' ? 'emerald' : 'brand'} />)}
          </ul>
          {ch.tip && <p className="callout callout-warn mt-3"><Icon name="bulb" className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{ch.tip}</span></p>}
        </div>
      )}
    </div>
  );
}

// --- Sous-section Fachanamnese (toutes spécialités) -------------------------
function FachanamneseSection() {
  const [openSp, setOpenSp] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border-2 border-dashed border-violet-300 p-3 dark:border-violet-900/50">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300"><Icon name="stethoscope" className="h-5 w-5" /></span>
        <div>
          <div className="text-sm font-bold text-violet-700 dark:text-violet-300">Fachanamnese — questions par spécialité</div>
          <div className="text-[11px] text-slate-400">À poser tôt, selon le motif de consultation. Choisis la spécialité.</div>
        </div>
      </div>
      {/* Sélecteur de spécialité (chips) */}
      <div className="my-2 flex flex-wrap gap-1.5">
        {FACHANAMNESEN.map((f) => (
          <button key={f.specialty} onClick={() => setOpenSp((s) => (s === f.specialty ? null : f.specialty))}
            className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${openSp === f.specialty ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300'}`}>
            <Icon name={f.icon} className="h-3.5 w-3.5" />{f.specialty}
          </button>
        ))}
      </div>
      {/* Chapitre de la spécialité sélectionnée */}
      {openSp && (() => {
        const f = FACHANAMNESEN.find((x) => x.specialty === openSp)!;
        return <ChapterCard ch={{ id: f.chapter.id, title: f.chapter.title, subtitle: f.chapter.subtitle, icon: f.icon, keywords: f.chapter.keywords, phrases: f.chapter.questions, tip: f.chapter.tip }} defaultOpen tone="violet" />;
      })()}
    </div>
  );
}

// --- Carte pour un guide seedé (Grammatik) ----------------------------------
function SeededGuideCard({ guide, defaultOpen }: { guide: Guide; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <div>
          <div className="font-semibold">{guide.title}</div>
          {guide.intro && <div className="text-xs text-slate-400">{guide.intro}</div>}
        </div>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
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
              {s.note && <p className="callout callout-warn mt-2"><Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{s.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
