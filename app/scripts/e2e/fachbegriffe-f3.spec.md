# Preuve navigateur — Fachbegriffe F3 (AC-1 à AC-10, local)

Outil : `playwright-cli` headless (sessions nommées, profils en mémoire),
mesures depuis le DOM de l'app et IndexedDB (`indexedDB.open` sur la base
`fsp-cockpit-<uid>`), jamais via sonde `import("/src/…")`. Date : 26 sept. 2026.

Environnement (local uniquement, jamais le projet EU) :

- Supabase local (docker, projet `app`). Migrations 13 et 14 déjà présentes
  sur la base vivante : contrainte `progress_events_type_check` incluant
  `term.personal_created` / `term.personal_deleted`, table `public.ai_cache`
  existante. Elles avaient été appliquées par `psql` : absentes de
  `supabase_migrations.schema_migrations` (dernière entrée : `20260917000012`),
  sans incidence ici. Aucun `db reset`.
- Contenu : les `fachbegriff` publiés localement n'avaient pas `register`
  (0/2 266). Contenu de ce worktree republié sur la pile LOCALE
  (`publishContent.mjs`, version 9) → 1 354/2 265 termes avec `register`.
- `functions serve` lancé depuis ce worktree (montage du runtime vérifié :
  `doctopus-fachbegriffe-f3/app/supabase/functions`) avec un fichier d'env
  TEMPORAIRE hors dépôt (copie de `supabase/.env.ci` : `AI_CHAIN_BRIEF=mock:brief`,
  `AI_CHAIN_CHAT=mock:chat`, `AI_ALLOW_MOCK=1`, secrets Stripe factices).
- Compte de test local créé pour cette preuve (identifiants générés, gardés
  hors dépôt), passé premium par `grantFounder.mjs` pointé sur la pile locale.
  uid `7ff83627-…`.
- App : `npm run dev -- --port 5201 --strictPort` (founder) ; build public
  servi par `vite preview` sur le port 5202 (AC-9).

Captures dans le scratchpad de session (non committées) : `ac1-pill.png`,
`ac4c-mobile-pill.png`, `ac6-*-390.png`, `drill-personal-back.png`, `ac7-chat.png`.

| AC | Verdict |
|---|---|
| AC-1 | PASS (sur la fiche Fachwissen, voir écart) |
| AC-2 | PASS |
| AC-3 | PASS (bascule + doublon hors ligne sur 2 contextes) |
| AC-4 | PASS |
| AC-4b | PASS |
| AC-4c | PASS (« Asziten » injecté par la sonde, voir écart) ; bug B1 relevé |
| AC-6 | PASS |
| AC-7 (local) | PASS ; progressivité non démontrable avec le mock (1 fragment) |
| AC-8 | PASS |
| AC-9 | PASS |
| AC-10 (échantillon) | PASS sur le périmètre F3 |
| Carte perso sans explication | PASS |

## AC-1 — « Aszites » → pastille ★ + Expliquer → favori — PASS

Écart de parcours : sur `#/cas/case-leberzirrhose`, toutes les occurrences
d'« Aszites » sont des termes autoliés (`BUTTON`/`SPAN` cliquables, 4/4) : le
double-clic ouvre la carte de survol et ne sélectionne rien. La sélection a
donc été faite sur la fiche `#/fachwissen/fw-leberzirrhose`, où « Aszites »
figure en texte simple.

1. Double-clic sur « Aszites » → `getSelection()` = `Aszites` ; pastille :
   bouton `aria-label="Ajouter aux favoris : Aszites"` `aria-pressed=false`
   + bouton « Expliquer » (count 1).
2. Clic ★ → `[role=status]` = « Ajouté aux favoris · Ajouter à un deck… ».
3. IndexedDB `favorites` = `["fb-aszites"]`, `personal_terms` = `[]`.
4. `#/fachbegriffe` → onglet « ★ Favoris 1 » → liste : `Aszites` / « dass sich
   Wasser in meinem Bauch angesammelt hat ».

## AC-2 — « Belastungsdyspnoe » hors glossaire → carte créée, Favoris, drill, 2ᵉ contexte — PASS

1. `#/fachwissen/fw-herzinsuffizienz`, double-clic « Belastungsdyspnoe » (absent
   de `fachbegriffe.json`) → pastille `Ajouter aux favoris : Belastungsdyspnoe`.
