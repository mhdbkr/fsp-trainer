import type { Case } from '@/db/types';

// ============================================================================
// Corrélation contenu ↔ cas clinique. Au lieu de montrer un gabarit générique
// (« Der Patient nehme regelmäßig … (Wirkstoff, Dosierung) ein »), on remplit
// avec les VRAIES données du cas (« Der Patient nehme regelmäßig Ibuprofen
// 400 mg 1-1-1 ein »). Chaque chapitre reçoit ainsi un exemple concret et
// individualisé, en allemand, au registre écrit (Konjunktiv I / Passiv).
// ============================================================================

const list = (arr?: string[]) => (arr && arr.length ? arr.join(', ') : '');
const p = (c: Case) => c.patientSheet;

// Un exemple concret par « catégorie » sémantique, construit depuis le cas.
const BUILDERS: Record<string, (c: Case) => string | null> = {
  identity: (c) => {
    const ps = p(c).personalia;
    return `${ps.name}, ${ps.age} Jahre${ps.beruf ? `, ${ps.beruf}` : ''}, stellte sich in der Notaufnahme vor.`;
  },
  beschwerden: (c) => {
    const s = p(c).schmerz;
    const leit = p(c).leitsymptome[0] ?? '';
    if (s && (s.ort || s.charakter)) {
      const beginn = s.beginn ? (/^(seit|vor)\b/i.test(s.beginn) ? s.beginn : `seit ${s.beginn}`) : '';
      const bits = [beginn, s.charakter, s.ort && `im/in ${s.ort}`, s.ausstrahlung && s.ausstrahlung !== 'keine' ? `mit Ausstrahlung in ${s.ausstrahlung}` : 'ohne Ausstrahlung'].filter(Boolean).join(', ');
      return `Der/die Patient/in stellte sich mit ${bits} vor${s.intensitaet ? ` (Intensität ${s.intensitaet}/10)` : ''}.`;
    }
    return leit ? `Der/die Patient/in stellte sich mit ${leit.charAt(0).toLowerCase() + leit.slice(1)} vor.` : null;
  },
  begleitsymptome: (c) => p(c).begleitsymptome.length ? `Als Begleitsymptome bestünden ${list(p(c).begleitsymptome)}.` : null,
  vegetativ: (c) => {
    const pos = list(p(c).vegetativeAnamnese);
    // Les négatifs sont formulés « kein Fieber, kein … » : on retire le « kein »
    // pour la tournure FSP « verneint wurden Fieber, … ».
    const negs = (p(c).negativeFindings ?? [])
      .filter((n) => /^kein/i.test(n))
      .map((n) => n.replace(/kein(e|en|em|er)?\s+/gi, ''))
      .slice(0, 3);
    const parts = [pos ? `Die vegetative Anamnese sei auffällig mit ${pos}` : 'Die vegetative Anamnese sei unauffällig'];
    if (negs.length) parts.push(`verneint wurden ${negs.join(', ')}`);
    return parts.join('; ') + '.';
  },
  allergien: (c) => {
    const a = p(c).allergien;
    if (!a.length || a[0].toLowerCase() === 'keine') return 'Allergien seien keine bekannt.';
    return `Es sei eine ${a[0]} bekannt.`;
  },
  rauchen: (c) => p(c).noxen.tabak ? `Zum Rauchen: ${p(c).noxen.tabak}.` : null,
  alkohol: (c) => p(c).noxen.alkohol ? `Der Alkoholkonsum wurde mit ${p(c).noxen.alkohol} angegeben.` : null,
  drogen: (c) => p(c).noxen.drogen ? `Drogen: ${p(c).noxen.drogen}.` : null,
  sozial: (c) => p(c).sozialanamnese.length ? `Sozial: ${list(p(c).sozialanamnese)}.` : null,
  familie: (c) => p(c).familienanamnese.length ? `In der Familienanamnese: ${list(p(c).familienanamnese)}.` : null,
  vorerkrankungen: (c) => {
    const v = list(p(c).vorerkrankungen);
    const op = list(p(c).voroperationen);
    const parts = [v && `An Vorerkrankungen: ${v}`, op && op.toLowerCase() !== 'keine' && `Voroperationen: ${op}`].filter(Boolean);
    return parts.length ? parts.join('. ') + '.' : null;
  },
  medikation: (c) => {
    const m = p(c).medikamente;
    if (!m.length || m[0].toLowerCase().includes('keine')) return 'Eine regelmäßige Medikamenteneinnahme werde verneint.';
    return `Der/die Patient/in nehme regelmäßig ${list(m)} ein.`;
  },
  diagnose: (c) => {
    const dd = c.medicalView.differenzialdiagnosen.map((d) => d.dd).join(', ');
    return `Verdacht auf ${c.medicalView.verdachtsdiagnose}.${dd ? ` Differenzialdiagnostisch: ${dd}.` : ''}`;
  },
  diagnostik: (c) => c.medicalView.diagnostik.length ? `Geplante Diagnostik: ${list(c.medicalView.diagnostik)}.` : null,
  therapie: (c) => {
    const t = c.medicalView.therapie;
    const all = [...(t.konservativ ?? []), ...(t.interventionell ?? []), ...(t.chirurgisch ?? [])];
    return all.length ? `Therapie: ${list(all.slice(0, 4))}.` : null;
  },
};

// Map chapitre → catégorie(s), pour la Fallvorstellung (orale).
const VORSTELLUNG_MAP: Record<string, string[]> = {
  'persoenliche-daten': ['identity'],
  'aktuelle-beschwerden': ['beschwerden', 'begleitsymptome', 'vegetativ'],
  allergien: ['allergien'],
  rauchen: ['rauchen'],
  alkohol: ['alkohol'],
  drogen: ['drogen'],
  sozialanamnese: ['sozial'],
  familienanamnese: ['familie'],
  vorerkrankungen: ['vorerkrankungen'],
  medikation: ['medikation'],
  'diagnostik-procedere': ['diagnose', 'diagnostik', 'therapie'],
};

// Map chapitre → catégorie(s), pour l'Arztbrief (écrit).
const ARZTBRIEF_MAP: Record<string, string[]> = {
  einleitung: ['identity'],
  'aktuelle-beschwerden': ['beschwerden', 'begleitsymptome', 'vegetativ'],
  vorerkrankungen: ['vorerkrankungen'],
  medikation: ['medikation'],
  'allergien-noxen': ['allergien', 'rauchen', 'alkohol', 'drogen'],
  'familie-sozial': ['familie', 'sozial'],
  diagnose: ['diagnose'],
  'diagnostik-therapie': ['diagnostik', 'therapie'],
};

function build(cats: string[] | undefined, c: Case): string | null {
  if (!cats) return null;
  const out = cats.map((cat) => BUILDERS[cat]?.(c)).filter(Boolean) as string[];
  return out.length ? out.join(' ') : null;
}

export function vorstellungExample(chapterId: string, c: Case): string | null {
  return build(VORSTELLUNG_MAP[chapterId], c);
}
export function arztbriefExample(chapterId: string, c: Case): string | null {
  return build(ARZTBRIEF_MAP[chapterId], c);
}
