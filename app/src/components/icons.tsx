import type { Specialty } from '@/db/types';

// ============================================================================
// Pictogrammes SVG (line icons, 24×24, currentColor) — UI illustrative.
// Une icône par chapitre d'anamnèse, spécialité et système d'organe.
// Simples, cohérents, accessibles (role=img + aria-label via <title>).
// ============================================================================

const P: Record<string, React.ReactNode> = {
  // chapitres d'anamnèse
  handshake: <><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h8A1.5 1.5 0 0 1 14 6.5v4A1.5 1.5 0 0 1 12.5 12H7.5L5 14.2V12H4.5A1.5 1.5 0 0 1 3 10.5z" /><path d="M16.5 9h3A1.5 1.5 0 0 1 21 10.5v3A1.5 1.5 0 0 1 19.5 15H19v2.2L16.5 15h-2" /></>,
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
  // Estomac anatomique : œsophage qui plonge, poche en J (grande courbure), pli interne.
  stomach: <><path d="M13.3 2.5v3.1c0 1-.4 1.9-1.1 2.5-.5.5-1.2.8-1.9.9a4.9 4.9 0 0 0-4 4.9A5.1 5.1 0 0 0 11.4 19h1.3c4.8 0 8.8-3.9 8.8-8.7 0-1.2-.8-2.3-1.9-2.7a4.7 4.7 0 0 1-3.1-4.4V2.5" /><path d="M9.5 13.4c0 2 1.6 3.6 3.6 3.6" /></>,
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
  // navigation (line, 24×24, cohérents avec le reste)
  'nav-home': <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5v-6h4v6h5V9.5" /></>,
  'nav-calendar': <><rect x="3.5" y="4.5" width="17" height="16" rx="2.5" /><path d="M3.5 9h17M8 3v3M16 3v3" /></>,
  'nav-cases': <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  'nav-sim': <><circle cx="12" cy="12" r="9" /><path d="M10 8.3l6 3.7-6 3.7z" /></>,
  'nav-book': <><path d="M5 4.5h11a2 2 0 012 2V19H7a2 2 0 00-2 2z" /><path d="M5 19a2 2 0 012-2h11" /></>,
  'nav-compass': <><circle cx="12" cy="12" r="9" /><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z" /></>,
  'nav-clipboard': <><rect x="5" y="4.5" width="14" height="16.5" rx="2" /><path d="M9 4.5a3 3 0 016 0M9.5 4.5h5M8.5 11h7M8.5 15h5" /></>,
  'nav-abc': <><path d="M3.5 15l3-8 3 8M4.6 12.3h3.8" /><path d="M13 15V7h3a2.3 2.3 0 010 4.6h-3M13 11.6h3.4a2.3 2.3 0 010 4.6H13" /></>,
  'nav-chart': <><path d="M4 4v16h16" /><path d="M7.5 14.5l3.2-4 3 2.6 5-6.6" /></>,
  'nav-sun': <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8" /></>,
  'nav-moon': <path d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z" />,
  // ── UI (remplacent les emojis structurels) ──────────────────────────────
  flame: <path d="M12 2.5c.5 3 3.5 4.2 3.5 7.5a3.5 3.5 0 01-7 0c0-1 .3-1.8.9-2.6-.2 1.4.6 2.3 1.4 2.6-.7-2 .3-4.4 1.2-7.5z" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 1.9" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.3" /></>,
  bolt: <path d="M13 2.5 5.5 13H11l-1 8.5L18.5 10H13l1-7.5z" />,
  leaf: <><path d="M5 19c0-8 6-12.5 14-12.5C19 14 13.5 19 6 19c-1 0-1 0-1 0z" /><path d="M5.5 18.5c3-4.5 6.5-6.8 10.5-8.5" /></>,
  gauge: <><path d="M4 15.5a8 8 0 0 1 16 0" /><path d="M12 15.5l4.2-4.2" /><circle cx="12" cy="15.5" r="1.1" /></>,
  check: <path d="M4.5 12.5 9.5 17.5 20 6.5" />,
  spark: <path d="M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" />,
  play: <path d="M8 5.2 19 12 8 18.8z" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  mask: <><path d="M4 6c0 7 2.5 11 8 11s8-4 8-11c-2.7-1-5.3-1.5-8-1.5S6.7 5 4 6z" /><path d="M9 10h.01M15 10h.01M9.5 13.5c1.3 1 3.7 1 5 0" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  bulb: <><path d="M9.5 18h5M10.5 21h3" /><path d="M8 13.5a5 5 0 118 0c-.8.8-1.5 1.6-1.5 2.5h-5c0-.9-.7-1.7-1.5-2.5z" /></>,
  pen: <><path d="M4 20l4.5-1L18 9.5 14.5 6 5 15.5 4 20z" /><path d="M13.5 7l3.5 3.5" /></>,
  refresh: <><path d="M4 11.5a8 8 0 0 1 13.4-5.4L20 8.5M20 4v4.5h-4.5" /><path d="M20 12.5a8 8 0 0 1-13.4 5.4L4 15.5M4 20v-4.5h4.5" /></>,
  pause: <path d="M9 5v14M15 5v14" />,
  key: <><circle cx="8" cy="9" r="4.5" /><path d="M11.5 12L20 20.5M17 17.5l2-2M20 14.5l1.5 1.5" /></>,
  speech: <path d="M4.5 5h15v10.5H10l-4 4V5z" />,
  // Les trois Teile de l'examen — chacune dit ce qu'on y fait (FB2-P, retour direction).
  dialog: <><path d="M3.5 4.5h11v7.5H8.5l-3 2.5v-2.5h-2z" /><path d="M11 12.5v2.5h5l3 2.5v-2.5h1.5V9.5H16" /></>,
  document: <><path d="M6 3.5h8l4 4v13H6z" /><path d="M14 3.5v4h4" /><path d="M8.5 11h7M8.5 14h7M8.5 17h4" /></>,
  present: <><rect x="3" y="4" width="18" height="11" rx="1.5" /><path d="M7 10.5l3-3 3 2.5 4-4" /><path d="M12 15v2.5M8.5 20.5l3.5-3 3.5 3" /></>,
  flag: <path d="M6 3v18M6 4h11.5l-2.2 3.8L17.5 11.5H6" />,
  inbox: <><path d="M4 13.5 6.5 5h11L20 13.5" /><path d="M4 13.5V19h16v-5.5h-5.2a2.8 2.8 0 0 1-5.6 0H4z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></>,
  trash: <path d="M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13" />,
  // Vraie roue dentée : dents COLLÉES à la jante (un soleil a des rayons détachés).
  gear: <><circle cx="12" cy="12" r="5.8" /><circle cx="12" cy="12" r="2" /><path d="M12 3.4v2.8M12 17.8v2.8M20.6 12h-2.8M6.2 12H3.4M18.1 5.9l-2 2M7.9 16.1l-2 2M18.1 18.1l-2-2M7.9 7.9l-2-2" /></>,
  target2: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M8 12h8" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20c0-4 3.4-6 7.5-6s7.5 2 7.5 6" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 13.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5.5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>,
  // Diagnostics différentiels : ramification (arbre de décision).
  branch: <><circle cx="6.5" cy="6.5" r="2.3" /><circle cx="6.5" cy="17.5" r="2.3" /><circle cx="17.5" cy="6.5" r="2.3" /><path d="M6.5 8.8v6.4" /><path d="M17.5 8.8c0 4.6-11 2.4-11 6.4" /></>,
  // Google « G » — glyphe monochrome (currentColor), pour le bouton OAuth.
  google: <path d="M12 10.9v2.6h4.4c-.2 1.2-1.6 3.5-4.4 3.5-2.7 0-4.8-2.2-4.8-5s2.1-5 4.8-5c1.5 0 2.5.6 3.1 1.2l2.1-2C15.9 4.9 14.1 4 12 4 7.6 4 4 7.6 4 12s3.6 8 8 8c4.6 0 7.7-3.2 7.7-7.7 0-.5-.1-1-.1-1.4H12z" />,
  // ── Doctopus — marque officielle. Tracé vectoriel unique (fill, pas de
  // stroke) : arche-manteau, yeux-feuilles, tentacules. Source de vérité du
  // logo côté app — voir app/docs/brand/LOGO.md et app/public/logo.svg. ──
  doctopus: <path fill="currentColor" stroke="none" fillRule="evenodd" d="M 0.84 23.1 C 1.11 22.54 1.39 21.97 1.67 21.4 C 2.57 21.32 3.47 21.3 4.36 21.16 L 5.24 20.84 L 6.19 20.28 C 6.66 19.89 7.16 19.5 7.51 18.99 L 9.17 15.93 L 9.81 15.04 C 10.11 14.75 10.44 14.48 10.82 14.31 C 11.18 14.15 11.6 14.06 12 14.07 C 12.41 14.07 12.84 14.16 13.21 14.32 C 13.6 14.5 13.98 14.72 14.22 15.06 C 15.1 16.31 15.65 17.76 16.52 19.02 C 16.87 19.52 17.34 19.95 17.85 20.3 C 18.39 20.67 18.99 21 19.63 21.16 C 20.51 21.37 21.43 21.31 22.33 21.39 C 22.62 21.96 22.9 22.53 23.18 23.09 C 22.61 23.13 22.04 23.21 21.47 23.21 C 20.93 23.22 20.39 23.2 19.86 23.11 C 19.36 23.03 18.86 22.89 18.38 22.71 C 17.92 22.54 17.48 22.31 17.06 22.05 L 15.95 21.2 L 15.09 20.26 C 14.32 19.04 13.72 17.72 12.96 16.49 L 12.5 16.12 L 11.99 16 L 11.49 16.13 L 11.04 16.52 C 10.28 17.73 9.69 19.04 8.92 20.25 L 8.07 21.19 L 6.96 22.04 C 6.54 22.3 6.1 22.53 5.64 22.71 C 5.16 22.89 4.67 23.02 4.16 23.11 L 2.81 23.21 C 2.15 23.21 1.49 23.14 0.84 23.1 Z M 0.6 18.89 C 0.89 18.31 1.18 17.74 1.47 17.17 C 2.1 17.1 2.73 17.1 3.35 16.96 L 3.85 16.67 L 4.27 16.16 C 4.81 15.13 5.36 14.1 5.76 13 C 5.84 12.77 5.76 12.51 5.69 12.27 C 5.52 11.72 5.19 11.23 5.03 10.68 L 5.07 10.14 L 5.34 9.45 C 6.59 7.04 7.72 4.56 9.13 2.24 C 9.43 1.77 9.95 1.47 10.41 1.17 L 11.2 0.88 L 11.99 0.78 L 12.79 0.87 L 13.57 1.16 L 14.28 1.62 L 14.89 2.26 C 16.21 4.62 17.43 7.03 18.66 9.43 L 18.94 10.12 L 18.98 10.67 C 18.82 11.23 18.49 11.73 18.31 12.29 C 18.24 12.52 18.17 12.8 18.26 13.02 C 18.66 14.11 19.21 15.15 19.75 16.19 L 20.17 16.68 L 20.68 16.97 C 21.3 17.1 21.93 17.12 22.56 17.18 C 22.83 17.76 23.12 18.34 23.4 18.91 C 22.82 18.94 22.24 19.01 21.66 18.99 C 21.15 18.97 20.63 18.93 20.14 18.8 C 19.8 18.71 19.46 18.55 19.16 18.34 C 18.87 18.13 18.6 17.86 18.41 17.55 C 17.7 16.36 17.09 15.11 16.48 13.86 L 16.2 13.05 C 16.17 12.75 16.21 12.44 16.32 12.16 L 17.35 10.13 C 17.01 9.66 16.62 9.23 16.33 8.73 C 15.35 7.01 14.56 5.18 13.55 3.48 C 13.4 3.21 13.14 3 12.86 2.85 C 12.6 2.72 12.29 2.65 11.99 2.66 C 11.7 2.66 11.39 2.72 11.13 2.87 C 10.86 3.01 10.6 3.23 10.45 3.49 L 7.68 8.71 C 7.4 9.21 7 9.64 6.66 10.11 L 7.7 12.18 C 7.81 12.46 7.85 12.77 7.81 13.07 L 7.51 13.91 C 6.89 15.15 6.3 16.39 5.59 17.57 C 5.4 17.88 5.13 18.14 4.83 18.35 C 4.53 18.56 4.2 18.72 3.85 18.81 C 3.33 18.94 2.78 18.98 2.25 18.99 C 1.7 19.01 1.15 18.92 0.6 18.89 Z M 8.5 10.35 L 9.54 10.34 C 9.8 10.38 10.07 10.46 10.3 10.6 C 10.53 10.74 10.72 10.95 10.88 11.17 C 11.06 11.45 11.16 11.78 11.31 12.08 C 10.99 12.09 10.67 12.17 10.36 12.14 C 10.07 12.1 9.8 12.01 9.56 11.86 C 9.33 11.72 9.13 11.51 8.98 11.29 L 8.5 10.35 Z M 12.72 12.09 C 12.86 11.79 12.94 11.47 13.12 11.19 C 13.27 10.97 13.46 10.76 13.69 10.62 C 13.91 10.47 14.18 10.39 14.44 10.35 L 15.49 10.33 C 15.34 10.64 15.24 10.98 15.05 11.27 C 14.9 11.49 14.7 11.7 14.47 11.85 C 14.24 12 13.96 12.09 13.68 12.13 C 13.37 12.18 13.04 12.1 12.72 12.09 Z" />,
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
