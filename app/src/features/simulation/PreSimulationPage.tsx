import { cqText, cqFollowUp } from '@/lib/caseQuestions';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { Case, CaseQuestionLue } from '@/db/types';
import { CaseDial, CaseDialDetail } from '@/components/visuals/CaseDial';
import { dialData } from '@/lib/dialData';
import { blankProgress } from '@/lib/journal';
import { useCaseProgress } from '@/features/program/useProgram';
import { useCase, useFachwissen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { SimulationSetup, PartnerCard, StartButton, type Aide } from './SimulationSetup';
import { departDe } from './useLauf';
import { termsInOrder } from '@/lib/collections/caseTerms';

// ============================================================================
// L'échauffement avant le chrono. UNE anatomie, toujours la même — [S4] ordre
// OPPOSABLE (simulation-run.md §10.1, ADR-0021 déc. 8) :
//   1. le cas, son cadran (`CaseDial`, détail ouvert) et le départ
//   2. avec qui tu joues      3. le niveau d'assistance      4. le Muster
//   puis de quoi te remettre en tête.
//
// Aucun choix de Teil : la partie porte toujours les trois Teile (INV-70). Le
// `ModeChooser` « complète / un Teil » a disparu ; `?depart=` (l'ancien `?teil=`
// est lu de même) dit seulement par où la partie commence.
// ============================================================================

/** Les questions du cas, chacune avec sa relance (Q0) en repère discret. */
export function CaseQuestionList({ questions }: { questions: CaseQuestionLue[] }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {questions.map((q, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
          <span><AutoLink>{cqText(q)}</AutoLink>{cqFollowUp(q) && <span className="mt-0.5 block border-l border-brand-300/70 pl-2 text-xs text-slate-400 dark:border-brand-700/60"><AutoLink>{cqFollowUp(q)!}</AutoLink></span>}</span>
        </li>
      ))}
    </ul>
  );
}

