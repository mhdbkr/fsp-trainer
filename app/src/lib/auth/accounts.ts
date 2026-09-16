// ============================================================================
// Registre LOCAL des comptes connus sur cet appareil (mode fondateur).
// Plusieurs personnes partagent un ordinateur : chacune a un compte Supabase
// réel ; on garde ici le dernier jeton de rafraîchissement de chacune pour
// basculer sans mot de passe. Aucune donnée d'avancement ici — seulement
// l'annuaire. La base Dexie de chaque compte est `fsp-cockpit-<userId>`.
// ============================================================================

export interface KnownAccount {
  userId: string;
  email: string;
  displayName: string;
  color: string;
  refreshToken: string | null;   // null = expiré/révoqué → mot de passe demandé
  lastActiveAt: number;
}

export const ACCOUNT_COLORS = ['petrol', 'coral', 'indigo', 'amber', 'rose', 'emerald', 'sky', 'violet'] as const;

const KEY_ACCOUNTS = 'fsp.accounts';
const KEY_ACTIVE = 'fsp.activeUserId';

const read = (): KnownAccount[] => {
  try {
    const raw = localStorage.getItem(KEY_ACCOUNTS);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as KnownAccount[]) : [];
  } catch { return []; }
};
const write = (list: KnownAccount[]) => localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(list));

export const listAccounts = (): KnownAccount[] => read().sort((a, b) => b.lastActiveAt - a.lastActiveAt);

export const getActiveUserId = (): string | null => localStorage.getItem(KEY_ACTIVE);
export const setActiveUserId = (id: string | null): void => {
  if (id) localStorage.setItem(KEY_ACTIVE, id); else localStorage.removeItem(KEY_ACTIVE);
};

const pickColor = (taken: string[]): string =>
  ACCOUNT_COLORS.find((c) => !taken.includes(c)) ?? ACCOUNT_COLORS[taken.length % ACCOUNT_COLORS.length];

export function upsertAccount(
  a: Omit<KnownAccount, 'color' | 'lastActiveAt'> & Partial<Pick<KnownAccount, 'color' | 'lastActiveAt'>>,
): KnownAccount {
  const list = read();
  const i = list.findIndex((x) => x.userId === a.userId);
  const prev = i >= 0 ? list[i] : undefined;
  const next: KnownAccount = {
    userId: a.userId, email: a.email, displayName: a.displayName,
    refreshToken: a.refreshToken,
    color: a.color ?? prev?.color ?? pickColor(list.map((x) => x.color)),
    lastActiveAt: a.lastActiveAt ?? Date.now(),
  };
  if (i >= 0) list[i] = next; else list.push(next);
  write(list);
  return next;
}

export function setRefreshToken(userId: string, token: string | null): void {
  const list = read();
  const a = list.find((x) => x.userId === userId);
  if (!a) return;
  a.refreshToken = token;
  write(list);
}

export function forgetAccount(userId: string): void {
  write(read().filter((x) => x.userId !== userId));
  if (getActiveUserId() === userId) setActiveUserId(null);
}

export const initials = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
