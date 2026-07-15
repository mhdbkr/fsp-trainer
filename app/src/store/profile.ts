import { create } from 'zustand';
import { db, getMeta, setMeta } from '@/db/db';
import type { Profile } from '@/db/types';

// ============================================================================
// Profils d'apprenant. Chaque profil possède ses simulations, ses stats, son
// streak et son programme (clé meta `program:<id>`). App locale, sans compte.
// La liste + le profil actif vivent dans meta (exportables) ; ce store Zustand
// les reflète pour un accès synchrone (sauvegarde de simulation) et réactif.
// ============================================================================

export const PROFILE_COLORS: Record<string, { dot: string; soft: string; text: string; ring: string }> = {
  petrol: { dot: 'bg-brand-500', soft: 'bg-brand-100 dark:bg-brand-900/40', text: 'text-brand-700 dark:text-brand-200', ring: 'ring-brand-400' },
  coral: { dot: 'bg-signal-500', soft: 'bg-signal-100 dark:bg-signal-900/40', text: 'text-signal-700 dark:text-signal-300', ring: 'ring-signal-400' },
  indigo: { dot: 'bg-indigo-500', soft: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-400' },
  amber: { dot: 'bg-amber-500', soft: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-400' },
  rose: { dot: 'bg-rose-500', soft: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-400' },
  emerald: { dot: 'bg-emerald-500', soft: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-400' },
  sky: { dot: 'bg-sky-500', soft: 'bg-sky-100 dark:bg-sky-900/40', text: 'text-sky-700 dark:text-sky-300', ring: 'ring-sky-400' },
  violet: { dot: 'bg-violet-500', soft: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-400' },
};
const COLOR_KEYS = Object.keys(PROFILE_COLORS);

export const programKey = (profileId: string) => `program:${profileId}`;
export const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

const newId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `p-${Date.now()}-${Math.floor(Math.random() * 1e6)}`);

interface ProfileState {
  profiles: Profile[];
  activeId: string;
  loaded: boolean;
  load: () => Promise<void>;
  create: (name: string) => Promise<string>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  active: () => Profile | undefined;
}

export const useProfiles = create<ProfileState>((set, get) => ({
  profiles: [],
  activeId: '',
  loaded: false,

  load: async () => {
    let profiles = await getMeta<Profile[]>('profiles', []);
    let activeId = await getMeta<string>('activeProfileId', '');

    // Première ouverture → profil par défaut + rapatriement du programme hérité.
    if (!profiles.length) {
      const def: Profile = { id: newId(), name: 'Moi', color: 'petrol', createdAt: Date.now() };
      profiles = [def];
      activeId = def.id;
      await setMeta('profiles', profiles);
      await setMeta('activeProfileId', activeId);
      const legacy = await db.meta.get('program');
      if (legacy && !(await db.meta.get(programKey(def.id)))) await setMeta(programKey(def.id), legacy.value);
    }
    if (!activeId || !profiles.some((p) => p.id === activeId)) {
      activeId = profiles[0].id;
      await setMeta('activeProfileId', activeId);
    }
    // Adopte les simulations orphelines (démo, reseed) dans le 1er profil.
    const sims = await db.simulations.toArray();
    const orphans = sims.filter((s) => !s.profileId);
    if (orphans.length) await db.simulations.bulkPut(orphans.map((s) => ({ ...s, profileId: profiles[0].id })));

    set({ profiles, activeId, loaded: true });
  },

  create: async (name) => {
    const used = new Set(get().profiles.map((p) => p.color));
    const color = COLOR_KEYS.find((k) => !used.has(k)) ?? COLOR_KEYS[get().profiles.length % COLOR_KEYS.length];
    const p: Profile = { id: newId(), name: name.trim() || 'Profil', color, createdAt: Date.now() };
    const profiles = [...get().profiles, p];
    await setMeta('profiles', profiles);
    set({ profiles });
    return p.id;
  },

  rename: async (id, name) => {
    const profiles = get().profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p));
    await setMeta('profiles', profiles);
    set({ profiles });
  },

  remove: async (id) => {
    const profiles = get().profiles.filter((p) => p.id !== id);
    if (!profiles.length) return; // toujours au moins un profil
    await setMeta('profiles', profiles);
    await db.meta.delete(programKey(id));
    const sims = await db.simulations.toArray();
    const toDelete = sims.filter((s) => s.profileId === id).map((s) => s.id);
    if (toDelete.length) await db.simulations.bulkDelete(toDelete);
    let activeId = get().activeId;
    if (activeId === id) { activeId = profiles[0].id; await setMeta('activeProfileId', activeId); }
    set({ profiles, activeId });
  },

  setActive: async (id) => {
    await setMeta('activeProfileId', id);
    set({ activeId: id });
  },

  active: () => get().profiles.find((p) => p.id === get().activeId),
}));
