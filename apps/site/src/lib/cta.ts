import type { SiteConfig } from './site.ts';
export interface Cta { href: string; label: string; micro: string | null }
export function ctaFor(site: SiteConfig, freeCases: number): Cta {
  return { href: `${site.appUrl}/signup`, label: `Mit ${freeCases} kostenlosen Fällen starten`, micro: 'Ohne Kreditkarte' };
}
const PLAN_LABEL: Record<string, string> = { pro: 'Pro wählen', premium: 'Premium wählen' };
/** CTA des colonnes de /de/preise/ : Free = inscription ; Pro/Premium = page pricing de l'app (Stripe Checkout, #1).
 * C6 (revue T2.4 I-2) : le CTA Free nomme les cas gratuits, comme le CTA hero (`ctaFor`). */
export function pricingCtaFor(site: SiteConfig, planId: string, freeCases: number): Cta {
  if (planId === 'free') return ctaFor(site, freeCases);
  return { href: `${site.appUrl}/pricing?plan=${planId}`, label: PLAN_LABEL[planId] ?? `${planId} wählen`, micro: null };
}
