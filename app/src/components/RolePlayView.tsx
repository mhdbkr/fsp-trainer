import { useEffect, useMemo, useState } from 'react';
import type { PatientSheet } from '@/db/types';
import { buildRollenskript, type RoleChapter, type RoleLine } from '@/lib/rolePlay';
import { Icon } from '@/components/icons';

// ============================================================================
// Rollenskript — fiche de rôle JOUABLE du partenaire, présentée en ONGLETS
// (un chapitre à la fois, aligné sur le guide d'anamnèse du candidat).
//  • navigation par chapitres (tap → le chapitre, pas de scroll à chasser),
//  • par chapitre : ce que tu dis spontanément + réponses en bulles claires,
//    faits bruts (coup d'œil) et négatifs en chips « ✗ »,
//  • recherche instantanée sur toutes les répliques,
//  • répliques de spontanéité / patient difficile dans un panneau dédié,
//  • suivi live du chapitre que le candidat interroge (followChapterId).
// Aucun écouteur de scroll → robuste (2ᵉ écran, fenêtre isolée, etc.).
// ============================================================================

const stripKein = (s: string) => s.replace(/^kein(e|en|em|er)?\s+/i, '').replace(/,\s*kein(e|en|em|er)?\s+/gi, ', ');

export function RolePlayView({ sheet, followChapterId }: {
  sheet: PatientSheet; followChapterId?: string | null;
}) {
  const chapters = useMemo(() => buildRollenskript(sheet), [sheet]);
  const [activeId, setActiveId] = useState<string>(chapters[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const p = sheet.personalia;
  const reactions = sheet.schwierigeReaktionen ?? [];

  // Suivi live : le candidat change de chapitre → on sélectionne l'onglet.
  useEffect(() => {
    if (followChapterId && chapters.some((c) => c.id === followChapterId)) setActiveId(followChapterId);
  }, [followChapterId, chapters]);

  const active = chapters.find((c) => c.id === activeId) ?? chapters[0];

  // Recherche : liste plate.
  const q = query.trim().toLowerCase();
  const searchHits = useMemo(() => {
    if (!q) return [];
    const hits: { ch: RoleChapter; line: RoleLine }[] = [];
    for (const ch of chapters) {
      for (const line of ch.lines) if (line.antwort.toLowerCase().includes(q) || line.frage?.toLowerCase().includes(q)) hits.push({ ch, line });
      for (const g of ch.glance) if (g.toLowerCase().includes(q)) hits.push({ ch, line: { antwort: g } });
    }
    return hits.slice(0, 16);
  }, [q, chapters]);

  if (!active) return <p className="py-8 text-center text-sm text-slate-400">Aucune fiche de rôle pour ce cas.</p>;

  const pos = active.lines.filter((l) => !l.negativ);
  const negs = active.lines.filter((l) => l.negativ);
  // Ce que le patient dit spontanément quand le sujet arrive (immersion).
  const opener = active.id === 'aktuell' ? sheet.leitsymptome[0] : undefined;

  return (
    <div className="space-y-3">
      {/* En-tête d'incarnation */}
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-amber-900/40 dark:from-amber-900/15 dark:to-orange-900/10">
        <div className="flex items-start gap-3">
          <Icon name="mask" className="h-8 w-8 shrink-0 text-amber-600 dark:text-amber-300" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-bold">Du bist {p.name}, {p.age}{p.beruf ? ` — ${p.beruf}` : ''}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-900/90 dark:text-amber-100/90">
              {sheet.persona ?? 'Réponds seulement aux questions posées, dans le cadre de la fiche.'}
            </p>
          </div>
        </div>
      </div>

      {/* Recherche + bouton « Corser » */}
      <div className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Le candidat demande… (Stuhl, Fieber, rauchen…)"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900" />
        {reactions.length > 0 && (
          <button onClick={() => setShowReactions((o) => !o)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${showReactions ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'}`}
            title="Répliques de spontanéité / patient difficile"><Icon name="mask" className="h-3.5 w-3.5" />Corser</button>
        )}
      </div>

      {showReactions && reactions.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/40">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-rose-500"><Icon name="mask" className="h-3 w-3" />À lâcher quand tu veux corser</div>
          <div className="space-y-1.5">
            {reactions.map((r, i) => (
              <div key={i} className="rounded-lg bg-white px-3 py-1.5 text-[13px] leading-snug text-rose-800 ring-1 ring-rose-100 dark:bg-rose-900/30 dark:text-rose-100 dark:ring-rose-900/50">{r}</div>
            ))}
          </div>
        </div>
      )}

      {q ? (
        /* Recherche : réponses directes */
        <div className="space-y-2">
          {searchHits.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Rien dans la fiche — réponds « Nein » ou improvise sobrement.</p>}
          {searchHits.map((h, i) => (
            <div key={i}>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400"><Icon name={h.ch.icon} className="h-3 w-3" />{h.ch.title}</div>
              <Bubble line={h.line} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Onglets de chapitres — un tap → le chapitre */}
          <div className="sticky top-14 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl bg-slate-50/95 px-1 py-1.5 backdrop-blur dark:bg-slate-950/95">
            {chapters.map((ch) => {
              const on = ch.id === active.id;
              return (
                <button key={ch.id} onClick={() => setActiveId(ch.id)} title={ch.title}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors ${on ? 'bg-brand-600 text-white shadow-sm' : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'}`}>
                  <Icon name={ch.icon} className="h-3.5 w-3.5" />
                  <span className={on ? '' : 'hidden sm:inline'}>{ch.title}</span>
                </button>
              );
            })}
          </div>

          {/* Contenu du chapitre actif */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Icon name={active.icon} className="h-5 w-5" /></span>
              <h3 className="text-sm font-bold">{active.title}</h3>
            </div>

            {opener && (
              <div className="rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2 dark:border-brand-900/40 dark:bg-brand-900/15">
                <div className="text-[10px] font-bold uppercase tracking-wide text-brand-500">Tu ouvres spontanément par</div>
                <p className="mt-0.5 text-sm font-medium text-brand-900 dark:text-brand-100">« {opener} »</p>
              </div>
            )}

            {active.glance.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {active.glance.map((g, i) => <span key={i} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{g}</span>)}
              </div>
            )}

            {pos.length > 0 && <div className="space-y-1.5">{pos.map((line, i) => <Bubble key={i} line={line} />)}</div>}

            {negs.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Réponds « non » si on demande</div>
                <div className="flex flex-wrap gap-1.5">
                  {negs.map((n, i) => <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">✗ {stripKein(n.antwort)}</span>)}
                </div>
              </div>
            )}

            {pos.length === 0 && negs.length === 0 && active.glance.length === 0 && (
              <p className="py-3 text-center text-xs text-slate-400">Rien de particulier ici — reste sobre.</p>
            )}
          </div>

          {/* Navigation chapitre précédent / suivant */}
          <ChapterNav chapters={chapters} activeId={active.id} onPick={setActiveId} />
        </>
      )}
    </div>
  );
}

// Bulle de réplique : réponse en avant, question en repère discret au-dessus.
function Bubble({ line }: { line: RoleLine }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
      {line.frage && <div className="text-[11px] leading-tight text-slate-400">{line.frage}</div>}
      <div className="mt-0.5 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{line.antwort}</div>
    </div>
  );
}

function ChapterNav({ chapters, activeId, onPick }: { chapters: RoleChapter[]; activeId: string; onPick: (id: string) => void }) {
  const idx = chapters.findIndex((c) => c.id === activeId);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;
  return (
    <div className="flex items-center justify-between gap-2">
      <button onClick={() => prev && onPick(prev.id)} disabled={!prev} className="btn-ghost text-xs disabled:opacity-30">← {prev?.title ?? ''}</button>
      <span className="text-[10px] text-slate-400">{idx + 1}/{chapters.length}</span>
      <button onClick={() => next && onPick(next.id)} disabled={!next} className="btn-ghost text-xs disabled:opacity-30">{next?.title ?? ''} →</button>
    </div>
  );
}
