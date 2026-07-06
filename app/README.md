# FSP-Cockpit

App **locale** de préparation à la Fachsprachprüfung Medizin (région Baden-Württemberg), pour un binôme médecin + partenaire (jeux de rôle Arzt/Patient). Tout est stocké sur la machine (IndexedDB) — **aucun cloud, aucun compte, 100 % hors-ligne** après installation.

## Lancement

```bash
cd app
npm install
npm run dev
```

Puis ouvre l'URL affichée (par défaut http://localhost:5173).

Build de production :

```bash
npm run build      # génère dist/
npm run preview    # sert le build localement
```

> Le routing utilise un **hash router** et `base: './'` : le build `dist/` fonctionne aussi bien servi par un serveur que packagé plus tard dans **Tauri** (non implémenté, mais l'app ne s'y ferme pas).

## Stack

- **React 18 + TypeScript + Vite**
- **Dexie.js** (wrapper IndexedDB) — toute la persistance locale
- **React Router** (hash) · **Zustand** (état UI léger) · **TailwindCSS** · **Recharts** · **date-fns**

## Structure

```
src/
  db/          types.ts (modèle de données) · db.ts (schéma Dexie + imports)
  lib/         srs.ts (SM-2) · scoring.ts (éval hybride) · stats.ts · checklists.ts · autolink.tsx
  data/        seed*.ts (données de démo) · seed.ts (orchestration + linkage auto)
  store/       ui.ts (thème, glossaire, rôle, centre visé)
  hooks/       useData.ts (live queries Dexie)
  components/  Shell, GlossaryDrawer, AutoLink, ui.tsx (badges, ScoreBar…)
  features/
    home/        Accueil (session du jour, heatmap, calendrier, points faibles)
    cases/       Page Cas (filtres/tri/aperçu) + fiche double vue + fiche patient
    simulation/  Hub · Pré-simulation · Runner (chrono, notes, guide, scoring)
    fachwissen/  Liste + fiche détaillée
    guides/      Guides standard + communication + spécialité
    aufklaerung/ Catalogue (blocs standards vs spécifiques)
    fachbegriffe/ Glossaire + Drill SM-2
    stats/       Radar, progression, points faibles
```

## Concepts clés

- **Interconnexion automatique** : `AutoLink` scanne tout texte médical et rend les Fachbegriffe cliquables (aperçu → fiche) — piloté par le code, pas de balisage manuel. Le linkage cas ↔ termes ↔ Fachwissen ↔ Aufklärung est calculé au seed (`data/seed.ts › wireLinks`).
- **Évaluation hybride** : par partie, une **checklist de contenu** (% cochés) + une **grille de langue officielle** (barème C1 des Ärztekammern : Aussprache, Wortschatz, Grammatik, Redefluss, Kommunikation) + un **curseur ressenti**. Verdict = **≥ 60 % par partie** (règle Baden-Württemberg). Voir `lib/scoring.ts`.
- **Notes à double sortie** : le croquis d'anamnèse (une saisie) génère le squelette Arztbrief (Konjunktiv I) ET la trame Fallvorstellung. Voir `features/simulation/NotesCanvas.tsx`.
- **Session du jour pondérée** : `features/simulation/pickSession.ts` (fréquence × faiblesse × centre visé × termes SRS dus).

## Importer les données réelles (PHASE 2)

Le seed de démo (10 cas, ~45 Fachbegriffe, 4 Fachwissen, 3 Aufklärungen, guides) prouve le concept. Pour injecter les données réelles :

1. **Fachbegriffe** — `Fachbegriffe_FSP.csv` (2 249 termes) : mapper les colonnes `Terme, Traduction, Spécialité, État, Centres, Prononciation` vers le type `Fachbegriff`, puis `importFachbegriffe(items)` (`db/db.ts`). Enrichir avec les définitions détaillées d'`anki_FSP.txt` (champ 6).
2. **Cas** — parser les ~580 comptes-rendus des 4 protocoles `.md` vers le type `Case`, puis `importCases(items)`.
3. **Fachwissen** — depuis le livre Rogoveanu + PDF ODAK, vers `Fachwissen`, puis `importFachwissen(items)`.
4. **Aufklärungen** — les 16 actes du livre + actes fréquents, vers `AufklaerungItem`, puis `importAufklaerungen(items)`.

Toutes les fonctions d'import font un `bulkPut` (idempotent sur l'`id`). Relancer `wireLinks` après un import massif pour recalculer les liens.

Pour re-générer la base de démo pendant le dev, augmenter `SEED_VERSION` dans `data/seed.ts` (le contenu est resemé, les simulations et le SRS utilisateur sont préservés).
