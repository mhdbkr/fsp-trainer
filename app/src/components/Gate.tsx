import type { ReactNode } from 'react';
import { useEntitlements } from '@/lib/entitlements';
/** Rend l'enfant si le plan a la feature, sinon le fallback (offre contextuelle). */
export function Gate({ feature, fallback = null, children }: { feature: string; fallback?: ReactNode; children: ReactNode }) {
  const { has } = useEntitlements();
  return <>{has(feature) ? children : fallback}</>;
}
