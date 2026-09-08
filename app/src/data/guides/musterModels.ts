import type { MusterCity } from '@/db/types';
import { MUSTER_BOGEN, MUSTER_CITIES, type MusterBogenSpec } from './musterBogen';

// ============================================================================
// Modèles de Muster-Bogen — une couche de PRÉSENTATION au-dessus des specs par
// ville. Le candidat choisit d'abord une FORME (étendue × style d'écriture),
// pas une ville : c'est la forme qui change ce qu'il doit faire de sa main.
// Les villes restent la clé technique (store, BogenNotes, composants) — un
// modèle pointe sur une ville « primaire », et liste celles qui l'utilisent.
//
// Les groupes sont DÉRIVÉS des specs (étendue × style) et non écrits à la
// main : si une ville change de forme, elle change de modèle toute seule.
// ============================================================================

export type MusterScope = 'komplett' | 'kurz';

export interface MusterModel {
  id: string;
  name: string;
  scope: MusterScope;
  style: MusterBogenSpec['style'];
  cities: MusterCity[];   // villes dont la feuille a cette forme
  primary: MusterCity;    // spec appliquée quand on choisit le modèle
  blurb: string;          // ce qui le distingue, en une phrase
}

const scopeOf = (s: MusterBogenSpec): MusterScope => (s.fields.length >= 8 ? 'komplett' : 'kurz');

const META: Record<string, { name: string; blurb: string }> = {
  'komplett-stichpunkte': { name: 'Complet · Stichpunkte', blurb: 'Le modèle pédagogique complet (ODAK) : toute l’anamnèse tient sur la feuille, motif compris.' },
  'kurz-stichpunkte':     { name: 'Court · Stichpunkte',   blurb: 'Données de fond en mots-clés ; le motif et le raisonnement vont dans le Bericht.' },
  'kurz-ganze-saetze':    { name: 'Court · ganze Sätze',   blurb: 'Mêmes rubriques, mais le Bericht se rédige en phrases complètes — sans répéter la page 1.' },
  'kurz-frei':            { name: 'Court · rédaction libre', blurb: 'Rubriques minimales, forme libre ; l’essentiel passe dans le « Brief ».' },
};

export const MUSTER_MODELS: MusterModel[] = (() => {
  const groups = new Map<string, MusterModel>();
  for (const city of MUSTER_CITIES) {
    const spec = MUSTER_BOGEN[city];
    const id = `${scopeOf(spec)}-${spec.style}`;
    const g = groups.get(id);
    if (g) { g.cities.push(city); continue; }
    const meta = META[id] ?? { name: `${scopeOf(spec) === 'komplett' ? 'Complet' : 'Court'} · ${spec.style}`, blurb: spec.instruction };
    groups.set(id, { id, name: meta.name, scope: scopeOf(spec), style: spec.style, cities: [city], primary: city, blurb: meta.blurb });
  }
  // Ordre pédagogique : le complet d'abord, puis du plus contraint au plus libre.
  const rank: Record<string, number> = { 'komplett-stichpunkte': 0, 'kurz-stichpunkte': 1, 'kurz-ganze-saetze': 2, 'kurz-frei': 3 };
  return [...groups.values()].sort((a, b) => (rank[a.id] ?? 9) - (rank[b.id] ?? 9));
})();

export const modelForCity = (city: MusterCity): MusterModel =>
  MUSTER_MODELS.find((m) => m.cities.includes(city)) ?? MUSTER_MODELS[0];

export const STYLE_LABEL: Record<MusterBogenSpec['style'], string> = {
  stichpunkte: 'Stichpunkte', 'ganze-saetze': 'ganze Sätze', frei: 'frei',
};
