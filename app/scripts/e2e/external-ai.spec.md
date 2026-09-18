# Preuve navigateur — Simuler avec ton IA (AC-4 à AC-7) — playwright-cli

Date : 2026-09-19. Worktree `doctopus-external-ai`, branche `feat/external-ai`.
Compte de test : `anna@test.local` (fondateur, plan premium actif). Dev server
`npm run dev -- --port 5188 --strictPort`.

## Environnement — écarts par rapport à la consigne

- Le `.env` du worktree pointe en réalité vers **Supabase local**
  (`http://127.0.0.1:54321`), pas Supabase EU, malgré `VITE_AUTH_MODE=founder`.
  Les Edge Functions locales (`supabase_edge_runtime_app` et 4 autres conteneurs)
  étaient arrêtées au démarrage → `content?since=0` renvoyait `503`, l'app
  restait bloquée sur « Doctopus a besoin d'une connexion pour le premier
  chargement ». Correctif appliqué : `npx supabase functions serve --env-file
  supabase/.env` en arrière-plan (conforme à la règle « jamais `--no-verify-jwt` »
  du CLAUDE.md du projet). Après ce correctif, connexion et synchro du contenu
  normales (~10 s).
- Le cache Vite (`node_modules/.vite`) contenait des chemins absolus de
  l'**autre worktree** (`.../Claude FSP/app/node_modules/...`), provoquant des
  404/403 sur les polices (`ibm-plex-sans`, `bricolage-grotesque`, `ibm-plex-mono`).
  Supprimé (`rm -rf node_modules/.vite`) avant de relancer le serveur — sans
  incidence sur les critères fonctionnels ci-dessous, mais à signaler : rendu
  visuel avec police système de repli tant que le cache n'est pas purgé.

## AC-5 — les 4 points d'entrée ouvrent la feuille — PASS

Cas `case-ulcus`, dialogue `role=dialog[aria-label="Simuler avec ton IA"]`.

1. **Fiche du cas** (`/#/cas/case-ulcus`) — bouton « Simuler avec ton IA »
   (`CaseDetailPage.tsx`) → dialogue ouvert. Capture `ac5-fiche-cas.png`.
2. **Pré-simulation** (`/#/simulation/case-ulcus/pre`) — bouton « Simuler avec
   ton IA » (`SimulationSetup.tsx`) → dialogue ouvert. Capture `ac5-presim.png`.
