import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFachwissen, useCases, useAufklaerungen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { DIAGNOSTIK_STUFEN } from '@/db/types';
import type { SectionKey } from '@/data/fachwissenVisuals/types';
import { refKey } from '@/data/fachwissenVisuals/resolve';
import { STUFE_META } from './stufeMeta';
import { DDTable } from '@/components/DDTable';
import { VisualBlock } from '@/components/visuals';
import { useVisualSpec } from './useVisualSpec';
import { Section, CollapsedSection, Repli, SymptomList, splitByCollapse, isFieldCollapsed } from './visualSections';

/** Ordre des sections référençables de la colonne principale (contrat §3.3).
 *  `definition` n'est jamais un `anchor` possible (hors `SectionKey`). */
const SECTION_ORDER: SectionKey[] = [
  'aetiologie',
  'risikofaktoren',
  'klinik',
  'diagnostik',
  'klassifikation',
  'differenzialdiagnosen',
  'therapie',
  'prognose',
];

export function FachwissenDetailPage() {
  const { id } = useParams();
  const fw = useFachwissen(id);
  const cases = useCases();
  const aufk = useAufklaerungen();
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);
  const { blocksByAnchor, collapsed } = useVisualSpec(fw ?? ({ id: '__none__' } as never));
  // Un bloc dont le composant throw (D7) ne doit jamais figer le texte
  // replié : son id est retenu ici et ses `replaces` sortent de `collapsed`.
  const [erroredBlockIds, setErroredBlockIds] = useState<Set<string>>(new Set());
  const handleVisualError = useCallback((blockId: string) => {
    setErroredBlockIds((prev) => (prev.has(blockId) ? prev : new Set(prev).add(blockId)));
  }, []);
  const effectiveCollapsed = useMemo(() => {
    if (erroredBlockIds.size === 0) return collapsed;
    const next = new Set(collapsed);
    for (const blocks of blocksByAnchor.values()) {
      for (const block of blocks) {
        if (erroredBlockIds.has(block.id)) {
          for (const ref of block.replaces) next.delete(refKey(ref));
        }
      }
    }
    return next;
  }, [collapsed, blocksByAnchor, erroredBlockIds]);

  if (!fw) return <div className="text-slate-400">Chargement…</div>;
  const linkedCases = (cases ?? []).filter((c) => fw.linkedCaseIds.includes(c.id));
  const linkedAufk = (aufk ?? []).filter((a) => fw.linkedAufklaerungIds.includes(a.id));
  const terms = (begriffe ?? []).filter((b) => fw.keyFachbegriffeIds.includes(b.id));

  // Un `anchor` dont la section est absente de la fiche suit la section
  // suivante dans l'ordre de la page ; `redFlags` cible toujours l'emplacement
  // de Klassifikation (ou Differenzialdiagnosen si absente) — spec §9, R4.
  const present: Record<SectionKey, boolean> = {
    aetiologie: !!fw.aetiologie,
    risikofaktoren: !!fw.risikofaktoren?.length,
    klinik: true,
    diagnostik: true,
    klassifikation: !!fw.klassifikation?.length,
    differenzialdiagnosen: true,
    therapie: true,
    redFlags: !!fw.redFlags?.length,
    prognose: !!fw.prognose,
  };
  function resolveSlot(anchor: SectionKey): SectionKey {
    const mapped = anchor === 'redFlags' ? 'klassifikation' : anchor;
    const startIndex = SECTION_ORDER.indexOf(mapped);
    if (startIndex === -1) return mapped;
    for (let i = startIndex; i < SECTION_ORDER.length; i++) {
      if (present[SECTION_ORDER[i]]) return SECTION_ORDER[i];
    }
    return SECTION_ORDER[SECTION_ORDER.length - 1];
  }
  const bySlot = new Map<SectionKey, JSX.Element[]>();
  for (const [anchor, blocks] of blocksByAnchor) {
    const slot = resolveSlot(anchor);
    const rendered = blocks.map((block) => (
      <VisualBlock key={block.id} block={block} fw={fw} onError={handleVisualError} />
    ));
    bySlot.set(slot, [...(bySlot.get(slot) ?? []), ...rendered]);
  }
  const visuals = (slot: SectionKey) => bySlot.get(slot) ?? null;

  // Klinik : repli par entrée `{ section: 'klinik', text }`.
  const klinikSplit = splitByCollapse(fw.klinik, (k) => ({ section: 'klinik', text: k.text }), effectiveCollapsed);
  // Risikofaktoren : liste de chaînes.
  const risikoItems = fw.risikofaktoren ?? [];
  const risikoSplit = splitByCollapse(risikoItems, (t) => ({ section: 'risikofaktoren', text: t }), effectiveCollapsed);
  // Klassifikation : cartes nommées.
  const klassItems = fw.klassifikation ?? [];
  const klassSplit = splitByCollapse(klassItems, (k) => ({ section: 'klassifikation', name: k.name }), effectiveCollapsed);
  // Differenzialdiagnosen : lignes de tableau.
  const ddSplit = splitByCollapse(
    fw.differenzialdiagnosen,
    (d) => ({ section: 'differenzialdiagnosen', dd: d.dd }),
    effectiveCollapsed,
  );
  // Therapie : cartes par label.
  const therapieSplit = splitByCollapse(fw.therapie, (s) => ({ section: 'therapie', label: s.label }), effectiveCollapsed);
  // Diagnostik : repli par STUFE entière (une ref couvre tout le groupe).
  const stufenHidden = new Set(
    DIAGNOSTIK_STUFEN.filter((stufe) => isFieldCollapsed({ section: 'diagnostik', stufe }, effectiveCollapsed)),
  );
  const diagnostikVisibleStufen = DIAGNOSTIK_STUFEN.filter(
    (stufe) => fw.diagnostik.some((d) => d.stufe === stufe) && !stufenHidden.has(stufe),
  );
  const diagnostikHiddenStufen = DIAGNOSTIK_STUFEN.filter(
    (stufe) => fw.diagnostik.some((d) => d.stufe === stufe) && stufenHidden.has(stufe),
  );
  const diagnostikAllHidden = diagnostikVisibleStufen.length === 0 && diagnostikHiddenStufen.length > 0;
  // Aetiologie / Prognose : champ scalaire, tout ou rien.
  const aetiologieHidden = fw.aetiologie ? isFieldCollapsed({ section: 'aetiologie' }, effectiveCollapsed) : false;
  const prognoseHidden = fw.prognose ? isFieldCollapsed({ section: 'prognose' }, effectiveCollapsed) : false;
  // Red Flags (colonne latérale) : mêmes règles de repli par entrée (§3.3, R4).
  const redFlagsItems = fw.redFlags ?? [];
  const redFlagsSplit = splitByCollapse(redFlagsItems, (t) => ({ section: 'redFlags', text: t }), effectiveCollapsed);

  return (
    <div className="space-y-5">
      <header>
        <div className="eyebrow">{fw.specialty}</div>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tightish">{fw.pathology}</h1>
      </header>

      {/* Merksatz — aide-mémoire d'une ligne (rappel flash) */}
      {fw.merksatz && (
        <div className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-transparent px-4 py-3 dark:border-brand-900/40 dark:from-brand-900/20">
          <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-500 text-white"><Icon name="bulb" className="h-3.5 w-3.5" /></span>
          <p className="text-sm font-medium leading-relaxed text-brand-900 dark:text-brand-100"><span className="text-[10px] font-semibold text-brand-500">Merke&nbsp;·&nbsp;</span><AutoLink>{fw.merksatz}</AutoLink></p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="stagger space-y-4 lg:col-span-2">
          <Section title="Definition" icon="nav-book"><p className="prose-fsp"><AutoLink>{fw.definition}</AutoLink></p></Section>

          {fw.aetiologie && (
            <>
              {visuals('aetiologie')}
              {aetiologieHidden ? (
                <CollapsedSection title="Ätiologie" icon="brain" count={1}>
                  <p className="prose-fsp"><AutoLink>{fw.aetiologie}</AutoLink></p>
                </CollapsedSection>
              ) : (
                <Section title="Ätiologie" icon="brain"><p className="prose-fsp"><AutoLink>{fw.aetiologie}</AutoLink></p></Section>
              )}
            </>
          )}

          {risikoItems.length > 0 && (
            <>
              {visuals('risikofaktoren')}
              {risikoSplit.allHidden ? (
                <CollapsedSection title="Risikofaktoren" icon="alert" count={risikoSplit.hidden.length}>
                  <FactorGrid items={risikoItems} />
                </CollapsedSection>
              ) : (
                <Section title="Risikofaktoren" icon="alert">
                  <FactorGrid items={risikoSplit.visible} />
                  {risikoSplit.someHidden && (
                    <Repli count={risikoSplit.hidden.length}><FactorGrid items={risikoSplit.hidden} /></Repli>
                  )}
                </Section>
              )}
            </>
          )}

          {/* Klinik en DEUX blocs : le drapeau `atypisch` existe déjà dans les
              données, autant lui donner sa propre boîte — ce sont justement les
              formes atypiques qui font échouer à l'examen, les noyer dans la
              liste typique les rend invisibles. */}
          {visuals('klinik')}
          {klinikSplit.allHidden ? (
            <CollapsedSection title="Klinik" icon="pulse" count={klinikSplit.hidden.length}>
              <KlinikBody items={fw.klinik} />
            </CollapsedSection>
          ) : (
            <Section title="Klinik" icon="pulse">
              <KlinikBody items={klinikSplit.visible} />
              {klinikSplit.someHidden && (
                <Repli count={klinikSplit.hidden.length}><SymptomList items={klinikSplit.hidden} /></Repli>
              )}
            </Section>
          )}

          {/* Démarche diagnostique par ÉTAPE du raisonnement — l'ordre qu'on
              récite en Fallvorstellung (bien plus parlant qu'invasif/non-invasif). */}
          {visuals('diagnostik')}
          {diagnostikAllHidden ? (
            <CollapsedSection title="Diagnostisches Vorgehen" icon="search" count={diagnostikHiddenStufen.length}>
              <DiagnostikList stufen={DIAGNOSTIK_STUFEN} fw={fw} />
            </CollapsedSection>
          ) : (
            <Section title="Diagnostisches Vorgehen" icon="search">
              <DiagnostikList stufen={diagnostikVisibleStufen} fw={fw} />
              {diagnostikHiddenStufen.length > 0 && (
                <Repli count={diagnostikHiddenStufen.length}>
                  <DiagnostikList stufen={diagnostikHiddenStufen} fw={fw} />
                </Repli>
              )}
            </Section>
          )}

          {klassItems.length > 0 && (
            <>
              {visuals('klassifikation')}
              {klassSplit.allHidden ? (
                <CollapsedSection title="Klassifikation & Scores" icon="gauge" count={klassSplit.hidden.length}>
                  <KlassifikationList items={klassItems} />
                </CollapsedSection>
              ) : (
                <Section title="Klassifikation & Scores" icon="gauge">
                  <KlassifikationList items={klassSplit.visible} />
                  {klassSplit.someHidden && (
                    <Repli count={klassSplit.hidden.length}><KlassifikationList items={klassSplit.hidden} /></Repli>
                  )}
                </Section>
              )}
            </>
          )}

          {visuals('differenzialdiagnosen')}
          {ddSplit.allHidden ? (
            <CollapsedSection title="Differenzialdiagnosen (mit Kriterien)" icon="target" count={ddSplit.hidden.length}>
              <DDTable items={fw.differenzialdiagnosen} />
            </CollapsedSection>
          ) : (
            <Section title="Differenzialdiagnosen (mit Kriterien)" icon="target">
              <DDTable items={ddSplit.visible} />
              {ddSplit.someHidden && (
                <Repli count={ddSplit.hidden.length}><DDTable items={ddSplit.hidden} /></Repli>
              )}
            </Section>
          )}

          {/* Thérapie : sections propres à la pathologie (pas de moule imposé). */}
          {visuals('therapie')}
          {therapieSplit.allHidden ? (
            <CollapsedSection title="Therapie" icon="pill" count={therapieSplit.hidden.length}>
              <TherapieGrid items={fw.therapie} />
            </CollapsedSection>
          ) : (
            <Section title="Therapie" icon="pill">
              <TherapieGrid items={therapieSplit.visible} />
              {therapieSplit.someHidden && (
                <Repli count={therapieSplit.hidden.length}><TherapieGrid items={therapieSplit.hidden} /></Repli>
              )}
            </Section>
          )}

          {fw.prognose && (
            <>
              {visuals('prognose')}
              {prognoseHidden ? (
                <CollapsedSection title="Prognose" icon="gauge" count={1}>
                  <p className="prose-fsp"><AutoLink>{fw.prognose}</AutoLink></p>
                </CollapsedSection>
              ) : (
                <Section title="Prognose" icon="gauge"><p className="prose-fsp"><AutoLink>{fw.prognose}</AutoLink></p></Section>
              )}
            </>
          )}
        </div>

        {/* Colonne latérale : red flags, pièges, questions, liens */}
        <div className="stagger space-y-4">
          {redFlagsItems.length > 0 && (
            redFlagsSplit.allHidden ? (
              <details className="card group relative overflow-hidden border-rose-200 bg-rose-50 p-0 dark:border-rose-900/40 dark:bg-rose-900/10">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-rose-500" />
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2.5 px-4 py-3 pl-5 marker:content-none">
                  <span className="label flex items-center gap-1.5 text-rose-700 dark:text-rose-300"><Icon name="alert" className="h-3.5 w-3.5" />Red Flags — Alarmzeichen</span>
                  <span className="text-[11px] font-semibold text-rose-600 group-open:hidden dark:text-rose-300">Text anzeigen · {redFlagsSplit.hidden.length} Punkte</span>
                  <span className="hidden text-[11px] font-semibold text-rose-600 group-open:inline dark:text-rose-300">Text ausblenden</span>
                </summary>
                <div className="px-4 pb-4 pl-5"><AutoLinkList items={redFlagsItems} /></div>
              </details>
            ) : (
              <div className="card relative overflow-hidden border-rose-200 bg-rose-50 p-4 pl-5 dark:border-rose-900/40 dark:bg-rose-900/10">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-rose-500" />
                <div className="label mb-2 flex items-center gap-1.5 text-rose-700 dark:text-rose-300"><Icon name="alert" className="h-3.5 w-3.5" />Red Flags — Alarmzeichen</div>
                <AutoLinkList items={redFlagsSplit.visible} />
                {redFlagsSplit.someHidden && (
                  <Repli count={redFlagsSplit.hidden.length}><AutoLinkList items={redFlagsSplit.hidden} /></Repli>
                )}
              </div>
            )
          )}

          <div className="card relative overflow-hidden border-amber-200 bg-amber-50 p-4 pl-5 dark:border-amber-900/40 dark:bg-amber-900/10">
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-amber-500" />
            <div className="label mb-2 flex items-center gap-1.5 text-amber-700 dark:text-amber-300"><Icon name="alert" className="h-3.5 w-3.5" />Prüfungsfallen</div>
            <AutoLinkList items={fw.pruefungsfallen} />
          </div>

          <div className="card p-4">
            <div className="label mb-2 flex items-center gap-1.5"><Icon name="question" className="h-3.5 w-3.5" />Déjà demandé en examen</div>
            <div className="space-y-2.5">
              {fw.askedInExam.map((q, i) => (
                <details key={i} className="group rounded-lg border border-slate-200 dark:border-slate-800">
                  <summary className="cursor-pointer list-none px-3 py-2 text-[13px] font-medium marker:content-none hover:text-brand-600">
                    <span className="mr-1 text-slate-400 group-open:text-brand-500">Q</span><AutoLink>{q.frage}</AutoLink>
                  </summary>
                  <p className="border-t border-slate-100 px-3 py-2 text-[13px] text-slate-600 dark:border-slate-800 dark:text-slate-300"><AutoLink>{q.antwort}</AutoLink></p>
                </details>
              ))}
            </div>
          </div>

          {linkedCases.length > 0 && (
            <div className="card p-4">
              <div className="label mb-2">Cas liés</div>
              <div className="space-y-1.5">
                {linkedCases.map((c) => (
                  <Link key={c.id} to={`/cas/${c.id}`} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800">{c.name}</Link>
                ))}
              </div>
            </div>
          )}

          {linkedAufk.length > 0 && (
            <div className="card p-4">
              <div className="label mb-2">Aufklärungen</div>
              <div className="space-y-1.5">
                {linkedAufk.map((a) => (
                  <Link key={a.id} to={`/aufklaerung?open=${a.id}`} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800"><Icon name="nav-clipboard" className="h-4 w-4 shrink-0" />{a.shortName ?? a.name}</Link>
                ))}
              </div>
            </div>
          )}

          {terms.length > 0 && (
            <div className="card p-4">
              <div className="label mb-2">Fachbegriffe</div>
              <div className="flex flex-wrap gap-1.5">
                {terms.map((t) => <button key={t.id} onClick={() => openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KlinikBody({ items }: { items: { text: string; atypisch?: boolean }[] }) {
  return (
    <>
      <SymptomList items={items.filter((k) => !k.atypisch)} />
      {items.some((k) => k.atypisch) && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="label mb-1.5 flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
            <Icon name="alert" className="h-3.5 w-3.5" />Atypisch · leicht zu übersehen
          </div>
          <SymptomList items={items.filter((k) => k.atypisch)} tone="bg-amber-400" />
        </div>
      )}
    </>
  );
}

function DiagnostikList({ stufen, fw }: { stufen: readonly string[]; fw: { diagnostik: { stufe: string; text: string }[] } }) {
  return (
    <ol className="space-y-3">
      {stufen.map((stufe, si) => {
        const items = fw.diagnostik.filter((d) => d.stufe === stufe);
        if (!items.length) return null;
        const meta = STUFE_META[stufe as keyof typeof STUFE_META];
        return (
          <li key={stufe} className="flex gap-3">
            <div className="flex shrink-0 flex-col items-center">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold text-white ${meta.dot}`}>{si + 1}</span>
              <span className="mt-1 w-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${meta.text}`}>
                <Icon name={meta.icon} className="h-3.5 w-3.5" />{stufe}
              </div>
              <ul className="mt-1 space-y-1 text-sm">
                {items.map((d, i) => (
                  <li key={i} className="flex gap-2">
                    <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${meta.dot}`} />
                    <span><AutoLink>{d.text}</AutoLink></span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function KlassifikationList({ items }: { items: { name: string; inhalt: string }[] }) {
  return (
    <div className="space-y-2.5">
      {items.map((k, i) => (
        <div key={i} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-brand-600 dark:text-brand-300">{k.name}</div>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300"><AutoLink>{k.inhalt}</AutoLink></p>
        </div>
      ))}
    </div>
  );
}

function TherapieGrid({ items }: { items: { label: string; items: string[]; akut?: boolean }[] }) {
  return (
    <div className={`grid gap-3 ${items.length > 2 ? 'sm:grid-cols-3' : items.length === 2 ? 'sm:grid-cols-2' : ''}`}>
      {items.map((sek, i) => (
        <div key={i} className={`rounded-lg border p-2.5 ${sek.akut ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10' : 'border-slate-200 dark:border-slate-800'}`}>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${sek.akut ? 'text-rose-700 dark:text-rose-300' : 'text-brand-600 dark:text-brand-300'}`}>
            {sek.akut && <Icon name="alert" className="h-3.5 w-3.5" />}{sek.label}
          </div>
          <AutoLinkList items={sek.items} className="mt-1.5 space-y-1 text-[13px]" />
        </div>
      ))}
    </div>
  );
}

/** Facteurs de risque en grille : une colonne unique de onze puces se lit mal.
 *  Beaucoup d'entrées sont rédigées « Terme — précision » : on détache alors le
 *  terme (ce qu'on doit citer) de sa glose (ce qui l'explique). */
function FactorGrid({ items }: { items: string[] }) {
  return (
    // Flux en colonnes (et non grille) : les entrées ont des hauteurs très
    // inégales et une grille alignerait les lignes sur la plus haute, créant
    // des trous blancs qu'on lit comme des oublis.
    <ul className="text-sm sm:columns-2 sm:gap-x-5">
      {items.map((raw, i) => {
        const [, lead, rest] = /^(.{3,48}?)\s+[—–-]\s+(.+)$/s.exec(raw) ?? [];
        return (
          <li key={i} className="mb-1.5 flex break-inside-avoid gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
            <span>
              {lead ? (
                <>
                  <span className="font-medium"><AutoLink>{lead}</AutoLink></span>
                  <span className="text-slate-500 dark:text-slate-400"> — <AutoLink>{rest}</AutoLink></span>
                </>
              ) : (
                <AutoLink>{raw}</AutoLink>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
