import { useRef } from 'react';

// Inclinaison 3D subtile au pointeur (~2,5° max) — « un peu de 3D », sobre.
// Désactivée si prefers-reduced-motion. Le wrapper porte les classes visuelles.
export function Tilt({ children, className = '', max = 2.5 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
  };
  const reset = () => { if (ref.current) ref.current.style.transform = 'perspective(900px)'; };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className={className}
      style={{ transform: 'perspective(900px)', transition: 'transform 200ms ease-out', transformStyle: 'preserve-3d', willChange: 'transform' }}>
      {children}
    </div>
  );
}
