import type { Specialty } from '@/db/types';

// ============================================================================
// Pictogrammes SVG (line icons, 24×24, currentColor) — UI illustrative.
// Une icône par chapitre d'anamnèse, spécialité et système d'organe.
// Simples, cohérents, accessibles (role=img + aria-label via <title>).
// ============================================================================

const P: Record<string, React.ReactNode> = {
  // chapitres d'anamnèse
  handshake: <path d="M8 12l2-2 3 3 2-2 2 2M3 10l3-2 4 3M21 10l-3-2-3 2" />,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M14 10h4M14 14h4M6 16c1-2 5-2 6 0" /></>,
  pain: <><path d="M12 3s6 5 6 10a6 6 0 01-12 0c0-5 6-10 6-10z" /><path d="M9 13l2 2 3-4" /></>,
  pulse: <path d="M3 12h4l2-5 3 10 2-7 2 2h5" />,
  history: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  pill: <><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(45 12 12)" /><path d="M9 9l6 6" /></>,
  allergy: <><path d="M12 4c3 4 6 6 6 9a6 6 0 01-12 0c0-3 3-5 6-9z" /><path d="M9 15l6-4" /></>,
  cigarette: <><rect x="3" y="12" width="14" height="4" rx="1" /><path d="M20 8c-1 1-1 2 0 3M17 8c-1 1-1 2 0 3" /></>,
  family: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="9" r="2.5" /><path d="M3 20c0-3 2-5 5-5s5 2 5 5M13 20c0-2 1.5-4 3.5-4S20 18 20 20" /></>,
  // spécialités / organes
  heart: <path d="M12 20s-7-4.5-9-9C1.5 7 4 4 7 4c2 0 3.5 1.5 5 3.5C13.5 5.5 15 4 17 4c3 0 5.5 3 4 7-2 4.5-9 9-9 9z" />,
  lung: <><path d="M12 3v8" /><path d="M9 8c0 4-1 6-3 8-1.5 1.5-3 .5-3-1 0-3 1-6 3-9 1.5-2 3-1 3 2z" /><path d="M15 8c0 4 1 6 3 8 1.5 1.5 3 .5 3-1 0-3-1-6-3-9-1.5-2-3-1-3 2z" /></>,
  stomach: <path d="M9 3v5c0 3 3 3 3 6 0 4-3 5-6 5M9 8c2 0 3 1 5 1s3-1 3-3-1-3-3-3" />,
  kidney: <path d="M14 4c-4 0-6 3-6 8s2 8 6 8c2 0 3-2 2-4-1-1-2-1-2-4s1-3 2-4c1-2 0-4-2-4z" />,
  brain: <path d="M9 4a3 3 0 00-3 3 3 3 0 00-1 5 3 3 0 002 4 3 3 0 006 0V4a3 3 0 00-4 0zM15 6a3 3 0 013 3 3 3 0 011 4 3 3 0 01-2 3" />,
  bone: <path d="M7 17l-1 1a2 2 0 11-2-2l1-1M17 7l1-1a2 2 0 112 2l-1 1M6 15l9-9M9 18l9-9" />,
  blood: <path d="M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z" />,
  thyroid: <path d="M8 6c-1 3-1 6 1 8s3 2 3-1c0 3 1 3 3 1s2-5 1-8M12 5v3" />,
  mind: <><circle cx="12" cy="12" r="8" /><path d="M12 8a2 2 0 012 2c0 1.5-2 1.5-2 3M12 16h.01" /></>,
  virus: <><circle cx="12" cy="12" r="5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" /></>,
  skin: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h.01M12 12h.01M16 8h.01M10 15h.01M15 16h.01" /></>,
  glass: <path d="M6 4h12l-2 8a4 4 0 01-8 0L6 4zM12 16v4M9 20h6" />,
  cannabis: <path d="M12 21V9M12 13c-3-1-5-4-5-7 3 0 5 2 5 4 0-2 2-4 5-4 0 3-2 6-5 7z" />,
  syringe: <path d="M4 20l4-4M8 16l6-6 4 4-6 6zM14 6l4 4M16 4l4 4" />,
  female: <><circle cx="12" cy="8" r="4" /><path d="M12 12v8M9 17h6" /></>,
  stethoscope: <><path d="M5 4v5a4 4 0 008 0V4" /><path d="M9 13v3a5 5 0 0010 0v-2" /><circle cx="19" cy="12" r="2" /></>,
  // situations communication
  alert: <><path d="M12 3l9 16H3l9-16z" /><path d="M12 9v4M12 17h.01" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4M12 17h.01" /></>,
  shield: <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z" />,
  ear: <path d="M7 9a5 5 0 0110 0c0 3-3 4-3 6a2 2 0 01-4 0M9 12a3 3 0 013-3" />,
};

export function Icon({ name, className = 'h-5 w-5', title }: { name: string; className?: string; title?: string }) {
  const body = P[name] ?? P.stethoscope;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className={className} role="img" aria-label={title ?? name}>
      {title && <title>{title}</title>}
      {body}
    </svg>
  );
}

const SPECIALTY_ICON: Partial<Record<Specialty, string>> = {
  Kardiologie: 'heart', Pneumologie: 'lung', Gastroenterologie: 'stomach',
  Nephrologie: 'kidney', Urologie: 'kidney', Neurologie: 'brain',
  Hämatologie: 'blood', Endokrinologie: 'thyroid', Rheumatologie: 'bone',
  Orthopädie: 'bone', Chirurgie: 'stethoscope', Psychiatrie: 'mind',
  Infektiologie: 'virus', Dermatologie: 'skin',
};

export function SpecialtyIcon({ specialty, className }: { specialty: Specialty; className?: string }) {
  return <Icon name={SPECIALTY_ICON[specialty] ?? 'stethoscope'} className={className} title={specialty} />;
}
