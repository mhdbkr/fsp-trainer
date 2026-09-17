import { useState } from 'react';
import type { Layer } from '@/db/types';
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

// Réglage de simulation illustré : Mode (Assisté/Autonome) · Couche (1-3) ·
// Muster-Bogen (5 villes) · Rôles + fiche du simulant (QR). Alimente le store.
export function SimulationSetup({ caseId }: { caseId: string }) {
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
            desc="Guides déroulés, questions & Redewendungen visibles, chapitres cochables."
            tone="brand"
          />
          <ModeCard
            active={assistance === 'autonome'} onClick={() => setAssistance('autonome')}
            icon="stethoscope" title="Autonome" tag="Avancé · score ↑"
            desc="Conditions réelles : chapitres « en tête », seulement des raccourcis flash."
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
                className={`relative flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${layer === l ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-500 hover:border-brand-300 dark:border-slate-700'}`}>
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

      {/* Rôles + fiche du simulant */}
      <RolesCard caseId={caseId} />

      {/* Muster-Bogen par MODÈLE (forme), les villes en second plan */}
      <div className="card p-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <div className="label">Muster-Bogen (feuille de notes)</div>
          <span className="text-[11px] text-slate-400">Choisis la forme — les villes qui l'utilisent sont indiquées</span>
        </div>
        <MusterModelPicker value={muster} onChange={setMuster} />
      </div>
    </div>
  );
}

export function RolesCard({ caseId }: { caseId: string }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = patientUrl(caseId);
  const copyUrl = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <div className="card p-4">
      <div className="label mb-2">Répartition des rôles</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Rôle médecin = le compte qui s'entraîne (mode fondateur) */}
        {AUTH_MODE === 'founder' && <DoctorCard />}
        {/* Rôle simulant (patient + médecin senior) */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
            <Icon name="mask" className="h-4 w-4" />Le simulant
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Joue le <b>patient</b> (anamnèse) puis le <b>médecin examinateur</b> (présentation), à partir des fiches de rôle.</p>
          <button onClick={() => setShowQr((s) => !s)} className="btn-outline mt-2 w-full justify-center gap-1.5 text-xs">
            <Icon name="phone" className="h-4 w-4" />{showQr ? 'Masquer' : 'Ouvrir les fiches du simulant'}
          </button>
        </div>
      </div>

      {showQr && (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:flex-row">
          <QrCode value={url} size={130} />
          <div className="flex-1 text-center sm:text-left">
            <div className="text-sm font-semibold">Fiches de rôle du simulant</div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Le simulant lit ses fiches (patient + médecin senior) et suit ta simulation en direct.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <a href={localPatientUrl(caseId)} target="_blank" rel="noreferrer" className="btn-primary gap-1.5 text-xs">Ouvrir<Icon name="external" className="h-3.5 w-3.5" /></a>
              <button onClick={copyUrl} title="Copier le lien (téléphone)" aria-label="Copier le lien pour téléphone"
                className={`btn-outline px-2.5 text-xs ${copied ? 'border-emerald-300 text-emerald-600 dark:text-emerald-400' : ''}`}>
                <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, tag, desc, tone }: {
  active: boolean; onClick: () => void; icon: string; title: string; tag: string; desc: string; tone: 'brand' | 'violet';
}) {
  const ring = tone === 'brand' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-violet-500 bg-violet-50 dark:bg-violet-900/20';
  const iconColor = tone === 'brand' ? 'text-brand-600 dark:text-brand-300' : 'text-violet-600 dark:text-violet-300';
  return (
    <button onClick={onClick} className={`card flex items-start gap-3 p-4 text-left transition-all ${active ? `${ring} ring-1 ring-inset` : 'hover:border-slate-300 dark:hover:border-slate-600'}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-slate-800 ${iconColor}`}>
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

function DoctorCard() {
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
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-900/10">
      <div className="flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">
        <Icon name="user" className="h-4 w-4" />Le médecin
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Qui s'entraîne ? La simulation, l'évaluation et le programme vont à ce compte.</p>
      <div role="radiogroup" className="mt-2 flex flex-wrap gap-1.5">
        {accounts.map((a) => (
          <label key={a.userId} className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${a.userId === activeId ? 'border-brand-400 bg-white dark:bg-slate-900' : 'border-transparent hover:border-slate-300'}`}>
            <input type="radio" name="doctor" aria-label={a.displayName} checked={a.userId === activeId} onChange={() => choose(a.userId)} className="sr-only" />
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>{a.displayName}
          </label>
        ))}
      </div>
    </div>
  );
}
