import type { DiagnostikStufe } from '@/db/types';

// Palette partagée (Fachwissen + Case) par étape diagnostique — progression
// froide→chaude = du simple/non-invasif vers le spécialisé, lisible d'un coup
// d'œil, cohérente entre la fiche pathologie et le cas clinique qui l'illustre.
export const STUFE_META: Record<DiagnostikStufe, { dot: string; text: string; icon: string }> = {
  'Anamnese/Klinik': { dot: 'bg-brand-500', text: 'text-brand-700 dark:text-brand-300', icon: 'stethoscope' },
  Labor: { dot: 'bg-sky-500', text: 'text-sky-700 dark:text-sky-300', icon: 'blood' },
  'Apparativ & Bildgebung': { dot: 'bg-violet-500', text: 'text-violet-700 dark:text-violet-300', icon: 'search' },
  'Invasiv & Speziell': { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300', icon: 'syringe' },
};
