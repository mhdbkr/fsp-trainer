import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { AssistanceMode, MusterArt, SimTeil, TaskInstance } from '@/db/types';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { useCase, useSimulations } from '@/hooks/useData';
import { computeLayerAdvice } from '@/lib/layerAdvice';
import { QrCode } from '@/components/QrCode';
import { patientUrl, localPatientUrl } from './usePatientSync';
import { listAccounts, getActiveUserId, setActiveUserId, initials, ACCOUNT_DOT as DOT } from '@/lib/auth/accounts';
import { switchAccount, AUTH_MODE } from '@/lib/auth/session';
import { restartApp } from '@/lib/auth/restart';
import { couchePour, niveauDeDepart } from './niveau';

// ============================================================================
// Le réglage de la simulation : niveau d'assistance · Muster-Bogen.
//
// [S4] (simulation-run.md §10.1, ADR-0021 déc. 8 et 9, décision (d) de la
// direction) — la COUCHE se fond dans le niveau d'assistance : plus de bloc ni de
// mot « Couche » à l'écran. Le niveau (fixeur I2, décision de main) : la tâche du
// plan qui le prescrit l'emporte, sinon le conseil de `layerAdvice` dès un passage,
// sinon le dernier choix du candidat — toujours avec sa raison. `Lauf.layer` reste
// écrit, DÉDUIT du niveau choisi (M7, `couchePour`). Le Muster : guidé ou libre.
// Les textes d'aide parlent de la PARTIE ENTIÈRE, ou du Teil de départ s'il y en a un.
// ============================================================================

export type Aide = SimTeil | 'komplett';

/** La tâche du plan lancée (`?task=`) : `undefined` tant qu'elle est lue, `null` sans tâche. */
export const useTache = (taskId?: string): TaskInstance | null | undefined => useLiveQuery(async () => {
  if (!taskId) return null;
  const plan = await db.day_plans.filter((p) => p.tasks.some((t) => t.id === taskId)).first();
  return plan?.tasks.find((t) => t.id === taskId) ?? null;
}, [taskId], undefined);

