import type { Readiness } from '@/lib/readiness';

// Jauge « Suis-je prêt ? » — demi-cercle illustré, couleur selon le verdict.
const VERDICT_COLOR: Record<Readiness['verdict'], string> = {
  'Pas encore': '#f43f5e', 'En route': '#f59e0b', 'Presque prêt': '#84cc16', 'Prêt': '#10b981',
};

export function ReadinessGauge({ readiness, size = 200 }: { readiness: Readiness; size?: number }) {
  const { global, verdict } = readiness;
  const color = VERDICT_COLOR[verdict];
  const r = size / 2 - 14;
  const cx = size / 2, cy = size / 2;
  const circumference = Math.PI * r; // demi-cercle
  const offset = circumference * (1 - global / 100);

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 16} viewBox={`0 0 ${size} ${size / 2 + 16}`} role="img" aria-label={`Préparation ${global}%`}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={12} strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-800 dark:fill-slate-100" style={{ fontSize: size * 0.2, fontWeight: 800 }}>{global}%</text>
      </svg>
      <div className="-mt-1 text-center">
        <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ backgroundColor: color }}>{verdict}</span>
      </div>
    </div>
  );
}