export function PreSimulationPage() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const depart = departDe(params);
  const taskId = params.get('task') ?? undefined;                  // R-C4 : tâche du plan, si lancée depuis le plan
  const c = useCase(caseId);
  const progress = useCaseProgress();
  const fw = useFachwissen(c?.linkedFachwissenId);
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);

  if (!c) return <div className="text-slate-400">Chargement…</div>;
  const terms = termsInOrder(c.linkedFachbegriffeIds, begriffe ?? []);   // ordre publié conservé (diagnostic d'abord)
  const aide: Aide = depart ?? 'komplett';                          // la partie entière, ou le Teil de départ (fixeur I3)
  // Le cadran LIT `case_progress` (INV-59) ; un cas jamais joué a sa ligne vierge.
  const dial = dialData(progress?.get(c.id) ?? blankProgress(c.id));
  const diagnose = vorstellungsDiagnose(c);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* 1 — Le cas : son cadran, détail ouvert (training-journal.md §12.7), et le départ */}
      <header className="text-center">
        <div className="text-sm font-semibold text-brand-500">Échauffement</div>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">Révise 2 minutes, respire, puis entre en simulation.</p>
        <div className="mx-auto mt-3 flex max-w-lg flex-col items-center gap-4 text-left sm:flex-row sm:items-start">
          <CaseDial data={dial} size={96} nom={c.name} action={false} ouvrable={false} />   {/* le détail est déjà ouvert à côté (I1) */}
          <div className="card min-w-0 flex-1 p-3 text-sm"><CaseDialDetail data={dial} action={false} /></div>
        </div>
        {/* Le départ, en tête de page : jamais enfoui sous les réglages. */}
        <div className="mt-3 flex flex-col items-center gap-1">
          <StartButton caseId={c.id} depart={depart} taskId={taskId} />
          <Link viewTransition to={`/cas/${c.id}`} className="btn-ghost text-xs">← Fiche du cas</Link>
        </div>
      </header>

      {/* 2 — Avec qui tu joues : un choix, pas un départ (le départ est en tête de page). */}
      <PartnerCard caseId={c.id} depart={depart} />

      {/* 3 et 4 — Le niveau d'assistance (la couche y est fondue), puis le Muster. */}
      <SimulationSetup caseId={c.id} aide={aide} taskId={taskId} />

      {/* 5 — De quoi te remettre en tête. Les quatre blocs sont TOUJOURS là ;
             c'est leur contenu qui suit le Teil de départ. */}
      <div className="grid gap-4 md:grid-cols-2">
        {fw && (
          <div className="card p-5">
            <div className="label mb-2 flex items-center gap-1.5"><Icon name="key" className="h-3.5 w-3.5" />Notions clés</div>
            <p className="text-sm"><AutoLink>{fw.definition}</AutoLink></p>
            {fw.pruefungsfallen.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-amber-600 dark:text-amber-300">Pièges probables :</div>
                <AutoLinkList items={fw.pruefungsfallen.slice(0, 3)} className="mt-1 space-y-1 text-sm" />
              </div>
            )}
          </div>
        )}

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="question" className="h-3.5 w-3.5" />Questions d'anamnèse à ne pas oublier</div>
          <p className="mb-2 text-[11px] text-slate-400">{QUESTIONS_HINT[aide]}</p>
          <CaseQuestionList questions={c.caseSpecificQuestions} />
        </div>

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="speech" className="h-3.5 w-3.5" />Phrases de Fallvorstellung</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            « {vorstellungsSatz(c)} Verdachtsdiagnose: <b><AutoLink>{diagnose.text}</AutoLink></b>{diagnose.offen ? '…' : ''} »
          </p>
          <p className="mt-2 text-sm text-slate-500">{VORSTELLUNG_HINT[aide]}</p>
        </div>

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="nav-abc" className="h-3.5 w-3.5" />Fachbegriffe du thème ({terms.length})</div>
          <div className="flex flex-wrap gap-1.5">
            {terms.slice(0, 12).map((t) => (
              <button key={t.id} onClick={() => openGlossary(t)} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300">{t.term}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** La phrase d'ouverture de la Fallvorstellung, accordée au cas (fixeur B2 : « le cas sait lequel ») :
 *  « Herr Aupperle ist ein 58-jähriger Patient. » — le diagnostic suit à part, « Verdachtsdiagnose: … », sans flexion :
 *  « der sich mit {verdachtsdiagnose} » le mettait au nominatif après « mit » (« mit Stabile Angina pectoris », revue Q3),
 *  et aucun champ du cas ne donne le motif sous forme nominale déclinable. */
export function vorstellungsSatz(c: Pick<Case, 'patientSheet'>): string {
  const p = c.patientSheet.personalia;
  const w = p.geschlecht === 'w';
  const nachname = p.name.trim().split(/\s+/).pop() ?? p.name;
  return `${w ? 'Frau' : 'Herr'} ${nachname} ist ${w ? 'eine' : 'ein'} ${p.age}-jährige${w ? '' : 'r'} Patient${w ? 'in' : ''}.`;
}

const FUNKTIONSWORT_AM_ENDE = /(?:\s+(?:der|die|das|des|dem|den|ein|eine|einer|eines|einem|und|oder|mit|von|bei|im|in|am|an|auf|zu|zur|zum|nach|durch|für|aus|vom|beim))+$/;
/** Point qui ne finit pas une phrase : initiale, nombre, abréviation (« Z. n. », « A. cerebri », « ca. 34 », « bzw. »). */
const ABKUERZUNG = /(?:^|[\s(])(?:[A-Za-zÄÖÜäöü]|\d+|ca|bzw|vs|Nr|St|Dr|ggf|evtl|inkl|etc)\.$/;
/** La première phrase d'un texte : coupe au premier point suivi d'une espace et d'une majuscule, sauf après une abréviation. */
export function ersterSatz(text: string): string {
  const t = text.trim();
  for (const m of t.matchAll(/\.\s+(?=[A-ZÄÖÜ])/g)) {
    const kopf = t.slice(0, m.index! + 1);
    if (!ABKUERZUNG.test(kopf)) return kopf;
  }
  return t;
}
/** Le diagnostic de la phrase de Fallvorstellung (revue Q3) : sa première phrase ; si la ligne entière dépasse `max`
 *  caractères, coupée à la dernière articulation (« — », « ; », « , », « ( ») avant la borne. `offen` = la phrase est
 *  incomplète (coupée, ou sans ponctuation finale) : le rendu ajoute « … ». */
export function vorstellungsDiagnose(c: Pick<Case, 'patientSheet' | 'medicalView'>, max = 200): { text: string; offen: boolean } {
  const vor = `${vorstellungsSatz(c)} Verdachtsdiagnose: `;
  const d = ersterSatz(c.medicalView.verdachtsdiagnose);
  if (vor.length + d.length <= max) return { text: d, offen: !/[.!?]$/.test(d) };
  const kopf = d.slice(0, max - vor.length - 1);   // place pour « … »
  // la dernière articulation HORS parenthèses : jamais « (Diabetes mellitus… » laissé ouvert
  let i = -1, tiefe = 0;
  for (let k = 0; k < kopf.length; k++) {
    const ch = kopf[k];
    if (ch === '(') { if (tiefe === 0 && k > 0 && kopf[k - 1] === ' ') i = k - 1; tiefe++; }
    else if (ch === ')') tiefe = Math.max(0, tiefe - 1);
    else if (tiefe === 0 && (ch === ',' || ch === ';' || ch === ':' || (ch === '—' && kopf[k - 1] === ' '))) i = ch === '—' ? k - 1 : k;
  }
  // sans articulation : au dernier mot, sans finir sur un article ou une préposition (« … und des… »)
  const text = (i > 20 ? kopf.slice(0, i) : kopf.slice(0, kopf.lastIndexOf(' ')).replace(FUNKTIONSWORT_AM_ENDE, ''))
    .replace(/[\s,;:(—–-]+$/, '');
  return { text, offen: true };
}

// Le Teil de départ change ce que le bloc DIT, pas s'il existe ; sans départ, la partie entière (I3).
const QUESTIONS_HINT: Record<Aide, string> = {
  komplett: 'À poser pendant l\'Anamnese — elles reviennent dans la Dokumentation et la Fallvorstellung.',
  anamnese: 'C\'est maintenant qu\'elles se posent : les oublier coûte sur les trois parties.',
  dokumentation: 'Tu documentes les réponses à ces questions : elles doivent apparaître dans le Bogen.',
  fallvorstellung: 'Le jury peut demander ce que tu as posé sur ces points — sache le rapporter au Konjunktiv I.',
};
const VORSTELLUNG_HINT: Record<Aide, string> = {
  komplett: 'Struktur : Allgemein- und Ernährungszustand → Anamnese (Konjunktiv I) → Verdachts- und Differenzialdiagnosen → Diagnostik → Therapie.',
  anamnese: 'C\'est là que ton anamnèse finit : recueille de quoi construire cette phrase.',
  dokumentation: 'La même matière que l\'Arztbrief, dite à l\'oral — même diagnostic, mêmes examens.',
  fallvorstellung: 'Struktur : Allgemein- und Ernährungszustand → Anamnese (Konjunktiv I) → Verdachts- und Differenzialdiagnosen → Diagnostik → Therapie.',
};

