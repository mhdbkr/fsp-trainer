# Fachbegriffe rafraîchi — F3 : ★ depuis « Expliquer », double registre, IA serveur gratuite

Date : 2026-09-25 · Statut : red-team appliqué (12 constats), à valider par la direction · Epic : #4 (clôture) · Chantier ADR-0015 n° 2 (suite de F2b PR #43)

## 1. Intention

Ce que la direction veut **surtout** : mettre un mot en favori **depuis la bulle « Expliquer »**, qu'il soit dans le glossaire ou non. S'y ajoutent :
- le **double registre** (Vorstellung / Anamnese, prêt à dire), partout où un terme s'affiche ;
- une IA **fiable au quotidien** pour Doctopus et « Expliquer », sans clé à coller dans chaque navigateur.

Écartés (direction, 25 sept.) : notes pré-générées par cas (~1 500) → suite possible si le manque se fait sentir ; drill dans les deux sens.

## 2. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| D1 | Bulle « Expliquer » : bouton **★ à côté d'« Expliquer »**, dès l'apparition de la pastille (avant toute explication) | le geste demandé ; zéro étape intermédiaire |
| D2 | Sélection = terme du glossaire (résolution exacte `exactLookup`, + formes fléchies simples `e/en/s/n` comme l'autolink) → ★ = `toggleFavorite(id, { caseId? })` (F1/F2a inchangés) | un seul modèle de favori |
| D3 | Sélection hors glossaire → ★ crée un **terme personnel** (mot, phrase source, explication si déjà demandée) + favori ; révisé au drill comme les autres, synchronisé | décision direction (« créer ta propre carte ») |
| D4 | Termes personnels = table Dexie séparée `personal_terms`, fusionnée à la lecture avec le glossaire publié ; jamais écrits dans `fachbegriffe` | la sync de contenu réécrit `fachbegriffe` ; un terme personnel ne doit jamais en dépendre |
| D5 | Double registre pour les **1 354 termes liés à au moins un cas** : `register = { patient, vorstellung, anamnese }` dans `fachbegriffe.json`, pré-rédigé par lots, relu langue + clinique | la compétence notée à l'examen ; statique, hors-ligne (F1 D1) |
| D6 | Les 912 autres termes gardent `translationSimple`, affichée comme « Reformulation » (pas comme registre patient) | honnêteté : une définition n'est pas une parole de patient |
| D7 | IA **côté serveur et gratuite** : Edge Function `ai` (Supabase EU) → **chaîne de fournisseurs gratuits appelés en direct** (pas via le pool `:free` d'OpenRouter) : Groq (Qwen 3.8 27B) puis Google AI Studio (Gemini 3.5 Flash / Flash-Lite) — retenus au smoke test du 26 sept. (Llama 3.3 70B indisponible en gratuit), bascule automatique sur erreur ou quota ; clés gratuites = secrets du projet ; **zéro dépense** (direction, 25 sept.) | les pannes viennent du pool partagé `:free` d'OpenRouter ; les niveaux gratuits en direct ont une capacité dédiée ; clé par navigateur = à recoller partout |
| D8 | La clé navigateur (OpenRouter/Groq) reste un **repli** si la fonction échoue ou en mode public | ne pas casser le mode public ; filet si le serveur tombe |

## 3. Modèle

### 3.1 Terme personnel (contrat `sync-protocol.md`, via `platform-architect`)

```ts
interface PersonalTerm {
  id: string;            // 'pt-' + hash stable (FNV-1a hex) du terme en minuscules : même mot → même id sur tous les appareils
  term: string;          // sélection nettoyée, 1–80 car.
  context?: string;      // phrase source, tronquée à 300 car.
  explanation?: string;  // texte de la bulle si déjà expliqué, TRONQUÉ (pas rejeté) à 600 car.
  caseId?: string;
  createdAt: string;
  srs: Srs;              // état de révision, comme un Fachbegriff publié
}
```

Événements : `term.personal_created` (subject = id, payload = champs ci-dessus sans `id`/`srs`), `term.personal_deleted` (`{}`). Projection → table Dexie `personal_terms` (nouvelle version Dexie après v3) : par id, dernier événement par ordre `sortEvents` gagne ; **re-créer après suppression est autorisé** (même id déterministe, `srs` repart de `freshSrs`). Favori = `term.favorited` (subject `pt-…`). **SRS** : la projection `srs.reviewed` (`lib/sync/projections.ts`) écrit dans `personal_terms` quand l'id commence par `pt-`, sinon dans `fachbegriffe` (inchangé).

**Source unique** : `lib/collections/allTerms.ts` expose `type AnyTerm = Fachbegriff | PersonalTermView` (vue d'un terme personnel au format `Fachbegriff` : `specialty: 'Allgemein'`, `translationSimple = explanation ?? ''`, `personal: true`) ; `useFachbegriffe` (ou un hook dédié `useAllTerms`), `drillQueue`, `relevance`, la liste et les favoris lisent cette source ; la notation d'une carte appelle un `rateTerm` qui aiguille selon le préfixe.

Unicité : l'id déterministe rend deux créations (même hors-ligne, sur deux appareils) idempotentes. ★ sur un mot déjà créé → bascule le favori.

Cycle de vie local : la purge de contenu par tier (`content/apply.ts`) ne touche pas `personal_terms` ; la bascule de compte change de base (une base par compte, inchangé) ; `rebuildProjections` reconstruit `personal_terms` depuis le journal.

SQL check + zod `events` + `ProgressEventType` étendus ; migration appliquée en EU et fonction `events` redéployée **avant merge**.

### 3.2 Double registre (contenu)

`fachbegriffe.json` : champ optionnel `r: { pa: string; vo: string; an: string }` → `Fachbegriff.register?: { patient; vorstellung; anamnese }`.
- `patient` : formulation orale qu'un patient emploierait (« Wasser im Bauch »), ≤ 60 car.
- `vorstellung` : une phrase de Vorstellung/Doku qui contient le terme (« Sonographisch zeigte sich ein Aszites. »).
- `anamnese` : une question au patient **sans** le terme technique, finissant par « ? ».

Validateur `scripts/checkTermRegister.mjs` (CI) : tout terme présent dans `caseTermLinks.json` a `r` ; `pa` ≠ terme ; `vo` contient le terme (mot entier, formes fléchies) ; `an` ne contient pas le terme et finit par « ? » ; longueurs bornées ; aucune chaîne de terme en double dans le glossaire (aujourd'hui « palliativ » ×2 → à dédoublonner). Publication : le delta par hash existant republie les termes modifiés.

### 3.3 Affichage du registre

Composant unique `TermRegister` (deux colonnes **Vorstellung** / **Anamnese**, une colonne sous 360 px) utilisé par : carte au survol, tiroir fiche, liste (ligne : `register.patient` à la place de `translationSimple`), panneau du cas, dos de carte du drill (`term2simple` montre `register.patient` + la question d'anamnèse). Sans `register` : ligne « Reformulation · <translationSimple> ».

### 3.4 Bulle « Expliquer »

Déclenchement : `selectionchange` (anti-rebond 250 ms) + `pointerup` — souris **et** tactile (aujourd'hui `mouseup` seul : la bulle n'apparaît pas sur mobile). Résolution glossaire : `exactLookup` étendu en `lookupTerm` (exact, puis base sans suffixe `e/en/s/n`, jamais de flou — FB2-M3) ; termes dupliqués dans le glossaire interdits (validateur).

Pastille : `[★] [Expliquer]`. ★ plein si déjà favori. Après ★ : confirmation courte (« Ajouté aux favoris » / « Carte créée ») + lien « Ajouter à un deck… » (même extension que la carte F2b). L'explication, si demandée ensuite, complète le terme personnel (`term.personal_created` n'est émis qu'une fois ; l'explication tardive n'est **pas** réécrite — hors périmètre). Glossaire : la bulle montre aussi `TermRegister`.

### 3.5 IA serveur

`supabase/functions/ai/index.ts` — **pas un proxy ouvert** :
- Entrée (zod) : `{ kind: 'brief', selection (≤ 220 car.) }` ou `{ kind: 'chat', turns: {role, text}[] }` (≤ 20 tours, ≤ 2 000 car./tour). Les prompts système (`DOCTOPUS_SYSTEM`, `buildBriefPrompt`) vivent **côté serveur** (module `_shared/prompts.ts`, source partagée avec `aiModels`/eval) ; le client n'envoie jamais de system prompt.
- Accès : JWT vérifié (`[functions.ai] verify_jwt = true` déclaré explicitement dans `config.toml`) ; user id tiré du JWT, jamais du corps ; réservé aux comptes premium (`my_tier() = 3`, soit Mehdi et Lydia).
- Quotas : `rate_hit` via le client service-role (`_shared`), clé `ai:<uid>` : 300 appels/jour ; `max_tokens` brief 300, chat 1 200 ; aucun moyen de paiement enregistré chez les fournisseurs (gratuité garantie par construction).
- Cache : réponse `brief` mise en cache par sélection normalisée (table `ai_cache`, 30 jours) — un mot déjà expliqué ne consomme plus de quota.
- Transport : preflight OPTIONS ; CORS limité à l'origine Pages (`https://mhdbkr.github.io`) et `localhost` en dev ; flux SSE du fournisseur relayé par `ReadableStream`, requête amont annulée si le client se déconnecte.
- Fournisseurs : liste ordonnée en **variables d'environnement** (`AI_CHAIN_BRIEF`, `AI_CHAIN_CHAT`, retenu : brief `groq:qwen/qwen3.8-27b,gemini:gemini-3.5-flash-lite`, chat `groq:qwen/qwen3.8-27b,gemini:gemini-3.5-flash` — éval 16/20 (seuil 16)) ; noms de modèles et quotas gratuits vérifiés contre la doc officielle et la console de chaque fournisseur avant merge (smoke test `models`) ; les deux fournisseurs parlent l'API compatible OpenAI (un seul adaptateur).
- Évaluation : le jeu de 20 questions de référence (`scripts/evalDoctopus.mjs`, FB2-M4) est rejoué sur la chaîne retenue ; seuil = pas pire que l'actuel Gemma 4 26B.
- Historique : la conversation est **normalisée en texte simple** (`{role, text}`) ; les `reasoningDetails` OpenRouter ne sont ni envoyés au serveur ni rejoués d'un fournisseur à l'autre ; une conversation garde le fournisseur de son premier tour (le repli D8 ne s'applique qu'à une conversation nouvelle ou à `brief`).

Client : `onlineAi.ts` garde son interface (`askBrief`, `askOnline`, `askConversation`) ; en mode fondateur connecté et premium → fonction `ai`, sinon clé navigateur. Secrets `GROQ_API_KEY`, `GEMINI_API_KEY` (clés gratuites) posés par la direction (jamais par un agent). Réglages Doctopus : la section clé devient « Repli (optionnel) ». Implémentation vérifiée contre la doc officielle de chaque fournisseur (`source-driven-development`).

## 4. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Sélection « Aszites » → pastille ★ + Expliquer ; ★ → `term.favorited` ; le terme est dans Favoris | test composant + navigateur |
| AC-2 | Sélection hors glossaire (« Belastungsdyspnoe ») → ★ → terme personnel créé + favori ; présent dans Favoris, drill, et sur un 2ᵉ appareil après sync | tests projection + navigateur 2 contextes |
| AC-3 | ★ sur une sélection déjà créée → bascule du favori, aucun doublon ; même mot créé hors-ligne sur deux appareils → un seul terme après sync | test |
| AC-4 | Contenu de `fachbegriffe`/sync de contenu ne supprime jamais un terme personnel | test |
| AC-4b | Terme personnel noté au drill → intervalle conservé sur un 2ᵉ appareil après sync | test projection + navigateur |
| AC-4c | Mobile 390 px tactile (`hasTouch`) : sélection → pastille ★ + Expliquer ; « Asziten » résout « Aszites » | navigateur + test `lookupTerm` |
| AC-5 | 1 354 termes liés ont `register` ; validateur vert en CI ; relecture langue + clinique consignée | CI + rapports |
| AC-6 | `TermRegister` affiché dans carte, fiche, liste, panneau du cas, dos du drill ; 390 px sans débordement | tests + navigateur |
| AC-7 | « Expliquer » et Doctopus fonctionnent **sans clé navigateur** sur les deux comptes ; 401 sans JWT (avec en-têtes CORS) ; 403 hors premium ; corps avec `system` rejeté ; quota → message clair ; flux reçu en streaming ; smoke test `/v1/models` vert | tests fonction + navigateur prod |
| AC-8 | Fonction en panne → repli sur la clé navigateur si présente (brief ou conversation nouvelle), sinon message honnête ; une conversation en cours ne change pas de fournisseur | test |
| AC-9 | Mode public inchangé ; contrat + migration + fonctions `events` et `ai` appliqués en EU avant merge | CI + MCP |
| AC-10 | Charte (cibles 44 px, tons, mouvement ≤ 150 ms, reduced-motion) | `front-design-keeper` |

## 5. Découpage

1. Tranche A — ★ depuis « Expliquer » + termes personnels (contrat, migration, projection, UI).
2. Tranche B — IA serveur (fonction `ai`, client, réglages) ; nécessite le secret posé par la direction.
3. Tranche C — `TermRegister` + validateur + 3 lots pilotes (≈ 100 termes) → **revue direction du rendu** → lots restants.

## 6. Risques

| Risque | Parade |
|---|---|
| Quota gratuit épuisé / fournisseur en panne | chaîne à 2 fournisseurs + cache `brief` + repli clé navigateur (D8) + message honnête |
| Données envoyées à un niveau gratuit (peut servir à l'entraînement) | seuls des mots et phrases de cas fictifs partent ; jamais de donnée personnelle |
| Fonction détournée en proxy (JWT volé, usage hors FSP) | prompts système côté serveur, réservé premium, tours/longueurs plafonnés, quota, plafond console |
| Registre « de dictionnaire » au lieu d'oral | validateur (la question n'emploie pas le terme) + `fsp-language-reviewer` par lot + revue direction après pilote |
| Sélections parasites devenues cartes | création seulement sur ★ explicite ; suppression depuis la fiche (`term.personal_deleted`) |
| Modèle ID ou quota gratuit changé | chaîne en configuration, smoke test avant merge (source-driven) |

## 7. Hors périmètre

Notes par cas, liaison automatique des mots familiers dans les réponses, drill dans les deux sens, édition d'un terme personnel, IA pour le mode public.