3. **Runner, simulation en cours** (`/#/simulation/case-ulcus/run?teil=anamnese`,
   entré via « Anamnese seule ») — chip « IA » (title="Continuer ou rejouer ce
   cas avec ton IA") → dialogue ouvert. Capture `ac5-runner.png`.
4. **Écran de résultat** (bilan après « Terminer la partie ✓ » → grille
   d'évaluation → « Valider la partie ✓ » → arrivée sur le bilan, cas sous 60 %
   → « Encore un effort ») — bouton « Rejouer avec ton IA » → dialogue ouvert.
   Capture `ac5-resultat.png`.

Les 4 chemins mènent bien au même composant `ExternalAiSheet`, préchargé avec
le cas courant (`c.name` affiché dans l'en-tête du dialogue à chaque fois).

## AC-4 / AC-7 — lancement ChatGPT / Gemini, presse-papiers, toast

Stub posé avant chaque clic (`window.open`, `navigator.clipboard.writeText`).
Sur `/#/cas/case-ulcus`, cible **ChatGPT**, portée **« Examen + feedback »**
(défauts déjà sélectionnés au premier chargement de la feuille).

### FAIL (attendu) — `__opened` ne commence pas par `?q=` pour ChatGPT

- Étapes : ouvrir la feuille, garder ChatGPT + Examen+feedback (défauts),
  cliquer « Ouvrir dans ChatGPT ».
- Attendu (énoncé de tâche) : `window.__opened` commence par
  `https://chatgpt.com/?q=` et l'URL décodée contient « Nenne nie ».
- Obtenu : `window.__opened === "https://chatgpt.com/"` (20 caractères, **pas**
  de `?q=`). `window.__copied` contient bien `# Teil 3 – Oberärztin/Oberarzt`
  et fait **15 826 caractères** (> 5 000 attendu, PASS pour cette partie).
  Toast affiché : **« Prompt copié — colle-le dans ChatGPT. »**
- Cause : ce n'est pas un bug — c'est le comportement documenté dans le code
  (`targets.ts` commentaire en tête de fichier, et `ExternalAiSheet.tsx` lignes
  13-16) : `buildLaunchUrl` compare la longueur de l'URL **encodée** à
  `PREFILL_MAX = 6000` (`prompt.ts:30`) ; pour `case-ulcus` en portée
  « Examen + feedback », le prompt réel fait 15 826 caractères → l'URL encodée
  dépasse largement 6 000 → `prefilled: false` → `open()` reçoit `t.base`
  (`https://chatgpt.com/`) sans `?q=`. Le critère de l'énoncé de tâche décrit
  le chemin rare où le prompt tiendrait dans l'URL ; avec le contenu réel du
  cas testé, ce chemin ne se produit jamais. **Écart entre le critère attendu
  et le comportement réel/documenté**, pas une régression : à faire confirmer
  avec l'auteur du critère plutôt qu'à « corriger » le code.
- Capture du toast : `ac4-chatgpt-toast.png`.
- **Décision coordinateur** : PASS au regard de la spec amendée (D7, commits
  `e6fe662`/`65590c2` : « presse-papiers = flux normal », préremplissage
  seulement si l'URL encodée ≤ `PREFILL_MAX`). Le critère « `?q=` » du plan
  datait d'avant D7 ; le flux réel à prouver est : ouverture de la cible +
  prompt intégral copié + toast juste — ce qui est prouvé ici.

### PASS — Gemini

- Cible Gemini sélectionnée, clic « Ouvrir dans Gemini ».
- `window.__opened === "https://gemini.google.com/app"` (exact, conforme —
  Gemini n'a pas de paramètre de préremplissage, `targets.ts:21`).
- `window.__copied` rempli (15 826 caractères, identique au prompt ChatGPT :
  la portée/langue n'avaient pas changé entre les deux clics).
- Toast : **« Prompt copié — colle-le dans Gemini. »**
- PASS intégral.

## Mobile (390×844) — PASS

Feuille ouverte (relancée sur `/#/cas/case-ulcus`), viewport redimensionné à
390×844 : `document.documentElement.scrollWidth === 390 ===
document.documentElement.clientWidth` → aucun débordement horizontal.
Capture `ac-mobile-sheet.png`.

## AC-6 — carte de retour + auto-évaluation + badge historique — PASS

Séquence complète, un seul cas (`case-ulcus`, mode « Anamnese seule », cible
Gemini, portée « Examen + feedback », trace posée par le clic « Ouvrir dans
Gemini » de la section précédente) :

1. Simulation courte réellement jouée dans le runner (pas seulement simulée
   par stub) : `/#/simulation/case-ulcus/run?teil=anamnese` → « Terminer la
   partie ✓ » → grille d'évaluation → « Valider la partie ✓ » → bilan
   (« Encore un effort · Ulcus ventriculi · score moyen 26 % »).
2. Retour `/#/` (même onglet) : texte DOM exact —
   **« Tu as simulé Ulcus ventriculi avec Gemini — comment ça s'est passé ? »**
   avec 3 boutons **« Évaluer »**, **« Pas maintenant »**, **« Ce n'était pas
   une simulation »**.
3. Clic **« Pas maintenant »** → carte disparaît (`innerText` ne contient plus
   « Simulation avec ton IA »). `reload()` dans le **même onglet** (donc même
   `sessionStorage`) : carte reste absente — conforme (`snoozeKey` en
   `sessionStorage`, pas un simple contournement).
4. Nouvel onglet (`tab-new`, nouveau contexte, `sessionStorage` vide) sur
   `/#/` : la carte **revient** — conforme (trace toujours < 12 h en `meta`
   Dexie, snooze scoped à l'ancien onglet uniquement).
5. Clic **« Évaluer »** → grille « Évaluation — Anamnese » → « Valider la
   partie ✓ » → grille **« Évaluation — Fallvorstellung »** → « Valider la
   partie ✓ » ×2 → carte disparue immédiatement après le second « Valider ».
   *Remarque annexe (pas un critère testé) : les deux grilles affichent le
   même intitulé de checklist de contenu (Anamnese) — à vérifier si voulu ou
   copié-collé, indépendamment de ce test.*
6. `/#/simulation` (SimulationHub, section « Simulations récentes ») affiche :
   **« 26 % · Ulcus ventriculi · IA externe · Gemini · 19/09/2026 · Complète
   (Anamnese, Fallvorstellung) · Rejouer »** — badge conforme au libellé
   `IA externe{ ` · ${label}`}` de `SimulationHub.tsx:56`.
7. Vérification directe en IndexedDB (`indexedDB.open` + curseur sur le store
   `simulations`, hors API `db` de l'app pour rester dans le sandbox
   `page.evaluate`) : un enregistrement avec
   `mode: "external-ai"`, `externalTarget: "gemini"`, `scope: "full"`,
   `passed: false`, parts `anamnese` + `fallvorstellung` toutes deux présentes.
   Confirme la persistance Dexie sans passer uniquement par le DOM.

## Console et réseau

Erreurs JS relevées sur l'ensemble du parcours (hors bruit d'environnement
documenté ci-dessus — polices d'un autre worktree, `favicon.ico` 404,
React DevTools info, `content?since=0` 503 avant démarrage des Edge
Functions) : **aucune** erreur applicative. Seuls avertissements : React
Router "Future Flag" (v7_startTransition) — cosmétique, sans rapport avec la
feature testée, et un `[entitlements] realtime CLOSED` isolé (reconnexion
normale du canal Realtime, suivi d'un `SUBSCRIBED` après resynchronisation).

## Résumé

| AC | Statut |
|----|--------|
| AC-5 (4 points d'entrée) | PASS |
| AC-4 ChatGPT `?q=` + « Nenne nie » | **FAIL** — comportement documenté (PREFILL_MAX dépassé avec un prompt réel), pas une régression ; presse-papiers et toast conformes |
| AC-4/AC-7 Gemini | PASS |
| Mobile (390×844, pas de débordement) | PASS |
| AC-6 (carte, snooze, évaluation, badge, Dexie) | PASS |
| Console/réseau | Aucune erreur applicative ; bruit d'environnement documenté |

## Non vérifié

- **Claude, Perplexity, Grok** : non testés au clic (seuls ChatGPT et Gemini
  demandés par la consigne). Code lu (`targets.ts`) : Claude et Perplexity ont
  un `prefill` avec la même limite `PREFILL_MAX`, donc probablement même
  écart que ChatGPT avec un prompt réel de 15 k caractères ; à confirmer par
  un test dédié si ce point devient bloquant.
- **Portée « Anamnèse seule »** pour AC-4 : non testée — le prompt y est plus
  court et pourrait éventuellement passer sous `PREFILL_MAX` (6000) pour
  certains cas plus courts que `case-ulcus`, ce qui inverserait le résultat de
  la section « FAIL (attendu) » ci-dessus pour cette portée précise.
- **Reprise après fermeture complète du navigateur** (persistance `meta`
  Dexie au-delà de 12 h) : non testée, hors du délai du test.
- Le worktree n'ayant pas de `.superpowers/teams/<slug>/state.md`, ce rapport
  n'est pas rattaché à un pipeline nommé — livré directement en réponse à la
  consigne reçue.