2. ★ → `[role=status]` = « Carte créée ».
3. IndexedDB : `personal_terms` = `[{id:"pt-786b2615", term:"Belastungsdyspnoe",
   context:"Die Herzinsuffizienz ist ein klinisches …", explanation:"", state:"Neu"}]` ;
   `favorites` = `["fb-aszites","pt-786b2615"]`.
4. Favoris : `Aszites`, `Belastungsdyspnoe`. Lien « Drill · Favoris (2) » →
   `#/fachbegriffe/drill?deck=deck-favorites` : « 2 nouveaux », carte 2/2 =
   « Fachbegriff · Allgemein / Belastungsdyspnoe ».
5. 2ᵉ contexte (`-s=b`, profil frais, même compte) → connexion → IndexedDB :
   même `personal_terms` (`pt-786b2615`) et mêmes `favorites` ; onglet Favoris
   liste les deux termes.

## AC-3 — bascule du favori, un seul terme ; doublon hors ligne — PASS

1. Resélection de « Belastungsdyspnoe » → pastille `Retirer des favoris : …`
   `aria-pressed=true` → ★ → « Retiré des favoris » ; `favorites` =
   `["fb-aszites"]`, `personal_terms` inchangé (1 terme).
2. ★ à nouveau → « Ajouté aux favoris » (et non « Carte créée ») ;
   `personal_terms` toujours 1 terme.
3. Contextes a et b : `context.setOffline(true)` (`navigator.onLine` = false
   des deux côtés) ; chacun sélectionne « Knöchelödeme » et ★ → « Carte créée »
   des deux côtés, même id `pt-64f71663`.
4. `setOffline(false)` sur les deux, attente 8 s. IndexedDB a et b :
   `personal_terms` = `Knöchelödeme`, `Belastungsdyspnoe` (un seul
   Knöchelödeme chacun).
5. Serveur (`progress_events` du compte) : `term.personal_created pt-64f71663`
   ×2 et `term.favorited pt-64f71663` ×2. La projection converge vers un terme
   unique.

Remarque : `srs.dueDate` d'un terme créé hors ligne diffère entre appareils
(heure de création locale : `…924281` vs `…909678`) tant qu'il n'est pas noté.
Sans effet visible, il est « Neu » des deux côtés.

## AC-4 — resync complète du contenu, le terme personnel demeure — PASS

1. Changement de plan sur la base locale : `premium → pro` puis `pro →
   premium` (Realtime `subscriptions` → `loadEntitlements` → `contentLoader.sync({ full: true })`).
2. Réseau du contexte a : deux `GET /functions/v1/content?since=0 → 200`.
3. IndexedDB après coup : `personal_terms` = `Knöchelödeme`, `Belastungsdyspnoe`
   (intacts, SRS inchangé) ; `favorites` inchangés.

## AC-4b — note « Gut » au drill → même `dueDate` sur le 2ᵉ contexte — PASS

1. Drill Favoris, carte `Belastungsdyspnoe` → Révéler → « Gut ».
2. IndexedDB a : `srs = {state:"Zu wiederholen", interval:1, dueDate:1790475216729}`.
3. Contexte b (connexion après la note) : IndexedDB `personal_terms`
   `pt-786b2615` → `dueDate:1790475216729`, `interval:1`. Même valeur.
   La liste Favoris de b montre `↻` (à répéter) pour les deux termes.

## AC-4c — 390×844 tactile, appui long, « Asziten » → `fb-aszites` — PASS

Session `-s=m` : `--device="iPhone 15"` puis `resize 390 844` → `innerWidth`
390, `innerHeight` 844, `maxTouchPoints` 1, `(pointer:coarse)` true.
Appui long = CDP `Input.synthesizeTapGesture` (`duration:1000`,
`gestureSourceType:'touch'`).

1. Fiche `fw-leberzirrhose`, appui long sur « Aszites » → sélection `Aszites`,
   pastille + « Expliquer ».
2. « Asziten » n'existe nulle part dans le contenu : la sonde injecte un
   paragraphe de test `<p id="probe-injected">Seit zwei Wochen habe ich
   Asziten bemerkt.</p>` au milieu de `main`. Seule la présence du mot est
   simulée : la sélection, la pastille et l'étoile restent les vraies.
   Appui long → sélection `Asziten` → pastille `Retirer des favoris : Asziten`
   `aria-pressed=true` (résolu vers `fb-aszites`, déjà favori).
