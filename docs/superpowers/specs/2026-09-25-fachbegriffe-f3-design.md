# Fachbegriffe rafraîchi — F3 : ★ depuis « Expliquer », double registre, IA serveur

Date : 2026-09-25 · Statut : brouillon, à valider par la direction · Epic : #4 (clôture) · Chantier ADR-0015 n° 2 (suite de F2b PR #43)

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
| D7 | IA **côté serveur** : Edge Function `ai` (Supabase EU) → API Anthropic ; clé = secret du projet ; Haiku 4.5 pour « Expliquer », Sonnet 5 pour Doctopus ; quota par personne (`rate_hit`) | modèles `:free` = capacité partagée instable ; clé par navigateur = à recoller partout |
| D8 | La clé navigateur (OpenRouter/Groq) reste un **repli** si la fonction échoue ou en mode public | ne pas casser le mode public ; filet si le serveur tombe |

## 3. Modèle

### 3.1 Terme personnel (contrat `sync-protocol.md`, via `platform-architect`)

```ts
interface PersonalTerm {
  id: string;            // 'pt-<uuid>'
  term: string;          // sélection nettoyée, 1–80 car.
  context?: string;      // phrase source, ≤ 300 car.
  explanation?: string;  // texte de la bulle si déjà expliqué, ≤ 600 car.
  caseId?: string;
  createdAt: string;
}
```

Événements : `term.personal_created` (subject = id, payload = champs ci-dessus sans `id`), `term.personal_deleted` (`{}`). Projection → table `personal_terms` (dernier événement gagne ; `deleted` postérieur retire). Le favori d'un terme personnel reste `term.favorited` (subject = `pt-…`). SRS : `srs.reviewed` avec subject `pt-…`, projeté comme pour un terme publié. SQL check + zod `events` + `ProgressEventType` étendus ; migration appliquée en EU et fonction `events` redéployée **avant merge**.

Unicité : une sélection déjà présente (même `term` insensible à la casse) dans les termes personnels → ★ bascule son favori, ne crée pas de doublon.

### 3.2 Double registre (contenu)

`fachbegriffe.json` : champ optionnel `r: { pa: string; vo: string; an: string }` → `Fachbegriff.register?: { patient; vorstellung; anamnese }`.
- `patient` : formulation orale qu'un patient emploierait (« Wasser im Bauch »), ≤ 60 car.
- `vorstellung` : une phrase de Vorstellung/Doku qui contient le terme (« Sonographisch zeigte sich ein Aszites. »).
- `anamnese` : une question au patient **sans** le terme technique, finissant par « ? ».

Validateur `scripts/checkTermRegister.mjs` (CI) : tout terme présent dans `caseTermLinks.json` a `r` ; `pa` ≠ terme ; `vo` contient le terme (mot entier, formes fléchies) ; `an` ne contient pas le terme et finit par « ? » ; longueurs bornées. Publication : le delta par hash existant republie les termes modifiés.

### 3.3 Affichage du registre

Composant unique `TermRegister` (deux colonnes **Vorstellung** / **Anamnese**, une colonne sous 360 px) utilisé par : carte au survol, tiroir fiche, liste (ligne : `register.patient` à la place de `translationSimple`), panneau du cas, dos de carte du drill (`term2simple` montre `register.patient` + la question d'anamnèse). Sans `register` : ligne « Reformulation · <translationSimple> ».

### 3.4 Bulle « Expliquer »

Pastille : `[★] [Expliquer]`. ★ plein si déjà favori. Après ★ : confirmation courte (« Ajouté aux favoris » / « Carte créée ») + lien « Ajouter à un deck… » (même extension que la carte F2b). L'explication, si demandée ensuite, complète le terme personnel (`term.personal_created` n'est émis qu'une fois ; l'explication tardive n'est **pas** réécrite — hors périmètre). Glossaire : la bulle montre aussi `TermRegister`.

### 3.5 IA serveur

`supabase/functions/ai/index.ts` : `POST { kind: 'brief' | 'chat', messages }` ; JWT requis ; zod ; `rate_hit('ai:'||uid, 300, 86400)` ; `max_tokens` borné (brief 300, chat 1 200) ; streaming SSE relayé. Modèles : `claude-haiku-4-5-20251001` (brief), `claude-sonnet-5` (chat). Prompts système inchangés (`DOCTOPUS_SYSTEM`, `buildBriefPrompt`) envoyés par le client, **plafonnés en taille** côté serveur. Client : `onlineAi.ts` garde son interface (`askBrief`, `askOnline`, `askConversation`) ; en mode fondateur connecté → fonction `ai`, sinon clé navigateur. Secret `ANTHROPIC_API_KEY` posé par la direction (jamais par un agent). Réglages Doctopus : la section clé devient « Repli (optionnel) ». Implémentation vérifiée contre la doc officielle Anthropic (`source-driven-development`).

## 4. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Sélection « Aszites » → pastille ★ + Expliquer ; ★ → `term.favorited` ; le terme est dans Favoris | test composant + navigateur |
| AC-2 | Sélection hors glossaire (« Belastungsdyspnoe ») → ★ → terme personnel créé + favori ; présent dans Favoris, drill, et sur un 2ᵉ appareil après sync | tests projection + navigateur 2 contextes |
| AC-3 | ★ sur une sélection déjà créée → bascule du favori, aucun doublon | test |
| AC-4 | Contenu de `fachbegriffe`/sync de contenu ne supprime jamais un terme personnel | test |
| AC-5 | 1 354 termes liés ont `register` ; validateur vert en CI ; relecture langue + clinique consignée | CI + rapports |
| AC-6 | `TermRegister` affiché dans carte, fiche, liste, panneau du cas, dos du drill ; 390 px sans débordement | tests + navigateur |
| AC-7 | « Expliquer » et Doctopus fonctionnent **sans clé navigateur** sur les deux comptes ; 401 sans JWT ; quota → message clair | tests fonction + navigateur prod |
| AC-8 | Fonction en panne → repli sur la clé navigateur si présente, sinon message honnête | test |
| AC-9 | Mode public inchangé ; contrat + migration + fonctions `events` et `ai` appliqués en EU avant merge | CI + MCP |
| AC-10 | Charte (cibles 44 px, tons, mouvement ≤ 150 ms, reduced-motion) | `front-design-keeper` |

## 5. Découpage

1. Tranche A — ★ depuis « Expliquer » + termes personnels (contrat, migration, projection, UI).
2. Tranche B — IA serveur (fonction `ai`, client, réglages) ; nécessite le secret posé par la direction.
3. Tranche C — `TermRegister` + validateur + 3 lots pilotes (≈ 100 termes) → **revue direction du rendu** → lots restants.

## 6. Risques

| Risque | Parade |
|---|---|
| Coût IA incontrôlé | plafond mensuel dans la console Anthropic (direction) + `rate_hit` 300/jour/personne + `max_tokens` bornés |
| Prompt envoyé par le client détourné pour un autre usage | fonction réservée aux comptes connectés (2 personnes), taille plafonnée, quota |
| Registre « de dictionnaire » au lieu d'oral | validateur (la question n'emploie pas le terme) + `fsp-language-reviewer` par lot + revue direction après pilote |
| Sélections parasites devenues cartes | création seulement sur ★ explicite ; suppression depuis la fiche (`term.personal_deleted`) |
| Modèle ID erroné / API changée | vérification contre la doc officielle avant code (source-driven) |

## 7. Hors périmètre

Notes par cas, liaison automatique des mots familiers dans les réponses, drill dans les deux sens, édition d'un terme personnel, IA pour le mode public.
