import { Icon } from '@/components/icons';

// ============================================================================
// Système d'en-têtes cliniques — chaque rubrique médicale (Verdachtsdiagnose,
// Differenzialdiagnosen, Diagnostik, Therapie…) reçoit une couleur, une icône
// et une double étiquette (allemand + français). Codage couleur = aide mémoire :
// l'œil apprend « bleu = démarche diag », « vert = traitement », « rose = piège ».
// Réutilisé par la fiche clinique ET l'aperçu latéral (cohérence visuelle).
// ============================================================================

export type SecKey = 'leit' | 'verdacht' | 'dd' | 'diagnostik' | 'therapie' | 'erst' | 'cave';

export const SEC: Record<SecKey, { icon: string; de: string; fr: string; badge: string; edge: string }> = {
  leit:       { icon: 'pulse',  de: 'Leitsymptome',          fr: 'Symptômes cardinaux',      badge: 'bg-signal-500',  edge: 'bg-signal-400' },
  verdacht:   { icon: 'target', de: 'Verdachtsdiagnose',     fr: 'Diagnostic suspecté',      badge: 'bg-brand-600',   edge: 'bg-brand-500' },
  dd:         { icon: 'branch', de: 'Differenzialdiagnosen', fr: 'Diagnostics différentiels', badge: 'bg-indigo-500',  edge: 'bg-indigo-400' },
  diagnostik: { icon: 'search', de: 'Diagnostik',            fr: 'Démarche diagnostique',    badge: 'bg-sky-500',     edge: 'bg-sky-400' },
  therapie:   { icon: 'pill',   de: 'Therapie',              fr: 'Traitement',               badge: 'bg-emerald-500', edge: 'bg-emerald-400' },
  erst:       { icon: 'bolt',   de: 'Erste Maßnahmen',       fr: 'Premières mesures',        badge: 'bg-amber-500',   edge: 'bg-amber-400' },
  cave:       { icon: 'alert',  de: 'Prüfungsfallen',        fr: 'Pièges d’examen',          badge: 'bg-rose-500',    edge: 'bg-rose-400' },
};

// En-tête compact : pastille icône colorée + titre allemand (display) + sous-titre FR (mono).
export function SectionHead({ sec, sub, className = '' }: { sec: SecKey; sub?: string; className?: string }) {
  const s = SEC[sec];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white shadow-sm ${s.badge}`}>
        <Icon name={s.icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="leading-none">
        <div className="font-display text-[15px] font-bold tracking-tightish">{s.de}</div>
        <div className="mt-1 text-[10px] font-semibold text-slate-400">{sub ?? s.fr}</div>
      </div>
    </div>
  );
}

// Carte de rubrique : filet d'accent coloré à gauche + en-tête + contenu.
export function SectionCard({ sec, sub, children, className = '' }: { sec: SecKey; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card relative overflow-hidden p-5 pl-6 ${className}`}>
      <span className={`absolute inset-y-0 left-0 w-1.5 ${SEC[sec].edge}`} />
      <SectionHead sec={sec} sub={sub} className="mb-3" />
      {children}
    </div>
  );
}
