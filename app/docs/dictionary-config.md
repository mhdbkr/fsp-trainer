# Dictionnaire / Traducteur — configuration & extension

Le module dictionnaire (bouton flottant 📖, disponible partout) est **100 % gratuit et sans API payante**. Il a deux voies, configurables ici.

## Voie 1 — Mot isolé (hors-ligne, instantané)
Cascade de recherche (`src/lib/dictionary.ts › localLookup`) :
1. **Fachbegriffe** (IndexedDB) — la source principale (2 249 termes après l'import PHASE 2).
2. **Mini-dictionnaire** DE↔FR (`src/data/miniDict.ts`) — ~50 termes courants d'anamnèse en repli.

**Étendre** : remplacer/compléter `miniDict.ts` par un **FreeDict deu-fra** (licence GPL) converti en `{ de, fr }[]`. C'est un drop-in : aucune autre modification requise. Fichier ~2–8 Mo, reste 100 % hors-ligne.

## Voie 2 — Requête complexe (phrase / question)
Déclenchée quand la requête fait > 2 mots ou contient `? . !` (`isComplexQuery`).

### (a) IA locale — WebLLM (opt-in, hors-ligne après téléchargement)
- Paquet : `@mlc-ai/web-llm`, **importé dynamiquement** (`useWebLLM.ts`) → hors du bundle initial ; ne se charge qu'au clic « Activer l'IA locale ».
- Modèle par défaut : **`Qwen2.5-1.5B-Instruct-q4f16_1-MLC`** (bon compromis taille/qualité, allemand correct).
  - **Changer de modèle** : éditer `MODEL_ID` dans `src/features/dictionary/useWebLLM.ts` (ex. `Llama-3.2-3B-Instruct-q4f16_1-MLC` pour plus de qualité, ~2 Go ; `Qwen2.5-0.5B-...` pour plus léger).
- Requiert **WebGPU** (Chrome/Edge récents, Safari 18+). Sinon l'UI bascule automatiquement sur les deep-links.
- **Limite assumée** (cf. `ANALYSE_ITERATION2.md §7`) : un modèle 1–3 B est correct mais **en-deçà de ChatGPT** sur les nuances médicales. D'où la voie (b).

### (b) Deep-links gratuits sans clé (repli fiable — option B)
`src/lib/dictionary.ts › deepLinks` ouvre la requête dans DeepL, Reverso Context, ChatGPT, Google Traduction. Aucun compte/clé requis. **Ajouter/retirer** un service = éditer ce tableau.

## Pourquoi pas un « skill » Claude pour la config ?
Un skill Claude configure *mon* comportement, pas l'app à l'exécution pour l'utilisateur final. La configuration utile vit donc **dans le code** (ce fichier + les 3 points d'édition ci-dessus). Si tu veux malgré tout une UI de réglages in-app (choix moteur/modèle/langue cible), c'est un petit ajout — dis-le-moi.
