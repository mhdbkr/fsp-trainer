import { cqText } from '@/lib/caseQuestions';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ModeChooser } from '@/components/ModeChooser';
import type { SimTeil } from '@/db/types';
import { isTeil } from '@/lib/simScope';
import { useCase, useFachwissen, useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { AutoLink, AutoLinkList } from '@/components/AutoLink';
import { SimulationSetup, PartnerCard, StartButton } from './SimulationSetup';
import { termsInOrder } from '@/lib/collections/caseTerms';

// ============================================================================
// L'échauffement avant le chrono. UNE anatomie, toujours la même :
//   1. le cas      2. la partie      3. le réglage
//   4. avec qui tu joues (= le départ)                5. de quoi te remettre en tête
//
// Il y en avait QUATRE variantes : `SimulationSetup` entier disparaissait en
// Anamnese seule et en Fallvorstellung seule, et trois blocs d'échauffement
// apparaissaient ou non selon le Teil. Le Teil change désormais le CONTENU des
// blocs, jamais leur présence ni leur ordre : on ne peut plus jouer avec des
// réglages hérités, invisibles et non modifiables.
// ============================================================================

export function PreSimulationPage() {
  const { caseId } = useParams();
  // Mode (FB2-P) : complète, ou un seul Teil — pré-sélectionné par l'URL,
  // modifiable ici, porté par l'entrée en simulation.
  const [params, setParams] = useSearchParams();
  const teil = isTeil(params.get('teil')) ? (params.get('teil') as SimTeil) : null;
  const taskId = params.get('task') ?? undefined;                  // R-C4 : tâche du plan, si lancée depuis le plan
  const setTeil = (t: string | null) => { const n = new URLSearchParams(params); if (t) n.set('teil', t); else n.delete('teil'); setParams(n, { replace: true }); };
  const c = useCase(caseId);
  const fw = useFachwissen(c?.linkedFachwissenId);
  const begriffe = useFachbegriffe();
  const openGlossary = useUi((s) => s.openGlossary);

  if (!c) return <div className="text-slate-400">Chargement…</div>;
  const terms = termsInOrder(c.linkedFachbegriffeIds, begriffe ?? []);   // ordre publié conservé (diagnostic d'abord)

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* 1 — Le cas */}
      <header className="text-center">
        <div className="text-sm font-semibold text-brand-500">Échauffement</div>
        <h1 className="text-2xl font-bold">{c.name}</h1>
        <p className="text-slate-500 dark:text-slate-400">Révise 2 minutes, respire, puis entre en simulation.</p>
        {/* Le départ, en tête de page : jamais enfoui sous les réglages. */}
        <div className="mt-3 flex flex-col items-center gap-1">
          <StartButton caseId={c.id} teil={teil} taskId={taskId} />
          <Link to={`/cas/${c.id}`} className="btn-ghost text-xs">← Fiche du cas</Link>
        </div>
      </header>

      {/* 2 — La partie : sa propre boîte, au-dessus de l'action ; la complète
             d'un bloc, les trois Teile nés d'une division (FB2-P). */}
      <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/60 p-3 backdrop-blur-sm dark:border-ink-600 dark:bg-ink-800/60" aria-label="Quelle partie">
        <ModeChooser value={teil} onChange={(t) => setTeil(t)} />
      </section>

      {/* 3 — Le réglage. Rendu quel que soit le Teil : le runner lit toujours
             `assistance` et `layer`, et la sauvegarde les enregistre. */}
      <SimulationSetup caseId={c.id} teil={teil} />

      {/* 4 — Avec qui tu joues : un choix, pas un départ (le départ est en
             tête de page). */}
      <PartnerCard caseId={c.id} teil={teil} />

      {/* 5 — De quoi te remettre en tête. Les quatre blocs sont TOUJOURS là ;
             c'est leur contenu qui suit le Teil. */}
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
          <p className="mb-2 text-[11px] text-slate-400">{QUESTIONS_HINT[teil ?? 'komplett']}</p>
          <AutoLinkList items={c.caseSpecificQuestions.map(cqText)} />
        </div>

        <div className="card p-5">
          <div className="label mb-2 flex items-center gap-1.5"><Icon name="speech" className="h-3.5 w-3.5" />Phrases de Fallvorstellung</div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            « {c.patientSheet.personalia.name} ist ein/e {c.patientSheet.personalia.age}-jährige/r Patient/in, der/die sich mit <b><AutoLink>{c.medicalView.verdachtsdiagnose}</AutoLink></b>… vorstellte. »
          </p>
          <p className="mt-2 text-sm text-slate-500">{VORSTELLUNG_HINT[teil ?? 'komplett']}</p>
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

// Le Teil change ce que le bloc DIT, pas s'il existe.
const QUESTIONS_HINT: Record<SimTeil | 'komplett', string> = {
  komplett: 'À poser pendant l\'Anamnese — elles reviennent dans la Dokumentation et la Fallvorstellung.',
  anamnese: 'C\'est maintenant qu\'elles se posent : les oublier coûte sur les trois parties.',
  dokumentation: 'Tu documentes les réponses à ces questions : elles doivent apparaître dans le Bogen.',
  fallvorstellung: 'Le jury peut demander ce que tu as posé sur ces points — sache le rapporter au Konjunktiv I.',
};
const VORSTELLUNG_HINT: Record<SimTeil | 'komplett', string> = {
  komplett: 'Struktur : Allgemein- und Ernährungszustand → Anamnese (Konjunktiv I) → Verdachts- und Differenzialdiagnosen → Diagnostik → Therapie.',
  anamnese: 'C\'est là que ton anamnèse finit : recueille de quoi construire cette phrase.',
  dokumentation: 'La même matière que l\'Arztbrief, dite à l\'oral — même diagnostic, mêmes examens.',
  fallvorstellung: 'Struktur : Allgemein- und Ernährungszustand → Anamnese (Konjunktiv I) → Verdachts- und Differenzialdiagnosen → Diagnostik → Therapie.',
};

