import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Layer, SimTeil } from '@/db/types';
import { useUi } from '@/store/ui';
import { Icon } from '@/components/icons';
import { MusterModelPicker } from '@/components/MusterModelPicker';
import { useCase, useSimulations } from '@/hooks/useData';
import { computeLayerAdvice } from '@/lib/layerAdvice';
import { QrCode } from '@/components/QrCode';
import { patientUrl, localPatientUrl } from './usePatientSync';
import { listAccounts, getActiveUserId, setActiveUserId, initials, ACCOUNT_DOT as DOT } from '@/lib/auth/accounts';
import { switchAccount, AUTH_MODE } from '@/lib/auth/session';
import { restartApp } from '@/lib/auth/restart';

// ============================================================================
// Le réglage de la simulation : niveau d'assistance · couche · Muster-Bogen.
//
// Il est rendu QUEL QUE SOIT le Teil. Avant, `PreSimulationPage.tsx:52` le
// masquait entièrement en Anamnese seule et en Fallvorstellung seule — alors
// que le runner lit toujours `assistance` et `layer`, et que la sauvegarde les
// enregistre et pondère la confiance avec. On jouait donc avec des réglages
// hérités, invisibles et non modifiables. Le Teil change le CONTENU des blocs,
// jamais leur présence ni leur ordre.
// ============================================================================

