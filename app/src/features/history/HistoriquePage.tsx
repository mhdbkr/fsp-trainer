// ============================================================================
// Historique — un carnet de séances (S4-6, spec 2026-10-04 « 5 · Historique »).
// Une séance regroupe ce qui a été fait d'un trait et dit ce que ça a changé :
// cadrans avant/après, scores, termes posés, oublis à revoir. Tout se dérive du
// journal (`seances.ts`) ; un chiffre qui ne mène à rien n'est pas affiché.
// ============================================================================
import { useMemo, useState } from 'react';
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
  const [voirTout, setVoirTout] = useState(false);
  const [specialite, setSpecialite] = useState('');
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
  const specialiteDe = (caseId: string) => parCas.get(caseId)?.specialty;
  const specialites = [...new Set(carnet.flatMap(({ cas }) => cas.map((c) => specialiteDe(c.caseId)).filter((x) => !!x)))].sort();
  const filtre = specialite ? carnet.filter(({ cas }) => cas.some((c) => specialiteDe(c.caseId) === specialite)) : carnet;
  // Cette semaine et la précédente ; le reste derrière un bouton. Les séances vont de la plus récente à la plus ancienne.
  const recentes = filtre.filter(({ s }) => s.debut >= Date.parse(depuis));
  const plusAnciennes = filtre.length - recentes.length;
  const vues = voirTout ? filtre : recentes;
  // Le nom d'un cas mène au cas une fois par page : sur sa séance la plus récente à l'écran.
  const lies = new Set<string>();
  const aLier = new Map<Seance, Set<string>>();
  for (const { s, cas } of vues) {
    const ids = cas.map((c) => c.caseId).filter((id) => !lies.has(id));
    for (const id of ids) lies.add(id);
    aLier.set(s, new Set(ids));
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Carnet de séances</div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tightish">Historique</h1>
        {carnet.length > 0 && (
          <p data-semaine="" className="mt-1 text-slate-600 dark:text-slate-300">
            {texteSemaine(semaine)}
            {tendance && (
              <span className="inline-block text-sm sm:ml-1.5 text-slate-500 dark:text-slate-400">
                <span aria-hidden className="tnum">{tendance.sens === 'hausse' ? '↑' : tendance.sens === 'baisse' ? '↓' : '='}</span> {tendance.texte}
              </span>
            )}
          </p>
        )}
        {specialites.length > 1 && (
          <select aria-label="Spécialité" value={specialite} onChange={(e) => setSpecialite(e.target.value)}
            className="field-line mt-3 min-h-11 w-auto max-w-full text-sm">
            <option value="">Toutes les spécialités</option>
            {specialites.map((x) => <option key={x}>{x}</option>)}
          </select>
        )}
      </header>

      {carnet.length === 0 ? (
        <EmptyState icon="history" title="Rien à afficher pour l'instant" hint="Ta première séance ouvrira le carnet." />
      ) : (
        <div className="space-y-4">
          {vues.map(({ s, cas }) => (
            <SeanceCarte key={s.events[0].id} s={s} cas={cas} parCas={parCas} aLier={aLier.get(s)!}
              mots={motsDeSeance(s, favoris, cherches, resoudre, cartes)} />
          ))}
          {plusAnciennes > 0 && (
            <button type="button" data-plus-anciennes="" onClick={() => setVoirTout((v) => !v)} className="btn-ghost min-h-11 w-full text-sm">
              {voirTout ? 'Voir moins' : plusAnciennes === 1 ? 'Voir la séance plus ancienne' : `Voir les ${plusAnciennes} séances plus anciennes`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Les exercices sans ligne de cas, nommés par ce que le journal en sait : le cas lié, sinon leur genre.
const HORS_CAS = [
  ['drill', 'drill', 'drills', 'Fachbegriffe'],
  ['fiche', 'fiche', 'fiches', 'Fachwissen'],
  ['aufklaerung', 'Aufklärung', 'Aufklärungen', ''],
  ['examen-blanc', 'examen à blanc', 'examens à blanc', ''],
  ['simulation', 'partie', 'parties', ''],
] as const;

function SeanceCarte({ s, cas, parCas, aLier, mots }: { s: Seance; cas: CasDeSeance[]; parCas: Map<string, Case>; aLier: Set<string>; mots: MotDeSeance[] }) {
  const horsCas = s.events.filter((e) => !cas.some((c) => c.ids.includes(e.id)));
  const groupes = HORS_CAS.flatMap(([k, un, plusieurs, defaut]) => {
    const parNom = new Map<string, string[]>();
    for (const e of horsCas.filter((x) => x.kind === k)) {
      const nom = (e.caseId && parCas.get(e.caseId)?.name) || defaut;
      parNom.set(nom, [...(parNom.get(nom) ?? []), e.id]);
    }
    return [...parNom].map(([nom, ids]) => ({ texte: `${ids.length === 1 ? un : `${ids.length} ${plusieurs}`}${nom ? ` ${nom}` : ''}`, ids }));
  });
  const resume = [
    s.minutes > 0 && { texte: `${s.minutes} min` },
    cas.length > 0 && { texte: pluriel(cas.length, 'cas', 'cas') },
    ...groupes,
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
        <ul className="divide-y divide-slate-200 dark:divide-ink-700">
          {cas.map((c) => <LigneCas key={c.caseId} c={c} nom={parCas.get(c.caseId)?.name ?? c.caseId} lier={aLier.has(c.caseId)} />)}
        </ul>
      )}

      {mots.length > 0 && <PendantLaSeance mots={mots} />}
    </article>
  );
}

function LigneCas({ c, nom, lier }: { c: CasDeSeance; nom: string; lier: boolean }) {
  const scores = TEILE.filter((t) => c.scores[t.key] !== undefined);
  return (
    <li data-te={c.ids.join(' ')} className="flex flex-col gap-2 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <CaseDial data={dialData(c.avant)} size={36} nom={`${nom}, avant la séance`} ouvrable={false} />
          <span aria-hidden className="text-xs text-slate-400">→</span>
          <CaseDial data={dialData(c.apres)} size={36} nom={`${nom}, après la séance`} ouvrable={false} />
        </div>
        <div className="min-w-0">
          {lier
            ? <Link to={`/cas/${c.caseId}`} className="block text-sm font-medium hover:underline">{nom}</Link>
            : <span className="block text-sm font-medium">{nom}</span>}
          <div className="flex flex-wrap gap-x-2 text-xs text-slate-500 dark:text-slate-400">
            {scores.length === 0 && !c.autoEvalue && <span>partie non mesurée</span>}
            {scores.map((t) => <span key={t.key}>{t.label} <span className="font-mono tnum">{c.scores[t.key]}</span></span>)}
            {c.autoEvalue && <span title="Score déclaré par toi, pas mesuré par l'app">partie auto-évaluée</span>}
            {c.examen && <span data-examen-ligne={c.examen}>{c.examen === 'complet' ? 'Examen' : 'Examen interrompu'}</span>}
          </div>
        </div>
      </div>
      {(c.oublis || c.aRejouer) && (
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {c.oublis && (
            <Link to={`/simulation/${c.caseId}/run?sim=${encodeURIComponent(c.oublis.simId)}&voir=oublis`} className="btn-outline min-h-11 text-xs">
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
    <section className="border-t border-slate-200 pt-3 dark:border-ink-700">
      <h3 className="label">Pendant cette séance</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {mots.map((m) => (
          <li key={m.termId}>
            {m.favori ? (
              <span data-favori="" className="chip min-h-11 bg-slate-100 text-slate-700 dark:bg-ink-700 dark:text-slate-200">
                <span>{m.terme}</span> <span aria-hidden className="text-brand-500">★</span><span className="sr-only">en favori</span>
              </span>
            ) : (
              <button type="button" title="Envoyer au drill"
                onClick={() => { void toggleFavorite(m.termId).catch((e) => console.warn('[favori]', e)); }}
                className="chip min-h-11 border border-slate-300 bg-white text-slate-700 hover:border-brand-400 dark:border-ink-600 dark:bg-transparent dark:text-slate-200">
                {m.terme} <span className="text-slate-500 dark:text-slate-400">· cherché {m.cherche} fois</span><span className="sr-only">, envoyer au drill</span> <span aria-hidden>☆</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
