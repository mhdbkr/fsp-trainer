import { getActiveUserId } from '@/lib/auth/accounts';

// Pas d'import de `@/lib/auth/session` ici : ce module initialise Supabase et
// exige un .env — les tests de préférences n'en ont pas besoin.
const FOUNDER = import.meta.env.VITE_AUTH_MODE === 'founder';

// ============================================================================
// Préférence de formulation (FB2-O3) : quand le candidat choisit une variante
// d'une phrase du guide, ce choix est MÉMORISÉ et devient sa formulation par
// défaut dans toutes les simulations suivantes — l'app se souvient de la façon
// dont il aime dire les choses. Clé = texte standard de la phrase (stable,
// indépendant de l'ordre des chapitres). Stockage local, par compte en mode
// fondateur ; la synchronisation entre appareils passera par progress_events.
// ============================================================================

const KEY = 'doctopus-variants';
const keyName = (): string => (FOUNDER ? `${KEY}:${getActiveUserId() ?? 'anon'}` : KEY);

type Prefs = Record<string, number>;

function read(): Prefs {
  try { return JSON.parse(localStorage.getItem(keyName()) ?? '{}') as Prefs; } catch { return {}; }
}

/** Index de variante préféré pour cette phrase ; -1 = formulation standard. */
export function getPreferredVariant(standardText: string, altsCount: number): number {
  const i = read()[standardText];
  return typeof i === 'number' && i >= 0 && i < altsCount ? i : -1;
}

/** Mémorise le choix ; revenir à la standard (-1) efface la préférence. */
export function setPreferredVariant(standardText: string, idx: number): void {
  const p = read();
  if (idx < 0) delete p[standardText]; else p[standardText] = idx;
  localStorage.setItem(keyName(), JSON.stringify(p));
}

/** Oubli global (réglages). */
export function clearPreferredVariants(): void { localStorage.removeItem(keyName()); }