export function SimulationSetup({ caseId, teil }: { caseId: string; teil: SimTeil | null }) {
  const { assistance, setAssistance, layer, setLayer, muster, setMuster } = useUi();
  // Couche RECOMMANDÉE, calculée depuis l'historique de ce cas — l'utilisateur
  // n'a aucune raison de savoir tout seul s'il est prêt à monter.
  const c = useCase(caseId);
  const sims = useSimulations();
  const advice = computeLayerAdvice(c, sims);

  return (
    <div className="space-y-4">
      {/* Mode d'assistance — 2 grandes cartes illustrées */}
      <div>
        <div className="label mb-2">Niveau d'assistance</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            active={assistance === 'assiste'} onClick={() => setAssistance('assiste')}
            icon="handshake" title="Assisté" tag="Débutant"
            desc={ASSISTE_DESC[teil ?? 'komplett']}
            tone="brand"
          />
          <ModeCard
            active={assistance === 'autonome'} onClick={() => setAssistance('autonome')}
            icon="stethoscope" title="Autonome" tag="Avancé · score ↑"
            desc={AUTONOME_DESC[teil ?? 'komplett']}
            tone="violet"
          />
        </div>
      </div>

      {/* Couche de révision — recommandée automatiquement, surchargeable */}
      <div className="card p-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div className="label">Couche de révision</div>
          {advice.attempts > 0 && (
            <span className="text-[11px] text-slate-400">
              {advice.attempts} passage{advice.attempts > 1 ? 's' : ''}
              {advice.bestScore !== null && ` · meilleur ${advice.bestScore} %`}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {([1, 2, 3] as Layer[]).map((l) => {
            const recommended = l === advice.layer;
            return (
              <button key={l} onClick={() => setLayer(l)}
                className={`relative min-h-11 flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${layer === l ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700'}`}>
                Couche {l}
                {recommended && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-1.5 py-px text-[10px] font-bold text-white">Conseillée</span>
                )}
              </button>
            );
          })}
        </div>
        {/* « Pourquoi cette couche » : un conseil qu'on ne comprend pas ne se
            suit pas. Le bouton n'apparaît que si l'utilisateur s'en écarte. */}
        <p className="mt-2.5 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
          <Icon name="bulb" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
          <span>
            {advice.reason}
            {advice.suggestAutonome && assistance === 'assiste' && ' Le mode Autonome est conseillé à ce stade.'}
          </span>
        </p>
        {layer !== advice.layer && (
          <button onClick={() => setLayer(advice.layer)} className="btn-outline mt-2 w-full justify-center text-xs">
            <Icon name="refresh" className="mr-1 inline-block h-3.5 w-3.5 align-[-2px]" />Revenir à la couche conseillée ({advice.layer})
          </button>
        )}
      </div>

      {/* Muster-Bogen par MODÈLE (forme), les villes en second plan.
          Présent en Anamnese aussi : le Bogen est le panneau latéral de la
          partie (`SimulationRunner` → `AnamneseBogen`), pas une pièce de la
          seule Dokumentation. */}
      <div className="card p-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div className="label">Muster-Bogen (feuille de notes)</div>
          <span className="text-[11px] text-slate-400">Choisis la forme — les villes qui l'utilisent sont indiquées</span>
        </div>
        <MusterModelPicker value={muster} onChange={setMuster} />
      </div>

      {/* Le médecin crédité — qui s'entraîne. C'est lui qui portera la
          simulation (`Lauf.profileId`), le programme et les stats. */}
      {AUTH_MODE === 'founder' && <DoctorCard />}
    </div>
  );
}

// Le Teil change le CONTENU, pas la présence du bloc.
const ASSISTE_DESC: Record<SimTeil | 'komplett', string> = {
  komplett: 'Guides déroulés, questions & Redewendungen visibles, chapitres cochables.',
  anamnese: 'Les chapitres sont déroulés, chaque question est écrite, les mots-clés sont visibles.',
  dokumentation: 'La trame de l\'Arztbrief est dépliée, les tournures officielles sont proposées.',
  fallvorstellung: 'Le plan de présentation est déroulé, avec les phrases de liaison.',
};
const AUTONOME_DESC: Record<SimTeil | 'komplett', string> = {
  komplett: 'Conditions réelles : chapitres « en tête », seulement des raccourcis flash.',
  anamnese: 'Conditions réelles : tu mènes l\'entretien de mémoire, l\'aide se révèle question par question.',
  dokumentation: 'Conditions réelles : page blanche, la trame ne se révèle que si tu la demandes.',
  fallvorstellung: 'Conditions réelles : tu présentes de mémoire, le plan reste replié.',
};

// ============================================================================
/** « Avec qui tu joues » — UN seul cadre, conscient du Teil.
 *
 *  Avant : deux `.card` sœurs (« Répartition des rôles » et « Autre façon de
 *  simuler »), dont aucune ne savait quelle partie allait être jouée, et dont
 *  le lien patient ne portait pas le Teil. Le choix ne CONFIGURE pas : il
 *  ENTRE dans la simulation au Teil voulu. */
export function PartnerCard({ caseId, teil }: { caseId: string; teil: SimTeil | null }) {
  const navigate = useNavigate();
  const openExternalAi = useUi((s) => s.openExternalAi);
  const [ouvert, setOuvert] = useState<'simulant' | null>(null);
  const [copied, setCopied] = useState(false);
  const url = patientUrl(caseId, teil ?? undefined);
  const copyUrl = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const entrer = () => navigate(`/simulation/${caseId}/run${teil ? `?teil=${teil}` : ''}`);

  // L'IA ne peut jouer que les deux parties dialoguées. En Dokumentation, la
  // proposer serait un choix qui n'en est pas un (contrat `ai-bridge.md`).
  const iaMoeglich = teil !== 'dokumentation';

  return (
    <section className="card p-4" aria-label="Avec qui tu joues">
      <div className="label mb-2">Avec qui tu joues</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <PartnerChoice
          icon="user" title="Seul" desc="Tu joues les deux rôles, guidé par la trame."
          onClick={entrer}
        />
        <PartnerChoice
          icon="mask" title="Avec un simulant" active={ouvert === 'simulant'}
          desc="Il lit sa fiche de rôle sur son téléphone et suit ta partie en direct."
          onClick={() => setOuvert((o) => (o === 'simulant' ? null : 'simulant'))}
        />
        {iaMoeglich && (
          <PartnerChoice
            icon="spark" title="Avec ton IA" desc="ChatGPT, Claude, Gemini… en vocal, à partir de la fiche du cas."
            onClick={() => openExternalAi(caseId, teil ?? undefined)}
          />
        )}
      </div>

      {ouvert === 'simulant' && (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row">
          <QrCode value={url} size={130} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="text-sm font-semibold">
              Fiche du simulant{teil ? ` — ${TEIL_LABEL[teil]}` : ''}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {teil
                ? `Il ouvre directement le rôle dont tu as besoin pour cette partie.`
                : `Il joue le patient (anamnèse) puis le médecin examinateur (présentation).`}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <a href={localPatientUrl(caseId, teil ?? undefined)} target="_blank" rel="noreferrer" className="btn-outline gap-1.5 text-xs">Ouvrir en 2ᵉ fenêtre<Icon name="external" className="h-3.5 w-3.5" /></a>
              <button onClick={copyUrl} title="Copier le lien (téléphone)" aria-label="Copier le lien pour téléphone"
                className={`btn-outline px-2.5 text-xs ${copied ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : ''}`}>
                <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
              </button>
              <button onClick={entrer} className="btn-primary gap-1.5 text-xs">
                <Icon name="play" className="h-3.5 w-3.5" />Il est prêt — entrer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

const TEIL_LABEL: Record<SimTeil, string> = {
  anamnese: 'Anamnese', dokumentation: 'Dokumentation', fallvorstellung: 'Fallvorstellung',
};

function PartnerChoice({ icon, title, desc, onClick, active = false }: {
  icon: string; title: string; desc: string; onClick: () => void; active?: boolean;
}) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`flex min-h-11 flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${active ? 'border-brand-500 bg-brand-50/70 dark:border-brand-700 dark:bg-brand-900/20' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700 dark:hover:border-brand-700'}`}>
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
    <button onClick={onClick} className={`card flex items-start gap-3 p-4 text-left transition-all ${active ? `${ring} ring-1 ring-inset` : 'hover:border-slate-300 dark:hover:border-slate-600'}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm backdrop-blur-sm dark:bg-slate-800/70 ${iconColor}`}>
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
