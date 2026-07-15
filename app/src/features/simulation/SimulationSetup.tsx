import { useState } from 'react';
import type { Layer } from '@/db/types';
import { useUi } from '@/store/ui';
import { useProfiles, PROFILE_COLORS, initials } from '@/store/profile';
import { Icon } from '@/components/icons';
import { MUSTER_BOGEN, MUSTER_CITIES } from '@/data/guides/musterBogen';
import { QrCode } from '@/components/QrCode';
import { patientUrl, localPatientUrl } from './usePatientSync';

// Réglage de simulation illustré : Mode (Assisté/Autonome) · Couche (1-3) ·
// Muster-Bogen (5 villes) · Rôles + fiche du simulant (QR). Alimente le store.
export function SimulationSetup({ caseId }: { caseId: string }) {
  const { assistance, setAssistance, layer, setLayer, muster, setMuster } = useUi();

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

      {/* Couche de révision */}
      <div className="card p-4">
        <div className="label mb-2">Couche de révision</div>
        <div className="flex gap-2">
          {([1, 2, 3] as Layer[]).map((l) => (
            <button key={l} onClick={() => setLayer(l)}
              className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${layer === l ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>
              <div className="flex items-center justify-center gap-1">
                {Array.from({ length: l }).map((_, i) => <span key={i} className="h-1.5 w-1.5 rounded-full bg-current" />)}
              </div>
              Couche {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Couche 1 = découverte · Couches 2-3 = consolidation (plutôt en mode Autonome).</p>
      </div>

      {/* Rôles + fiche du simulant */}
      <RolesCard caseId={caseId} />

      {/* Muster-Bogen par ville */}
      <div className="card p-4">
        <div className="label mb-2">Muster-Bogen (feuille de notes)</div>
        <div className="flex flex-wrap gap-2">
          {MUSTER_CITIES.map((city) => {
            const spec = MUSTER_BOGEN[city];
            return (
              <button key={city} onClick={() => setMuster(city)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${muster === city ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 hover:border-brand-300 dark:border-slate-700'}`}
                title={spec.instruction}>
                <Icon name="id" className="h-4 w-4 text-brand-500" />
                <span className="font-medium">{city}</span>
                <span className="chip bg-slate-100 text-[10px] text-slate-500 dark:bg-slate-800">{spec.style === 'ganze-saetze' ? 'ganze Sätze' : spec.style === 'frei' ? 'frei' : 'Stichpunkte'}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">{MUSTER_BOGEN[muster].instruction}</p>
      </div>
    </div>
  );
}

function RolesCard({ caseId }: { caseId: string }) {
  const { profiles, activeId, setActive, create } = useProfiles();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const url = patientUrl(caseId);
  const copyUrl = () => { navigator.clipboard?.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  const addProfile = async () => { const id = await create(name); setName(''); setAdding(false); await setActive(id); };
  return (
    <div className="card p-4">
      <div className="label mb-2">Répartition des rôles</div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Le médecin = PROFIL qui s'entraîne (stats + programme le suivent) */}
        <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-900/10">
          <div className="flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">
            <Icon name="stethoscope" className="h-5 w-5" /> Le médecin
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Quel profil s'entraîne&nbsp;? Ses stats, son streak et son programme suivront ce choix.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profiles.map((p) => {
              const col = PROFILE_COLORS[p.color] ?? PROFILE_COLORS.petrol;
              const on = p.id === activeId;
              return (
                <button key={p.id} onClick={() => setActive(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? `${col.soft} ${col.text} border-transparent ring-1 ${col.ring}` : 'border-slate-300 text-slate-500 hover:border-brand-300 dark:border-slate-700'}`}>
                  <span className={`grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold text-white ${col.dot}`}>{initials(p.name)}</span>
                  {p.name}
                </button>
              );
            })}
            {adding ? (
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addProfile(); if (e.key === 'Escape') { setAdding(false); setName(''); } }}
                onBlur={() => { if (!name.trim()) setAdding(false); }} placeholder="Nom du profil…"
                className="input h-[30px] w-28 py-0 text-xs" />
            ) : (
              <button onClick={() => setAdding(true)} className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700">
                <span className="text-sm leading-none">+</span> Profil
              </button>
            )}
          </div>
        </div>
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