export function SimulationSetup({ caseId, aide, taskId }: { caseId: string; aide: Aide; taskId?: string }) {
  const { assistance, setAssistance, setLayer } = useUi();
  const c = useCase(caseId);
  const sims = useSimulations();
  const tache = useTache(taskId);
  const advice = computeLayerAdvice(c, sims);
  const niveau = niveauDeDepart({ advice, sims, caseId, courant: assistance, tache: tache ?? undefined, layerProgress: c?.layerProgress });
  const choisir = (a: AssistanceMode) => { setAssistance(a); setLayer(couchePour(a, advice, tache ?? undefined)); };
  // Présélection, une fois par cas, dès que l'historique et la tâche sont lus. Le candidat peut ensuite changer.
  const lu = !!c && sims !== undefined && tache !== undefined;
  const [initial, setInitial] = useState<typeof niveau | null>(null);
  useEffect(() => {
    if (!lu) return;
    setInitial(niveau);
    choisir(niveau.assistance);
  }, [lu, caseId]); // eslint-disable-line react-hooks/exhaustive-deps
  const raison = (initial ?? niveau).raison;
  const conseil = (initial ?? niveau).conseil;

  return (
    <div className="space-y-4">
      {/* (3) Niveau d'assistance — même anatomie que les deux autres blocs */}
      <div className="card p-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div className="label">Niveau d’assistance</div>
          {advice.attempts > 0 && (
            <span className="text-[11px] text-slate-400">
              {advice.attempts} passage{advice.attempts > 1 ? 's' : ''}
              {advice.bestScore !== null && ` · meilleur ${advice.bestScore} %`}
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={assistance === 'assiste'} onClick={() => choisir('assiste')}
            icon="handshake" title="Assisté" tag={conseil === 'assiste' ? 'Conseillé' : 'Débutant'}
            desc={ASSISTE_DESC[aide]}
            tone="brand"
          />
          <ModeCard
            active={assistance === 'autonome'} onClick={() => choisir('autonome')}
            icon="stethoscope" title="Autonome" tag={conseil === 'autonome' ? 'Conseillé' : 'Avancé · score ↑'}
            desc={AUTONOME_DESC[aide]}
            tone="violet"
          />
        </div>
        {raison && (
          <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            <Icon name="bulb" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" /><span>{raison}</span>
          </p>
        )}
      </div>

      {/* (4) Muster-Bogen : guidé ou libre. Présent dès l'Anamnese : le Bogen est le
          panneau latéral de la partie (`SimulationRunner` → `AnamneseBogen`). */}
      <MusterChoix />

      {/* Le médecin crédité — qui s'entraîne. C'est lui qui portera la
          simulation (`Lauf.profileId`), le programme et les stats. */}
      {AUTH_MODE === 'founder' && <DoctorCard />}
    </div>
  );
}

/** Le choix du Muster-Bogen, guidé ou libre — la pré-simulation et l'Examen. */
export function MusterChoix() {
  const { muster, setMuster } = useUi();
  return (
    <div className="card p-4">
      <div className="label mb-2">Muster-Bogen (feuille de notes)</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {MUSTER_CHOIX.map((m) => (
          <PartnerChoice key={m.art} icon={m.icon} title={m.titre} desc={m.desc}
            active={muster === m.art} onClick={() => setMuster(m.art)} />
        ))}
      </div>
    </div>
  );
}

const MUSTER_CHOIX: { art: MusterArt; titre: string; icon: string; desc: string }[] = [
  { art: 'guide', titre: 'Guidé', icon: 'id', desc: 'Une rubrique par chapitre de l’anamnèse : rien ne s’oublie.' },
  { art: 'libre', titre: 'Libre', icon: 'pen', desc: 'L’identité, puis une page libre, dans l’ordre où tu prends tes notes.' },
];

// Le Teil de départ change le CONTENU, pas la présence du bloc ; sans départ, la partie entière (I3).
const ASSISTE_DESC: Record<Aide, string> = {
  komplett: 'Chaque Teil a sa trame déroulée : questions écrites, formulations types, chapitres à cocher.',
  anamnese: 'Les chapitres sont déroulés, chaque question est écrite, les mots-clés sont visibles.',
  dokumentation: 'La trame de l\'Arztbrief est dépliée, les formulations types sont proposées.',
  fallvorstellung: 'Le plan de présentation est déroulé, avec les phrases de liaison.',
};
const AUTONOME_DESC: Record<Aide, string> = {
  komplett: 'Conditions réelles : tu mènes chaque Teil de mémoire ; l\'aide ne s\'ouvre que si tu la demandes.',
  anamnese: 'Conditions réelles : tu mènes l\'entretien de mémoire, l\'aide se révèle question par question.',
  dokumentation: 'Conditions réelles : page blanche, la trame ne se révèle que si tu la demandes.',
  fallvorstellung: 'Conditions réelles : tu présentes de mémoire, le plan reste replié.',
};

// ============================================================================
/** Le départ — en haut de la pré-simulation, sous le nom du cas (retours de
 *  la direction, 3 oct. : le bouton avait disparu, puis il était « enfoui au
 *  milieu de la page »). Un seul bouton de départ sur la page. */
export function StartButton({ caseId, depart, taskId }: { caseId: string; depart: SimTeil | null; taskId?: string }) {
  const navigate = useNavigate();
  // [S4] `?depart=` (§10.3) : le Teil par lequel la partie COMMENCE, jamais son périmètre (INV-70).
  const q = new URLSearchParams({ ...(depart ? { depart } : {}), ...(taskId ? { task: taskId } : {}) }).toString();   // R-C4
  return (
    // `viewTransition` : le passage pré-écran → runner est une navigation de page ;
    // sans lui, plus rien n'animait ce seuil depuis le retrait de `key={pathname}`.
    <button onClick={() => navigate(`/simulation/${caseId}/run${q ? `?${q}` : ''}`, { viewTransition: true })}
      className="btn-primary gap-2 px-6 py-2.5">
      <Icon name="play" className="h-4 w-4" />Démarrer
    </button>
  );
}

export type Partenaire = 'seul' | 'simulant' | 'ia';
const PARTENAIRE_KEY = 'fsp-partenaire';
const lirePartenaire = (): Partenaire => {
  const v = localStorage.getItem(PARTENAIRE_KEY);
  return v === 'simulant' || v === 'ia' ? v : 'seul';
};
/** [S4-7] Le partenaire de l'Examen : le cas est caché, « Seul » n'y a pas de patient à interroger. Le dernier choix s'il
 *  vaut dans l'Examen, sinon le simulant (simulation-run.md §11.3). Choix de l'appareil, jamais enregistré (décision 7). */
export const partenaireExamen = (): 'simulant' | 'ia' => (lirePartenaire() === 'ia' ? 'ia' : 'simulant');

/** « Avec qui tu joues » — UN seul cadre. Choisir un partenaire SÉLECTIONNE,
 *  il ne lance rien : le départ est le `StartButton` de l'en-tête. L'IA externe
 *  ne s'ouvre pas ici : elle se lance DEPUIS la partie jouée, au Teil concerné
 *  (contrat `ai-bridge.md` §3.1). [S4] La partie porte les trois Teile : l'IA est
 *  toujours proposée (fixeur I9/M1), le simulant joue tous ses rôles ; le choix est
 *  mémorisé sur l'appareil. */
export function PartnerCard({ caseId, depart, examen = false }: { caseId: string; depart: SimTeil | null; examen?: boolean }) {
  const teil = depart ?? undefined;
  // [S4-7] Dans l'Examen : pas d'IA (aucune aide n'y est montée), et la seconde fenêtre s'ouvre par un bouton — un `href`
  // mettrait l'id du cas dans le DOM du candidat (simulation-run.md §11.3).
  const [partenaireLu, setPartenaireState] = useState<Partenaire>(() => (examen ? partenaireExamen() : lirePartenaire()));
  const partenaire = partenaireLu;
  const setPartenaire = (p: Partenaire) => { localStorage.setItem(PARTENAIRE_KEY, p); setPartenaireState(p); };
  const [copied, setCopied] = useState(false);
  const url = patientUrl(caseId, teil);
  const copyUrl = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const choix = partenaire;

  return (
    <section className="card p-4" aria-label="Avec qui tu joues">
      <div className="label mb-2">Avec qui tu joues</div>
      <div className={`grid gap-3 ${examen ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {!examen && (
          <PartnerChoice
            icon="user" title="Seul" active={choix === 'seul'}
            desc="Tu joues les deux rôles."
            onClick={() => setPartenaire('seul')}
          />
        )}
        <PartnerChoice
          icon="mask" title="Avec un simulant" active={choix === 'simulant'}
          desc="Il lit sa fiche de rôle sur son téléphone et suit ta partie en direct."
          onClick={() => setPartenaire('simulant')}
        />
        <PartnerChoice
          icon="spark" title="Avec ton IA" active={choix === 'ia'}
          desc={examen ? 'Elle joue le patient, puis l’examinateur. Le diagnostic ne t’est pas montré.' : 'ChatGPT ou Gemini, en vocal : tu la lances depuis la partie.'}
          onClick={() => setPartenaire('ia')}
        />
      </div>

      {choix === 'ia' && examen && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Dans l’examen, la puce « IA » de l’en-tête la lance en Anamnese, puis en Fallvorstellung.
        </p>
      )}
      {choix === 'ia' && !examen && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Dans la partie, la puce « IA » de l’en-tête prépare le prompt du patient en Anamnese, de l’Oberarzt en Fallvorstellung.
        </p>
      )}

      {choix === 'simulant' && (
        <div className="panel mt-3 flex flex-col items-center gap-3 p-4 sm:flex-row">
          <QrCode value={url} size={130} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-sm font-semibold">Fiche du simulant</div>
            {/* La partie porte les trois Teile : le simulant joue tous ses rôles. */}
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Il joue le patient (anamnèse) puis le médecin examinateur (présentation).
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {examen
                ? <button type="button" onClick={() => window.open(localPatientUrl(caseId, teil), '_blank', 'noreferrer')} className="btn-outline min-h-11 gap-1.5 text-xs">Ouvrir en 2ᵉ fenêtre<Icon name="external" className="h-3.5 w-3.5" /></button>
                : <a href={localPatientUrl(caseId, teil)} target="_blank" rel="noreferrer" className="btn-outline min-h-11 gap-1.5 text-xs">Ouvrir en 2ᵉ fenêtre<Icon name="external" className="h-3.5 w-3.5" /></a>}
              <button onClick={copyUrl} title="Copier le lien (téléphone)" aria-label="Copier le lien pour téléphone"
                className={`btn-outline min-h-11 min-w-11 px-2.5 text-xs ${copied ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : ''}`}>
                <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function PartnerChoice({ icon, title, desc, onClick, active = false }: {
  icon: string; title: string; desc: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`flex min-h-11 flex-col items-start gap-1 rounded-xl border p-3 text-left ${active ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-900/20' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-700'}`}>
      <span className="flex items-center gap-2 font-semibold">
        <Icon name={icon} className="h-4 w-4 text-brand-600 dark:text-brand-300" />{title}
      </span>
      <span className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{desc}</span>
    </button>
  );
}

function ModeCard({ active, onClick, icon, title, tag, desc, tone }: {
  active: boolean; onClick: () => void; icon: string; title: string; tag: string; desc: string; tone: 'brand' | 'violet';
}) {
  const ring = tone === 'brand' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-violet-500 bg-violet-50 dark:bg-violet-900/20';
  const iconColor = tone === 'brand' ? 'text-brand-600 dark:text-brand-300' : 'text-violet-600 dark:text-violet-300';
  return (
    <button onClick={onClick} aria-pressed={active} className={`card flex items-start gap-3 p-4 text-left transition-all ${active ? `${ring} ring-1 ring-inset` : 'hover:border-slate-300 dark:hover:border-slate-600'}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 ${iconColor}`}>
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          <span className="chip bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">{tag}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </button>
  );
}

export function DoctorCard() {
  const accounts = listAccounts();
  const activeId = getActiveUserId();
  const choose = async (userId: string) => {
    if (userId === activeId) return;
    const r = await switchAccount(userId);
    // La page de pré-simulation est la même pour le nouveau compte : on garde la route.
    if (r === 'switched') restartApp({ keepRoute: true });
    else { setActiveUserId(null); restartApp(); }   // la porte demandera le mot de passe
  };
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">
        <Icon name="user" className="h-4 w-4" />Le médecin
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Qui s'entraîne ? La simulation, l'évaluation et le programme vont à ce compte.</p>
      <div role="radiogroup" className="mt-2 flex flex-wrap gap-1.5">
        {accounts.map((a) => (
          <label key={a.userId} className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${a.userId === activeId ? 'border-brand-400 bg-white/70 backdrop-blur-sm dark:bg-slate-900/70' : 'border-transparent hover:border-slate-300'}`}>
            <input type="radio" name="doctor" aria-label={a.displayName} checked={a.userId === activeId} onChange={() => choose(a.userId)} className="sr-only" />
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>{a.displayName}
          </label>
        ))}
      </div>
    </div>
  );
}