3. Tap ★ (bouton 44×44) → « Retiré des favoris » ; `favorites` sans
   `fb-aszites`. Tap ★ → « Ajouté aux favoris » ; `favorites` contient
   `fb-aszites`. Aucun terme personnel « Asziten » créé.
4. `document.documentElement.scrollWidth` = 390.

**Bug B1 (mineur, UI) : pastille hors écran quand la sélection est en haut du
viewport.** `src/components/SelectionExplainer.tsx`, conteneur de la pastille :
`top: Math.max(8, anchor.y - 8)` combiné à `transform: translate(-50%, -100%)`.
Le plancher de 8 px s'applique AVANT la translation de −100 % : pour une
sélection à moins d'environ 52 px du haut, la pastille sort au-dessus du
viewport. Repro (390×844) : sélection « Asziten » en haut de `main`
(rect.top ≈ 21 px) → bouton ★ `getBoundingClientRect()` =
`{top:-38, bottom:6, height:44}`. Le tap ne l'atteint pas et ferme la bulle.

## AC-6 — `TermRegister` sur chaque surface, 390 px sans débordement — PASS

Session mobile 390×844, mesures DOM :

| Surface | Mesure | `scrollWidth` |
|---|---|---|
| Carte de survol (tap sur « Aszites » lié, `#/cas/case-leberzirrhose`) | `[role=dialog]` : « Patient « dass sich Wasser… » / Vorstellung « Bildgebend bestätigte sich ein mittelgroßer Aszites… » / Anamnese » | 390 |
| Fiche (tiroir, « Voir la fiche → ») | « Bedeutung (patientengerecht) / Patient … / Vorstellung … / Anamnese » | 390 |
| Liste (`#/fachbegriffe`, recherche « Aszites ») | ligne `Aszites` / « dass sich Wasser in meinem Bauch angesammelt hat » (`register.patient`) | 390 |
| Panneau du cas (`#/cas/case-leberzirrhose`) | « Drill ces termes / Aszites / dass sich Wasser in meinem Bauch angesammelt hat » | 390 |
| Dos du drill (`?case=case-leberzirrhose`, Terme → sens) | « Abdomen / mein Bauch / Wo genau am Bauch tut es am meisten weh? / Medizin: … » (patient + question d'anamnèse) | 390 |

Au bureau, le dos du drill pour `Aszites` montre « dass sich Wasser… » + « Ist
Ihr Bauch in letzter Zeit dicker geworden… ». Un terme sans `register`
(« A. axillaris ») montre sa définition simple.

## Carte personnelle sans explication (drill) — PASS

- « Terme → sens », `Belastungsdyspnoe` : recto = le terme ; dos = libellé
  « Contexte » + phrase source (« Die Herzinsuffizienz ist ein klinisches
  Syndrom… »). Jamais de face vide.
- « Sens → terme », `Knöchelödeme` : recto = contexte masqué (« …Gabapentinoide
  verursachen … ohne Dyspnoe… ») ; le mot est absent du recto
  (`includes('Knöchelödeme')` = false) ; dos = `Knöchelödeme`.

## AC-7 (local) — sans clé navigateur : Expliquer et Doctopus via la fonction `ai` — PASS

`localStorage` purgé des clés `doctopus-key*`.

1. Fiche `fw-herzinsuffizienz`, sélection « Leistungsknick » (hors glossaire)
   → « Expliquer ». Réseau : un seul `POST /functions/v1/ai` → `200
   text/event-stream`. Bulle : « « Leistungsknick » · IA · mock:brief ».
2. Doctopus (bouton flottant) → « Was bedeutet Leistungsknick? » (Ctrl+↵).
   Réseau : un seul `POST /functions/v1/ai` (aucun appel fournisseur). Fil :
   « Was bedeutet Leistungsknick? / Doctopus / mock:chat ».
3. Progressivité : le mock émet un seul fragment (`mock:chat`) puis `[DONE]`
   (`_shared/aiChain.ts`, `mockStream`). Le MutationObserver voit 3 rendus,
   le texte final au 3ᵉ (les 2 premiers = question + état de chargement).
   Réponse en SSE, lue par `serverStream`. Un rendu intermédiaire DE
   CONTENU n'est pas démontrable avec ce mock. La progressivité reste à
   observer en prod avec la vraie chaîne (volet prod d'AC-7, après T-F3).

## AC-8 — fonction coupée : repli clé, conversation épinglée, message honnête — PASS

`functions serve` arrêté (`POST /functions/v1/ai` → 503). Clé de repli
factice posée dans `localStorage` (`doctopus-key:<uid>`, fournisseur `groq`) ;
`https://api.groq.com/**` routé par `playwright-cli route` vers un bouchon
JSON (`stub:cle-navigateur`). Aucune vraie clé n'a été utilisée.

1. Conversation commencée via le serveur (AC-7, `via:'server'`) → 2ᵉ question
   « Und wie frage ich danach? » : réseau = `POST /functions/v1/ai` seulement
   (aucun appel Groq), message « IA serveur indisponible pour le moment.
   Réessaie dans un instant. » Pas de bascule.
2. Expliquer « Füllungsdrücke » : `POST /functions/v1/ai` (503) puis `POST
   https://api.groq.com/openai/v1/chat/completions` → bulle « IA ·
   stub:cle-navigateur ».
3. Nouvelle conversation « Was ist Orthopnoe? » : `…/ai` (503) puis Groq →
   « stub:cle-navigateur ».
4. Clé retirée : Expliquer « Stockwerke » → `…/ai` (503) seul → bulle « IA
   serveur indisponible pour le moment. Réessaie dans un instant, ou ajoute une
   clé de repli dans les réglages Doctopus. » ; nouvelle conversation « Was ist
   Nykturie? » → même message honnête.

## AC-9 — build `VITE_AUTH_MODE=public` : clé seule, aucun appel à `/functions/v1/ai` — PASS

`VITE_AUTH_MODE=public npx vite build --outDir <scratchpad>` (exit 0),
servi sur 5202, session `-s=p` sans compte.

1. Sans clé : Expliquer « Missverhältnis » (`fw-khk`, hors glossaire) → aucune
   requête IA ; bulle « IA indisponible : connecte-toi (compte premium) ou
   ajoute une clé de repli dans les réglages Doctopus. »
2. Clé factice (`doctopus-key`, `groq`) + bouchon Groq : Expliquer → une seule
   requête `POST api.groq.com/…` → « stub:cle-navigateur » ; Doctopus « Was
   ist KHK? » → une seule requête Groq → « stub:cle-navigateur ».
3. Toutes les requêtes de la session : 0 vers `functions/v1/ai`. Seule
   fonction appelée : `functions/v1/content` (×1).

Observation : en mode public, le message sans clé dit « connecte-toi (compte
premium) », alors que le serveur IA n'est jamais utilisé dans ce mode
(`serverAiAvailable()` exige `AUTH_MODE === 'founder'`). Se connecter n'y
débloque donc pas l'IA. Texte à ajuster au mode (`SelectionExplainer.tsx`,
branche `!canAskAi()`).

## AC-10 — échantillon charte — PASS (périmètre F3)

- Cibles : ★ de la pastille 44×44 (bureau et 390 px) ; « Expliquer » 95×44 ;
  boutons de notation du drill 59 px de haut.
- Mouvement : pastille `animation-name: fade-in-fast`, `0.15s` (≤ 150 ms).
- `prefers-reduced-motion: reduce` (`page.emulateMedia`) : pastille
  `animation-name: none` ; bouton flottant Doctopus `float` ramené à `1e-06s`
  ×1 (neutralisation globale).
- Hors périmètre F3 : les boutons d'en-tête du panneau Doctopus (Réglages,
  Fermer) font 32×32 (`h-8 w-8`, `components/Doctopus.tsx`, commit `6aaf86e6`
  de juillet), sous la cible de 44 px.

## Anomalies relevées (aucun code modifié)

- **B1** : pastille hors écran pour une sélection proche du haut du viewport
  (voir AC-4c).
- Observation : message sans clé en mode public (voir AC-9).
- Contenu : `fb-aszites` porte `"sp":"Psychiatrie"`. Le drill affiche
  « Fachbegriff · Psychiatrie » pour Aszites. Spécialité erronée
  (`src/data/fachbegriffe.json`), antérieure à F3.
- Parcours AC-1 : dans les pages de cas, les termes du glossaire sont tous
  autoliés, donc la sélection par double-clic d'un terme connu ne se fait que
  sur les pages où il n'est pas lié (fiche Fachwissen).
- Environnement : migrations 13/14 présentes sur la base mais absentes de
  l'historique `schema_migrations` local (appliquées par `psql`).
