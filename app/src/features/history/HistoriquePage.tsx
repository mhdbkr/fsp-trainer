// ============================================================================
// Historique — un carnet de séances (S4-6, spec 2026-10-04 « 5 · Historique »).
// Une séance regroupe ce qui a été fait d'un trait et dit ce que ça a changé :
// cadrans avant/après, scores, termes posés, oublis à revoir. Tout se dérive du
// journal (`seances.ts`) ; un chiffre qui ne mène à rien n'est pas affiché.
// ============================================================================
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, startOfWeek, subWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db } from '@/db/db';
import type { Case, SimTeil } from '@/db/types';
import { useAllTerms, useCases, useFachbegriffe, useFavorites } from '@/hooks/useData';
import { useTrainingEvents } from '@/features/program/useProgram';
import { CaseDial } from '@/components/visuals/CaseDial';
import { EmptyState } from '@/components/ui';
import { dialData } from '@/lib/dialData';
import { lookupTerm } from '@/lib/dictionary';
import { personalTermId } from '@/lib/collections/personalTerms';
import { toggleFavorite } from '@/lib/collections';
import { now } from '@/lib/clock';
import { TEILE } from '@/lib/simScope';
import {
  casDeSeance, ligneSemaine, motsDeSeance, seances, tendanceSemaine, texteSemaine,
  type Carte, type CasDeSeance, type MotDeSeance, type Seance,
} from './seances';

