import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAufklaerungen, useCases } from '@/hooks/useData';
import { AutoLink } from '@/components/AutoLink';
import { Icon } from '@/components/icons';
import type { AufklaerungItem } from '@/db/types';

// ============================================================================
// Espace Aufklärung — présenté comme un PARCOURS visuel : les 7 blocs standards
// s'enchaînent en timeline numérotée (répétables d'un acte à l'autre), les
// risques sont mis en encarts colorés (standards vs spécifiques), et les
// questions du patient en bulles de dialogue. Objectif : apprendre le flow.
// ============================================================================

export type Cat = 'Untersuchung' | 'OP' | 'Therapie';
export const CAT_META: Record<Cat, { icon: string; label: string; cls: string }> = {
  Untersuchung: { icon: 'stethoscope', label: 'Untersuchung', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' },
  OP: { icon: 'syringe', label: 'OP', cls: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
  Therapie: { icon: 'pill', label: 'Therapie', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
};

// Les 7 étapes universelles d'une Aufklärung (le « flow » à mémoriser).
// `teach` = la leçon de l'étape ; `phrase` = Redemittel modèle (registre patient).
const FLOW_STEPS = [
  { key: 'einleitung', icon: 'handshake', label: 'Einleitung', hint: 'Se présenter, annoncer l’acte',
    teach: 'Salue, présente-toi et annonce l’objet de l’entretien : le patient doit savoir de quel acte on parle et pourquoi vous en parlez maintenant.',
    phrase: 'Ich möchte mit Ihnen über die geplante Untersuchung sprechen und Sie darüber aufklären.' },
  { key: 'metakommunikation', icon: 'ear', label: 'Metakommunikation', hint: 'Vérifier la compréhension',
    teach: 'Annonce le plan, autorise les interruptions et vérifie la compréhension tout au long — c’est ce qui rend l’Aufklärung « éclairée ».',
    phrase: 'Wenn etwas unklar ist, unterbrechen Sie mich bitte jederzeit.' },
  { key: 'warum', icon: 'question', label: 'Warum?', hint: 'Justifier l’indication',
    teach: 'Justifie l’indication en langage simple : qu’est-ce qu’on cherche, qu’est-ce qu’on traite, que se passe-t-il si on ne fait rien.',
    phrase: 'Diese Untersuchung ist notwendig, um die Ursache Ihrer Beschwerden abzuklären.' },
  { key: 'ablauf', icon: 'history', label: 'Ablauf', hint: 'Décrire le déroulement',
    teach: 'Décris le déroulement pas à pas, dans l’ordre chronologique — avant, pendant, après — sans aucun Fachbegriff.',
    phrase: 'Zuerst bekommen Sie … , dann … , anschließend … .' },
  { key: 'vorbereitung', icon: 'pill', label: 'Vorbereitung', hint: 'Préparation du patient',
    teach: 'Explique ce que le patient doit faire : rester à jeun, adapter ses médicaments (anticoagulants !), prévoir un accompagnant.',
    phrase: 'Sie müssen nüchtern bleiben — das heißt, ab Mitternacht nichts essen und trinken.' },
  { key: 'risiken', icon: 'alert', label: 'Risiken', hint: 'Toujours expliquer !',
    teach: 'Étape OBLIGATOIRE : les risques standards (saignement, infection — répétables d’un acte à l’autre) puis les risques spécifiques de l’acte.',
    phrase: 'Wie bei jedem Eingriff kann es zu Blutungen oder Infektionen kommen.' },
  { key: 'abschluss', icon: 'handshake', label: 'Abschluss', hint: 'Consentement, questions',
    teach: 'Résume, propose de répondre aux questions et recueille explicitement le consentement — sans pression.',
    phrase: 'Sind Sie mit der Untersuchung einverstanden? Haben Sie noch Fragen?' },
] as const;

export function AufklaerungPage() {
  const items = useAufklaerungen();
  const [params] = useSearchParams();
  const openId = params.get('open');
  const [filter, setFilter] = useState<Cat | 'Alle'>('Alle');
  if (!items) return <div className="text-slate-400">Chargement…</div>;

  const cats: Cat[] = ['Untersuchung', 'OP', 'Therapie'];
  const shown = filter === 'Alle' ? items : items.filter((a) => a.category === filter);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Consentement éclairé</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Aufklärung</h1>
        <p className="text-slate-500 dark:text-slate-400">Le jury peut te demander d’expliquer un acte à tout moment. Maîtrise le <b>parcours en 7 étapes</b> — il est le même pour tous les actes.</p>
      </header>

      {/* Flow universel en 7 étapes — explorateur pédagogique interactif */}
      <FlowExplorer />

      {/* Filtre par catégorie */}
      <div className="flex flex-wrap gap-2">
        {(['Alle', ...cats] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${filter === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>
            {c !== 'Alle' && <Icon name={CAT_META[c].icon} className="h-4 w-4" />}{c === 'Alle' ? 'Tous les actes' : CAT_META[c].label}
            <span className="ml-0.5 text-[11px] opacity-70">{(c === 'Alle' ? items : items.filter((a) => a.category === c)).length}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {shown.map((a) => <AufkCard key={a.id} item={a} defaultOpen={a.id === openId} />)}
      </div>
    </div>
  );
}

// ── Explorateur du parcours : rail connecté 01→07 + panneau de leçon ─────────
function FlowExplorer() {
  const [idx, setIdx] = useState(0);
  const s = FLOW_STEPS[idx];
  const isRisk = s.key === 'risiken';
  return (
    <section className="card card-accent overflow-hidden">
      <div className="px-5 pb-1 pt-4">
        <div className="eyebrow">Le parcours</div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[17px] font-semibold tracking-tightish">Le déroulé type d’une Aufklärung</h2>
          <span className="hidden text-[11px] text-slate-400 sm:block">7 étapes, identiques pour chaque acte — clique pour explorer</span>
        </div>
      </div>

      {/* Rail stepper — ligne continue, nœuds mono 01→07 */}
      <div className="overflow-x-auto px-5 pt-3">
        <ol className="relative flex min-w-[560px] items-start">
          <span aria-hidden className="absolute left-6 right-6 top-4 h-px bg-slate-200 dark:bg-ink-600" />
          <span aria-hidden className="absolute left-6 top-4 h-px bg-brand-500 transition-all duration-300" style={{ width: `calc((100% - 3rem) * ${idx / (FLOW_STEPS.length - 1)})` }} />
          {FLOW_STEPS.map((st, i) => {
            const on = i === idx;
            const done = i < idx;
            return (
              <li key={st.key} className="relative z-10 flex-1">
                <button onClick={() => setIdx(i)} title={st.hint}
                  className="group flex w-full flex-col items-center gap-1.5 pb-3 pt-0.5">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums ring-4 ring-white transition-colors dark:ring-ink-800 ${
                    on ? (st.key === 'risiken' ? 'bg-signal-500 text-white' : 'bg-brand-600 text-white')
                      : done ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200 dark:bg-ink-700'}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={`px-0.5 text-center text-[10px] font-medium leading-tight transition-colors ${on ? 'text-brand-700 dark:text-brand-300' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>{st.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Panneau de leçon de l'étape sélectionnée */}
      <div key={s.key} className="reveal mx-5 mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-ink-600 dark:bg-ink-700/40">
        <div className="flex items-start gap-3">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isRisk ? 'bg-signal-50 text-signal-600 dark:bg-signal-900/25 dark:text-signal-300' : 'bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300'}`}><Icon name={s.icon} className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-[15px] font-semibold">{s.label}</span>
              {isRisk && <span className="chip bg-signal-100 py-0 text-[10px] text-signal-700 dark:bg-signal-900/40 dark:text-signal-300">obligatoire</span>}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{s.teach}</p>
            <p className="mt-2 rounded-lg bg-white px-3 py-2 text-[13px] italic text-slate-700 ring-1 ring-slate-200 dark:bg-ink-800 dark:text-slate-200 dark:ring-ink-600">« {s.phrase} »</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} className="btn-ghost px-2 text-xs disabled:opacity-30">◀ Précédent</button>
          <span className="font-mono text-[10px] tabular-nums text-slate-400">{String(idx + 1).padStart(2, '0')} / {String(FLOW_STEPS.length).padStart(2, '0')}</span>
          <button onClick={() => setIdx((i) => Math.min(FLOW_STEPS.length - 1, i + 1))} disabled={idx === FLOW_STEPS.length - 1} className="btn-ghost px-2 text-xs disabled:opacity-30">Suivant ▶</button>
        </div>
      </div>
    </section>
  );
}

function AufkCard({ item, defaultOpen }: { item: AufklaerungItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  // Deep-link (`?open=id`) : la carte s'ouvrait déjà, mais la page restait en
  // haut et l'utilisateur devait la chercher à la main. On défile jusqu'à elle
  // et on la signale par un liseré qui s'éteint seul — l'œil sait où regarder.
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState(!!defaultOpen);
  useEffect(() => {
    if (!defaultOpen || !ref.current) return;
    // Petit délai : le contenu ouvert doit s'être posé avant de défiler, sinon
    // la hauteur finale n'est pas connue et on s'arrête trop haut.
    // Même règle que le CSS de l'app : sous prefers-reduced-motion, on saute
    // directement à la carte au lieu d'y glisser.
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const t1 = window.setTimeout(() => ref.current?.scrollIntoView({ behavior, block: 'start' }), 80);
    const t2 = window.setTimeout(() => setSpot(false), 2400);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, [defaultOpen]);
  const cases = useCases();
  const b = item.blocks;
  const linked = (cases ?? []).filter((c) => item.linkedCaseIds.includes(c.id));
  const cat = CAT_META[item.category];
  const textFor: Record<string, string> = {
    einleitung: b.einleitung, metakommunikation: b.metakommunikation, warum: b.warum, ablauf: b.ablauf, vorbereitung: b.vorbereitung, abschluss: b.abschluss,
  };

  return (
    <div ref={ref} className={`card scroll-mt-20 overflow-hidden transition-shadow duration-700 ${open ? 'shadow-md' : ''} ${spot ? 'ring-2 ring-brand-400/70' : 'ring-0 ring-transparent'}`}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cat.cls}`}><Icon name={cat.icon} className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{item.name}</span>
          <span className={`chip mt-0.5 py-0 text-[10px] ${cat.cls}`}>{cat.label}</span>
        </span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="reveal border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          {/* Timeline des 7 étapes */}
          <ol className="relative space-y-3 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-slate-200 dark:before:bg-slate-700">
            {FLOW_STEPS.map((s, i) => (
              <li key={s.key} className="relative flex gap-3">
                <span className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ring-4 ring-white dark:ring-slate-900 ${s.key === 'risiken' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300'}`}>{i + 1}</span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold"><Icon name={s.icon} className="h-4 w-4 text-slate-400" />{s.label}</div>
                  {s.key === 'risiken' ? (
                    <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                      <RiskBox tone="brand" title="Standardrisiken (répétables)" items={b.standardRisiken} />
                      <RiskBox tone="rose" title={`Spezifisch — ${item.shortName ?? item.name}`} items={b.spezifischeRisiken} />
                    </div>
                  ) : (
                    <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300"><AutoLink>{textFor[s.key]}</AutoLink></p>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Questions du patient — bulles de dialogue */}
          {item.patientQuestions.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-400"><Icon name="question" className="h-4 w-4" /> Questions probables du patient</div>
              <div className="space-y-2.5">
                {item.patientQuestions.map((q, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-start"><span className="flex max-w-[85%] items-start gap-1.5 rounded-2xl rounded-tl-sm bg-slate-100 px-3 py-1.5 text-[13px] dark:bg-slate-800"><Icon name="user" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{q.frage}</span></div>
                    <div className="flex justify-end"><span className="flex max-w-[85%] items-start gap-1.5 rounded-2xl rounded-tr-sm bg-brand-100 px-3 py-1.5 text-[13px] text-brand-900 dark:bg-brand-900/40 dark:text-brand-100"><Icon name="stethoscope" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" /><AutoLink>{q.antwort}</AutoLink></span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {linked.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <span className="text-xs text-slate-400">Cas liés :</span>
              {linked.map((c) => <Link key={c.id} to={`/cas/${c.id}`} className="chip bg-slate-100 text-slate-600 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-300">{c.name}</Link>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RiskBox({ tone, title, items }: { tone: 'brand' | 'rose'; title: string; items: string[] }) {
  const cls = tone === 'rose'
    ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/50 dark:bg-rose-900/10'
    : 'border-brand-200 bg-brand-50/40 dark:border-brand-900/50 dark:bg-brand-900/10';
  const dot = tone === 'rose' ? 'text-rose-400' : 'text-brand-400';
  const head = tone === 'rose' ? 'text-rose-500' : 'text-brand-500';
  return (
    <div className={`rounded-xl border p-2.5 ${cls}`}>
      <div className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${head}`}>{title}</div>
      <ul className="space-y-0.5">
        {items.map((r, i) => <li key={i} className="flex gap-1.5 text-[12px]"><span className={dot}>•</span><span><AutoLink>{r}</AutoLink></span></li>)}
      </ul>
    </div>
  );
}
