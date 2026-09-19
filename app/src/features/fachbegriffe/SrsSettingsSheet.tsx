import { useEffect, useRef, useState } from 'react';
import { getSrsSettings, setSrsSettings, SRS_LIMITS, type SrsSettings } from '@/lib/srsSettings';
import { loadDrillContext } from '@/lib/collections/drillContext';

// Réglages quotidiens façon Anki (spec F2b 3.7). Une seule feuille, utilisée
// par la page Fachbegriffe (modale) et par « Ajuster » du programme (inline).
export function SrsSettingsSheet({ onClose, inline = false }: { onClose: () => void; inline?: boolean }) {
  const [s, setS] = useState<SrsSettings>({ mode: 'auto' });
  const [explain, setExplain] = useState('');
  const [autoNew, setAutoNew] = useState(10);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    getSrsSettings().then(setS);
    loadDrillContext().then((c) => { setExplain(c.daily.source === 'auto' ? c.daily.explain : ''); setAutoNew(c.daily.newPerDay); });
    return () => { if (savedTimer.current) clearTimeout(savedTimer.current); };
  }, []);
  const save = async () => {
    await setSrsSettings(s);
    if (inline) {
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } else {
      onClose();
    }
  };
  const num = (k: 'newPerDay' | 'maxReviewsPerDay', v: string) => setS((p) => ({ ...p, [k]: v === '' ? undefined : Number(v) }));
  const form = (
    <div className="space-y-3">
      {/* Inline dans « Ajuster », le Field « Fachbegriffe » porte déjà le libellé. */}
      {!inline && <div className="label">Répétitions</div>}
      <div role="radiogroup" aria-label="Mode" className="flex gap-3 text-sm">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 pr-2"><input type="radio" name="srs-mode" aria-label="Automatique" checked={s.mode === 'auto'} onChange={() => setS({ mode: 'auto' })} />Automatique</label>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 pr-2"><input type="radio" name="srs-mode" aria-label="Manuel" checked={s.mode === 'manual'} onChange={() => setS((p) => ({ mode: 'manual', newPerDay: p.newPerDay ?? autoNew, maxReviewsPerDay: p.maxReviewsPerDay ?? 200 }))} />Manuel</label>
      </div>
      {s.mode === 'auto' ? <p className="text-xs text-slate-500">{explain || 'auto : selon la date d\'examen, la rétention et l\'intensité du programme'}</p> : (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label><span className="label">Nouveaux termes par jour</span><input aria-label="Nouveaux termes par jour" type="number" min={SRS_LIMITS.newPerDay[0]} max={SRS_LIMITS.newPerDay[1]} value={s.newPerDay ?? ''} onChange={(e) => num('newPerDay', e.target.value)} className="input w-full" /></label>
          <label><span className="label">Dus présentés par jour</span><input aria-label="Dus présentés par jour" type="number" min={SRS_LIMITS.maxReviewsPerDay[0]} max={SRS_LIMITS.maxReviewsPerDay[1]} value={s.maxReviewsPerDay ?? ''} onChange={(e) => num('maxReviewsPerDay', e.target.value)} className="input w-full" /></label>
          <p className="col-span-2 text-xs text-slate-500">Les dus au-delà du plafond restent dus demain — rien n'est perdu.</p>
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        {inline && saved && <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Enregistré ✓</span>}
        {!inline && <button type="button" onClick={onClose} className="btn-outline min-h-11">Annuler</button>}
        <button type="button" onClick={() => { void save(); }} className="btn-primary min-h-11">Enregistrer</button>
      </div>
    </div>
  );
  if (inline) return <div className="card p-4">{form}</div>;
  return (<><div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} /><div role="dialog" aria-modal="true" aria-label="Répétitions" className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-1/3 sm:-translate-x-1/2 sm:rounded-2xl">{form}</div></>);
}