const ARTICLE: Record<SimTeil, string> = { anamnese: 'l’Anamnese', dokumentation: 'la Dokumentation', fallvorstellung: 'la Fallvorstellung' };
const moment = (d: Date) => { const h = d.getHours(); return h < 5 ? 'nuit' : h < 12 ? 'matin' : h < 18 ? 'après-midi' : 'soirée'; };
const titreSeance = (at: number) => { const t = format(at, 'EEEE d MMM', { locale: fr }); return `${t[0].toUpperCase()}${t.slice(1)} · ${moment(new Date(at))}`; };
const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n === 1 ? un : plusieurs}`;

export function HistoriquePage() {
  const cases = useCases();
  const events = useTrainingEvents();
  const favoris = useFavorites();
  const fachbegriffe = useFachbegriffe();
  const termes = useAllTerms();
  const cherches = useLiveQuery(() => db.termes_cherches.toArray(), [], undefined);
  const depuis = subWeeks(startOfWeek(now(), { weekStartsOn: 1 }), 1).toISOString();
  const revus = useLiveQuery(() => db.progress_events.where('type').equals('srs.reviewed').filter((e) => e.occurred_at >= depuis).toArray(), [depuis], undefined);

  const parCas = useMemo(() => new Map((cases ?? []).map((c) => [c.id, c])), [cases]);
  const carnet = useMemo(() => (events ? seances(events).map((s) => ({ s, cas: casDeSeance(s, events) })) : undefined), [events]);
  const cartes = useMemo(() => new Map<string, Carte>((termes ?? []).map((t) => [t.id, { id: t.id, term: t.term }])), [termes]);
  const resoudre = useMemo(() => (terme: string): Carte | null => {
    const fb = lookupTerm(terme, fachbegriffe ?? []);
    return fb ? { id: fb.id, term: fb.term } : cartes.get(personalTermId(terme)) ?? null;
  }, [fachbegriffe, cartes]);

  if (!cases || !carnet || !events || !favoris || !cherches || !termes || !revus) return <div className="text-slate-400">Chargement…</div>;

  const semaine = ligneSemaine(events, revus, now());
  const tendance = tendanceSemaine(semaine);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Carnet de séances</div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tightish">Historique</h1>
        <p data-semaine="" className="mt-1 text-slate-600 dark:text-slate-300">
          {texteSemaine(semaine)}
          {tendance && (
            <span className="ml-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span aria-hidden className="tnum">{tendance.sens === 'hausse' ? '↑' : tendance.sens === 'baisse' ? '↓' : '='}</span> {tendance.texte}
            </span>
          )}
        </p>
      </header>

      {carnet.length === 0 ? (
        <EmptyState icon="history" title="Rien à afficher pour l'instant" hint="Ta première séance ouvrira le carnet." />
      ) : (
        <div className="space-y-4">
          {carnet.map(({ s, cas }) => (
            <SeanceCarte key={s.events[0].id} s={s} cas={cas} parCas={parCas}
              mots={motsDeSeance(s, favoris, cherches, resoudre, cartes)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SeanceCarte({ s, cas, parCas, mots }: { s: Seance; cas: CasDeSeance[]; parCas: Map<string, Case>; mots: MotDeSeance[] }) {
  const autres = (kind: string) => s.events.filter((e) => e.kind === kind && !cas.some((c) => c.ids.includes(e.id)));
  const resume = [
    s.minutes > 0 && { texte: `${s.minutes} min` },
    cas.length > 0 && { texte: pluriel(cas.length, 'cas', 'cas') },
    ...([['drill', 'drill'], ['fiche', 'fiche'], ['aufklaerung', 'Aufklärung'], ['examen-blanc', 'examen à blanc', 'examens à blanc'], ['simulation', 'partie']] as const)
      .map(([k, un, plusieurs]) => { const xs = autres(k); return xs.length > 0 && { texte: pluriel(xs.length, un, plusieurs), ids: xs.map((e) => e.id) }; }),
  ].filter((x): x is { texte: string; ids?: string[] } => !!x);

  return (
    <article className="card space-y-3 p-4">
      <div>
        <h2 className="font-semibold">{titreSeance(s.debut)}</h2>
        <p className="mono-tag tnum mt-1 inline-block">
          {resume.map((r, i) => <span key={r.texte} data-te={r.ids?.join(' ')}>{i > 0 && ' · '}{r.texte}</span>)}
        </p>
      </div>

      {cas.length > 0 && (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {cas.map((c) => <LigneCas key={c.caseId} c={c} nom={parCas.get(c.caseId)?.name ?? c.caseId} />)}
        </ul>
      )}

      {mots.length > 0 && <PendantLaSeance mots={mots} />}
    </article>
  );
}

function LigneCas({ c, nom }: { c: CasDeSeance; nom: string }) {
  const scores = TEILE.filter((t) => c.scores[t.key] !== undefined);
  return (
    <li data-te={c.ids.join(' ')} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <CaseDial data={dialData(c.avant)} size={36} nom={`${nom}, avant la séance`} ouvrable={false} />
          <span aria-hidden className="text-xs text-slate-400">→</span>
          <CaseDial data={dialData(c.apres)} size={36} nom={`${nom}, après la séance`} action={false} />
        </div>
        <div className="min-w-0">
          <Link to={`/cas/${c.caseId}`} className="block truncate text-sm font-medium hover:underline">{nom}</Link>
          <div className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            {scores.length === 0 && <span>non mesurée</span>}
            {scores.map((t) => <span key={t.key}>{t.label} <span className="font-mono tnum">{c.scores[t.key]}</span></span>)}
            {c.autoEvalue && <span title="Score déclaré par toi, pas mesuré par l'app">auto-évaluée</span>}
            {c.horsPlan && <span>hors plan</span>}
          </div>
        </div>
      </div>
      {(c.oublis || c.aRejouer) && (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {c.oublis && (
            <Link to={`/simulation/${c.caseId}/run?sim=${encodeURIComponent(c.oublis.simId)}`} className="btn-outline min-h-11 text-xs">
              {c.oublis.n === 1 ? 'Revoir mon oubli' : `Revoir mes ${c.oublis.n} oublis`}
            </Link>
          )}
          {c.aRejouer && (
            <Link to={`/simulation/${c.caseId}/pre?depart=${c.aRejouer}`} className="btn-outline min-h-11 text-xs">
              Rejouer {ARTICLE[c.aRejouer]}
            </Link>
          )}
        </div>
      )}
    </li>
  );
}

function PendantLaSeance({ mots }: { mots: MotDeSeance[] }) {
  return (
    <section className="border-t border-slate-200 pt-3 dark:border-slate-800">
      <h3 className="label">Pendant cette séance</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {mots.map((m) => (
          <li key={m.termId}>
            {m.favori ? (
              <span data-favori="" className="chip min-h-11 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span>{m.terme}</span> <span aria-label="en favori" className="text-brand-500">★</span>
              </span>
            ) : (
              <button type="button" aria-label={`Envoyer ${m.terme} au drill`}
                onClick={() => { void toggleFavorite(m.termId).catch((e) => console.warn('[favori]', e)); }}
                className="chip min-h-11 border border-slate-300 bg-white text-slate-700 hover:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <span>{m.terme}</span> <span className="text-slate-500 dark:text-slate-400">· cherché {m.cherche} fois</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
