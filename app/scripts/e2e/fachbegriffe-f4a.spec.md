# Preuve navigateur — Fachbegriffe F4a (AC-1 à AC-12, local)

Outil : `playwright-cli` headless (sessions nommées, profils en mémoire),
mesures depuis le DOM de l'app et IndexedDB (`indexedDB.open` sur
`fsp-cockpit-<uid>`), jamais via sonde `import("/src/…")`. Date : 29 sept. 2026.
Branche `feat/fachbegriffe-f4-clarte` @ 4c848cf, worktree
`doctopus-fachbegriffe-f4`.

Le plan (`docs/superpowers/plans/2026-09-28-fachbegriffe-f4a-clarte.md`, tâche
E2) cible `case-leberzirrhose` / `Aszites` / `Belastungsdyspnoe` : ces AC ont
été adaptés à l'état réel du dépôt (corrections postérieures au plan) —
`case-gastroenteritis`, mots hors glossaire tirés de son texte
(`Malermeister`, `Küche`, `Kindergartens`). Le fond de chaque AC est
inchangé.

## Environnement (local uniquement, jamais le projet EU, jamais `db reset`)

- `supabase start` déjà en service (docker : db/auth/rest/kong/storage/
  realtime/pg_meta/inbucket/studio, 4 j d'uptime). Migrations vérifiées
  directement en base (la table `supabase_migrations.schema_migrations`
  s'arrête à `20260917000012`, comme en F3 — sans incidence) : contrainte
  `progress_events_type_check` inclut `term.personal_created` /
  `term.personal_deleted` / `term.personal_updated`, table `public.ai_cache`
  présente, contrainte `progress_events_payload_size` présente (migration 16).
- Contenu republié sur la pile locale : `node scripts/publishContent.mjs`
  (`SUPABASE_URL=http://127.0.0.1:54321`, service role locale) → version 10,
  438 items modifiés/nouveaux, 2 687 au total (130 cas, 2 265 fachbegriffe,
  Free = 12 cas / 12 fiches / 9 Aufklärungen / 1 203 termes).
- `npx supabase functions serve --env-file supabase/.env` depuis ce worktree
  (`.env` local : `AI_ALLOW_MOCK=1`, `AI_CHAIN_BRIEF=mock:brief`). Relancé une
  fois en cours de preuve après des `CPU time hard limit reached` /
  `WORKER_LIMIT` côté runtime edge local (isolats Deno saturés par les
  requêtes répétées de la session — un plafond de la machine de dev, pas un
  comportement de l'app) ; après relance, AC-7 (pull 2ᵉ contexte) est passé.
- Compte de test créé pour cette preuve via l'écran fondateur (e-mail/mot de
  passe), passé premium par `node scripts/grantFounder.mjs` pointé sur la
  pile locale. Identifiants gardés hors dépôt
  (`scratchpad/f4a-test-account.txt` du scratchpad de session). uid
  `d2e6a7f0-7b88-49d2-9f5f-053b3989a99c`.
- App fondateur : `VITE_AUTH_MODE=founder npm run dev -- --port 5180
  --strictPort`. Build public (AC-11) : `VITE_AUTH_MODE=public npm run
  build` puis `npx vite preview --port 5181 --strictPort` (anonyme, tier
  Free). Les deux arrêtés en fin de preuve (`supabase functions serve`
  compris).
- Deuxième contexte navigateur (AC-7) : session `playwright-cli` distincte
  (`-s=f4b`), même compte, connexion par e-mail/mot de passe (pas de lien
  magique en mode fondateur).

| AC | Verdict |
|---|---|
| AC-1/AC-2 (adapté) | PASS |
| AC-3 | PASS |
| AC-4 | PASS |
| AC-5 | PASS |
| AC-6 | PASS |
| AC-7 | PASS (après relance du runtime edge local) |
| AC-8 | PASS |
| AC-9 | PASS |
| AC-11 (local) | PASS |
| AC-12 | PASS |

## AC-1/AC-2 (adapté) — panneau du cas `case-gastroenteritis` : aucun terme générique/homonyme ; `?case=` du drill = même ensemble — PASS

Le plan visait `case-leberzirrhose`/`Fieber` ; adapté à `case-gastroenteritis`
sur consigne (dispense de « Erscheint in Fällen » sur `Fieber`, hors
périmètre adapté).

1. `#/cas/case-gastroenteritis` → panneau « Fachbegriffe du cas (37) » ·
   « 0 dus · 37 nouveaux ». Extraction DOM (`ul li span.font-semibold`) : 37
   termes — `Gewichtsverlust, Dehydratation, infektiös, Meteorismus,
   Gastroenteritis, diffus, Parasit, Antiemetikum, Defäkation, Hypokaliämie,
   Resistenz, Diuretika, lokalisiert, viruzid, Sekretion, Kolonkarzinom,
   Laktose, Laktoseintoleranz, Oligurie, Hygiene, Zyste, Eosinophilie,
   Hyponatriämie, metabolisch, Azidose, Prostatahyperplasie, Koloskopie,
   Niereninsuffizienz, Antigen, Hypotonie, Konsistenz, Sanierung, rektal,
   sekundär, Tachykardie, Exsikkose, Hepatitis`.
2. Recoupement avec `src/data/genericTerms.json` (résolu en termes via
   `fachbegriffe.json`) et `src/data/homonymTerms.json` : **zéro**
   intersection avec les 37 termes du panneau. Ni « Fontanelle » ni
   « Stärke » n'y figurent (les deux sont absents du cas).
3. « Drill ces termes » → `#/fachbegriffe/drill?case=case-gastroenteritis`,
   « 0 dus · 10 nouveaux · budget du jour 10 ». Le budget quotidien plafonne
   la SESSION à 10, mais `CaseTermsPanel.tsx` et `DrillPage.tsx` importent la
   même fonction `termsOfCase()` (`src/lib/collections/caseTerms.ts`) pour
   construire l'ensemble éligible : même ensemble par construction, le drill
   en tire un sous-échantillon journalier — pas une liste différente.

## AC-3 — fiche de `Hepatitis` (registre complet) : ordre Bedeutung → Définition complète (fermée) → Dans l'entretien — PASS

1. Ouverture de la fiche `Hepatitis` (case-gastroenteritis) : DOM
   `[data-term-sheet="fb-hepatitis"]` → ordre des enfants `H4:Bedeutung`,
   `SUMMARY:Définition complète` (`<details open=false>`), `H4:Dans
   l'entretien`, puis `LI[data-usage]` dans l'ordre `patient, anamnese,
   vorstellung`.
2. Sur `Gastroenteritis` (registre présent, `definitionDetailed` vide pour ce
   terme) : ordre `Bedeutung` → `Dans l'entretien` directement — le bloc
   « Définition complète » est absent par construction
   (`{!compact && term.definitionDetailed && <details>…}` dans
   `TermSheet.tsx`), pas un défaut d'ordre.
3. `grep -rni --exclude='*.test.tsx' patientengerecht app/src/components
   app/src/features` → exit 1 (aucune occurrence).

## AC-4 — sélection d'un mot hors glossaire (`Malermeister`) → pastille → mini-fiche — PASS

1. Sélection DOM (Range API + `selectionchange`) sur « Malermeister »
   (`#/cas/case-gastroenteritis`, absent de `fachbegriffe.json`) → pastille
   `aria-label="Nouvelle carte : Malermeister"` + bouton « Expliquer ».
2. Clic ☆ → dialogue « Nouvelle carte » : `Mot` = Malermeister (lecture
   seule), `Bedeutung` = `mock:brief` (texte brut, éditable, mock IA locale),
   `Contexte` = **une** phrase (« Berufsanamnese als Pflichtfrage: Der
   Patient ist als **Malermeister** nicht vom Tätigkeitsverbot betroffen,
   … ») avec `<mark>` sur le mot.
3. Bedeutung vidée → bouton « Créer » `disabled=true`.
4. Fermer (✕) sans créer → IndexedDB `progress_events` : 0 avant, 0 après
   (aucun événement émis par une fermeture sans création).

## AC-5 — sélection d'une phrase de 7 mots → pastilles → choix d'un mot — PASS

1. Sélection de « seine Ehefrau arbeitet jedoch in der Küche eines
   Kindergartens » (7 mots > `CHIP_THRESHOLD`) → pastille « Nouvelle carte : … »
   → dialogue : « Touche le mot à garder » + 9 boutons-mots (`seine`,
   `Ehefrau`, `arbeitet`, `jedoch`, `in`, `der`, `Küche`, `eines`,
   `Kindergartens`).
2. Clic sur « Küche » → `Mot` = Küche, `Bedeutung` reprend `mock:brief`,
   `Contexte` = la phrase entière inchangée, `<mark>` déplacé sur « Küche ».

## AC-6 — ★ sur un terme du glossaire → confirmation, « Voir la carte », « Changer de deck » — PASS

1. ★ sur `Antiemetikum` (glossaire, panneau du cas) → `[role=status]` =
   « Rangée dans **Favoris** » + miniature `CardFlip` (`data-card-flip="recto"`)
   + boutons « Voir la carte » / « Changer de deck ».
2. « Voir la carte » → `data-card-flip` passe à `"verso"`.
3. Deck manuel créé au préalable (« Deck F4a Test », via `#/fachbegriffe` →
   « + » → Nom du deck → Liste manuelle → Créer). ★ sur `Resistenz` →
   confirmation → « Changer de deck » liste `Deck F4a Test` → clic → IndexedDB :
   `favorites` ne contient plus `fb-resistenz` ; `deck_terms` contient
   `{deckId: d1fd7871-…, termId: "fb-resistenz"}` — déplacé, pas dupliqué (un
   seul deck après le déplacement, conforme à D6 : « Changer de deck » =
   retiré de l'ancien + ajouté au nouveau, jamais les deux).

## AC-7 — carte personnelle : Bedeutung modifiable, mot non ; sync 2ᵉ contexte — PASS

1. Carte personnelle créée (`pt-9879dab7`, terme « Malermeister »,
   Bedeutung initiale `mock:brief`). Fiche (`#/fachbegriffe?deck=deck-favorites`)
   → bouton « Modifier la Bedeutung » → nouveau texte « Chef peintre, dirige
   les travaux de peinture. » → « Enregistrer » → IndexedDB `personal_terms`
   mis à jour immédiatement.
2. `TermSheet.tsx` ne rend aucun champ pour `term.term` (le titre `<h3>` est
   du texte, jamais un input) : le mot d'une carte personnelle n'a pas de
   champ, seule la Bedeutung a un bouton « Modifier ».
3. 2ᵉ contexte navigateur, même compte (`f4a-test@example.local`), connexion
   par mot de passe (uid identique, même base Dexie `fsp-cockpit-d2e6a7f0-…`).
   Après un rechargement déclenchant `startSyncLoop` (`flush` puis `pull`),
   `GET /functions/v1/events?since=…` a rapatrié la chaîne complète des
   événements du compte, y compris les deux `term.personal_updated`
   (`mock:brief` puis la Bedeutung modifiée) ; `rebuildProjections()` a
   reconstruit `personal_terms` côté 2ᵉ contexte avec la **même** Bedeutung
   finale (« Chef peintre, dirige les travaux de peinture. »). Écart
   d'environnement : la première tentative a échoué avec `WORKER_LIMIT` côté
   `functions serve` (isolat Deno saturé) — corrigée en relançant le
   processus ; sans lien avec le code de l'app (côté client, la requête
   réseau a échoué proprement, sans corrompre l'état local).
4. « Ancienne carte sans Bedeutung → à compléter » vérifié au niveau du code
   (`TermSheet.tsx` : `bedeutung ? … : 'à compléter'`, style italique gris) —
   non reproductible par l'UI actuelle (« Créer » exige une Bedeutung non
   vide depuis la mini-fiche), c'est une branche défensive pour des données
   plus anciennes.

## AC-8 — « Carte » dans la fiche latérale : recto (terme) / verso (fiche), identique au drill — PASS

1. Fiche `Hepatitis` (glossaire) → bouton « Carte » → `aside
   [data-card-flip="recto"]`, contenu : « Fachbegriff · Gastroenterologie /
   Hepatitis / /ˌhepaˈtiːtɪs/ / Révéler ».
2. « Révéler » → `data-card-flip="verso"`, contenu : Bedeutung
   « Leberentzündung », « Définition complète · Medizin: Entzündung… ».
3. Même composant que le drill : `GlossaryDrawer.tsx` et `DrillPage.tsx`
   utilisent tous deux `<CardFlip … direction="term2simple" …>` — recto/verso
   identiques par construction (DrillPage : bouton « Terme → sens »).

## AC-9 — suppression par icône + Annuler (5 s), expiration, `pagehide` — PASS

1. Carte personnelle « Malermeister » (`pt-9879dab7`) : icône corbeille →
   `[role=status]` = « Carte « Malermeister » supprimée · Annuler » ; la
   carte disparaît immédiatement des listes (`count=0` sur
   `main button:has-text("Malermeister")`).
2. **Sans Annuler**, après le délai (~5 s, ici dépassé entre deux appels
   playwright-cli) : `progress_events` contient `term.personal_deleted
   pt-9879dab7`, `personal_terms` ne contient plus `pt-9879dab7` — l'événement
   n'est émis qu'à l'expiration, pas à l'appui sur la corbeille.
3. **Avec Annuler** (carte `pt-bb8242ee`, « Kindergartens ») : corbeille →
   masquée (`hiddenWhilePending=1` implicite, `count=0`) → « Annuler » dans le
   même passage de script (délai < 1 s, donc dans la fenêtre de 5 s) → carte
   revenue (`restoredCount=1`). `progress_events` : **aucun**
   `term.personal_deleted` pour `pt-bb8242ee` (seul celui de `pt-9879dab7`
   existe) — SRS et decks intacts.
4. **`pagehide`** (carte `pt-0518cd4c`, « Küche ») : corbeille → immédiatement
   `page.close({ runBeforeUnload: true })` (déclenche `pagehide`, écouté par
   `pendingDeletion.ts` → `flushDeletions()`) → nouvel onglet dans la même
   session (même profil, IndexedDB partagée) → `personal_terms` ne contient
   plus `pt-0518cd4c` : la suppression a été émise par le `pagehide`, pas
   seulement par l'expiration du minuteur (le minuteur n'aurait pas eu le
   temps de courir, l'appel étant synchrone à la fermeture).

## AC-11 (local) — build `VITE_AUTH_MODE=public` : pas d'appel `/functions/v1/ai`, pas de clé → « Écris la signification » — PASS

1. `VITE_AUTH_MODE=public npm run build` (1 min 31, succès) → `npx vite
   preview --port 5181 --strictPort`. Session anonyme (tier Free) sur
   `#/cas/case-pneumonie` (cas Free, `case-gastroenteritis` n'en fait pas
   partie).
2. Sélection d'un mot → pastille « Nouvelle carte : … » → clic → dialogue
   « Nouvelle carte » : `Bedeutung` vide, `placeholder="Écris la
   signification"`, « Créer » `disabled=true`.
3. Journal réseau de la session (`playwright-cli requests`) : **zéro**
   requête vers `/functions/v1/*` (ai comme content) pendant tout le
   parcours — cohérent avec `NewCardSheet.tsx` (`if (asked.current !== null
   || !canAskAi()) { … return; }`, aucun `askBedeutung()` déclenché quand
   `canAskAi()` est faux).

## AC-12 — 390×844 : `scrollWidth <= 390` sur tiroir, mini-fiche, confirmation, carte au survol — PASS

Viewport `390×844` (`page.setViewportSize`), `#/cas/case-gastroenteritis`.

| Surface | `document.documentElement.scrollWidth` |
|---|---|
| Page de base | 390 |
| Tiroir (`GlossaryDrawer`, fiche `Hepatitis`) | 390 |
| Mini-fiche (`NewCardSheet`, sélection « Malermeister ») | 390 |
| Confirmation (`CardToast`, ★ sur `Meteorismus`) | 390 |
| Carte au survol (hover-card, focus programmatique sur le lien autolié
  « Gastroenteritis ») | 390 |

Aucun débordement horizontal mesuré sur les quatre surfaces.

## Écarts d'environnement (non liés au code)

- Le runtime `supabase functions serve` local a atteint `CPU time hard
  limit reached` / `WORKER_LIMIT` après une série de requêtes répétées
  (isolats Deno non recyclés) ; un simple redémarrage du processus a suffi.
  Documenté ici pour la prochaine preuve : redémarrer `functions serve`
  entre les blocs AC-6/AC-7 sur une session longue.
