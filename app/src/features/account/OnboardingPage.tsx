import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/auth/session';

export const LAENDER = [['BW','Baden-Württemberg'],['BY','Bayern'],['BE','Berlin'],['BB','Brandenburg'],['HB','Bremen'],['HH','Hamburg'],['HE','Hessen'],['MV','Mecklenburg-Vorpommern'],['NI','Niedersachsen'],['NRW','Nordrhein-Westfalen'],['RP','Rheinland-Pfalz'],['SL','Saarland'],['SN','Sachsen'],['ST','Sachsen-Anhalt'],['SH','Schleswig-Holstein'],['TH','Thüringen']] as const;
const STAGES = [['approbation_requested','J\'ai déposé ma demande d\'Approbation'],['gleichwertigkeit','Je suis en Gleichwertigkeitsprüfung'],['fsp_planned','Ma FSP est planifiée'],['fsp_failed_once','J\'ai déjà passé la FSP une fois']] as const;

export interface ProfileFields { target_land: string; exam_date: string | null; language_level: 'B2'|'C1'|'C1+'; procedure_stage: string }

export async function saveProfile(uid: string, f: ProfileFields): Promise<void> {
  const { error } = await supabase.from('profiles').update(f).eq('id', uid);
  if (error) throw error;
}

export function OnboardingPage() {
  const nav = useNavigate();
  const uid = useSession((s) => s.user?.id)!;
  const [f, setF] = useState<ProfileFields>({ target_land: 'BW', exam_date: null, language_level: 'B2', procedure_stage: 'fsp_planned' });
  const [noDate, setNoDate] = useState(true);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(uid, { ...f, exam_date: noDate ? null : f.exam_date });
    nav('/', { replace: true });
  };
  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) => (
    <div className="flex flex-wrap gap-2">{options.map(([v, l]) => (
      <button type="button" key={v} onClick={() => onChange(v)} className={`seg ${value === v ? 'seg-on' : ''}`}>{l}</button>))}</div>
  );
  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-6 py-10">
      <div><div className="label">Bienvenue</div><h1 className="text-2xl font-bold">Quatre questions, et Doctopus s'adapte à toi.</h1></div>
      <div className="card space-y-5 p-5">
        <label className="block space-y-1.5"><span className="label">Land où tu passes la FSP</span>
          <select value={f.target_land} onChange={(e) => setF({ ...f, target_land: e.target.value })} className="input w-full">{LAENDER.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
        <div className="space-y-1.5"><span className="label">Date d'examen</span>
          <div className="flex items-center gap-3">
            <input type="date" disabled={noDate} value={f.exam_date ?? ''} onChange={(e) => setF({ ...f, exam_date: e.target.value })} className="input" />
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} />Pas encore</label>
          </div></div>
        <div className="space-y-1.5"><span className="label">Niveau d'allemand actuel</span>
          <Seg value={f.language_level} options={[['B2','B2'],['C1','C1'],['C1+','Au-delà de C1']] as const} onChange={(v) => setF({ ...f, language_level: v })} /></div>
        <div className="space-y-1.5"><span className="label">Où en es-tu dans la procédure ?</span>
          <Seg value={f.procedure_stage} options={STAGES} onChange={(v) => setF({ ...f, procedure_stage: v })} /></div>
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3 text-base">Commencer</button>
    </form>
  );
}
