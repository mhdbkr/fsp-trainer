// ============================================================================
// Doctopus — mascotte pieuvre « médecin » de l'assistant IA. SVG dédié
// (pas un emoji). Tête ronde avec un bandeau à croix médicale, grands yeux
// amicaux, et des tentacules qui s'enroulent. Couleurs = palette brand.
// ============================================================================
export function DoctopusMascot({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="Doctopus, assistant IA">
      {/* tentacules */}
      <g fill="#2b9689">
        <path d="M14 42c-4 3-7 8-6 12 .5 2 3 2 3.5 0 .6-3 2-6 4.5-8z" />
        <path d="M22 46c-2 4-3 10-1 13 1 1.6 3 1 3-1 0-3 .5-7 2-10z" />
        <path d="M32 47c0 5 0 11 1.5 13 1 1.4 2.8.8 2.8-1 0-3-.5-8-1.3-12z" />
        <path d="M42 46c2 4 3 9 2 12-.4 1.8-2.7 1.6-3-.3-.4-3-1-6-2.5-9z" />
        <path d="M50 42c4 3 7 7 6.5 11-.3 2-2.8 2-3.4.2-.8-3-2.3-6-5-8z" />
      </g>
      {/* corps / tête */}
      <path d="M32 8c-11 0-19 8-19 19 0 6 3 11 8 14 2 1 5 1.5 11 1.5s9-.5 11-1.5c5-3 8-8 8-14C51 16 43 8 32 8z" fill="#34b3a4" />
      <path d="M32 8c-11 0-19 8-19 19 0 3 .8 6 2.2 8.5C17 25 23 18 33 18c9 0 15 6 16.6 16 .9-2.2 1.4-4.6 1.4-7C51 16 43 8 32 8z" fill="#45c2b3" opacity=".6" />
      {/* bandeau médical */}
      <path d="M14.5 20.5C18 15 24.5 11.5 32 11.5S46 15 49.5 20.5c-1 .8-2 1.4-3 2C43.5 18 38.3 15 32 15s-11.5 3-14.5 7.5c-1-.6-2-1.2-3-2z" fill="#ffffff" />
      <path d="M30.4 16.2h3.2v1.6h1.6v3.2h-1.6v1.6h-3.2v-1.6h-1.6v-3.2h1.6z" fill="#e5484d" />
      {/* yeux */}
      <circle cx="25" cy="29" r="4.5" fill="#fff" />
      <circle cx="39" cy="29" r="4.5" fill="#fff" />
      <circle cx="26" cy="30" r="2.2" fill="#0b2523" />
      <circle cx="38" cy="30" r="2.2" fill="#0b2523" />
      <circle cx="26.8" cy="29.2" r=".7" fill="#fff" />
      <circle cx="38.8" cy="29.2" r=".7" fill="#fff" />
      {/* sourire */}
      <path d="M28 35.5c1.4 1.6 6.6 1.6 8 0" fill="none" stroke="#0b2523" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
