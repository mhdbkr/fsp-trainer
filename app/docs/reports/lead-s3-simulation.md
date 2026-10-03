# lead-s3-simulation — rapport final (chantier C2, série 3)

Branche `feat/s3-simulation` (base `main` = `4fad5b1`), worktree
`doctopus-s3-simulation`, 14 commits. Contrat opposable :
`docs/contracts/simulation-run.md`. ADR : `docs/adr/0018-lauf-state-machine.md`.
Audit d'entrée : `app/docs/reports/audit-simflow-serie3.md`.

**Statut : DONE_WITH_CONCERNS.** Le travail est livré et prouvé au navigateur.
Trois réserves, toutes nommées en §5 : la revue de branche par
`quality-branch-reviewer` n'a **pas pu être dispatchée** (outil `Task`
désactivé dans cette session) et a été remplacée par une revue que j'ai menée
moi-même — donc par l'implémenteur, ce que la constitution interdit ; un
dépassement de périmètre sur `store/ui.ts` est à régulariser ; et le
mis-classement `scope:'full'` reste ouvert, signalé sans correction.

---

## 1. La question posée à ce pôle

> Le moteur reste-t-il un seul code pour les trois modes, fidèle à l'examen ?

**Oui, et c'est maintenant vérifiable.** Il y a un seul automate
(`lib/lauf/automat.ts`, six états, un ordre total) et un seul point d'entrée
(`features/simulation/useLauf.ts`). Les trois modes ne sont plus trois chemins :
ce sont trois **valeurs** du même `Lauf`.

| ce qui variait | ce qui le porte aujourd'hui |
|---|---|
| simulation complète / un seul Teil | `Lauf.modus` + `Lauf.geplanteTeile` |
| branche Aufklärung à la demande | `Lauf.teilVorAufklaerung` (on revient au Teil quitté) |
| séance jouée dans une IA externe | `Lauf.mode` / `Simulation.mode = 'external-ai'` |

Le second automate concurrent (`lib/simulationStep.ts`, 125 lignes) a été
**supprimé** (`dcf383a`), et avec lui les huit `useState` locaux du runner dont
aucun n'était l'état de la partie. C'est ce qui produisait « Valider » qui
réaffichait l'exercice qu'on venait de finir.

Fidélité à l'examen : les cibles de durée, la grille de langue à cinq axes et
la structure des Teile viennent des sources ODAK V4 en place ; aucune structure
n'a été inventée dans ce chantier. `checkGuideCoverage` — le contrat guide ↔
fiche — **reste vert** (§4).

---

## 2. La preuve de parcours

`app/scripts/e2e/simulation-s3.spec.md` (commit `f6a5554`). Rejouable tel quel :
chaque étape porte son URL, son sélecteur et sa valeur attendue, la mise en
place comprise. Navigateur **headless** (`playwright-cli`), mesures prises
depuis le **DOM de l'app et IndexedDB** — jamais depuis un module importé par
une sonde.

Deux parcours : **A** simulation complète (Anamnese → Aufklärung →
Dokumentation → Fallvorstellung) et **B** un seul Teil (`?teil=anamnese`).

| propriété demandée | où | verdict | preuve courte |
|---|---|---|---|
| « Valider » n'a pas reculé — Teil seul | B5 | **PASS** | hash gagne `&sim=…`, l'écran devient le bilan enregistré « Encore un effort · 46 % » ; la trame de questions a disparu |
| … dernière partie d'un run complet | A4 | **PASS** | le bilan de la dernière partie ne rend **plus aucun** « Partie suivante » ; la seule sortie avant mène au bilan enregistré, quatre parties listées |
| … branche Aufklärung | A2 | **PASS** | la sortie s'appelle « Partie suivante — **Dokumentation** → » : elle nomme le Teil quitté, pas l'Aufklärung finie ; on y revient |
| le chrono de la partie validée ne redémarre pas | A1, A2, B4 | **PASS** | `anamnese: 312` inchangée pendant que `dokumentation` court de 0 à 44 ; au retour d'Aufklärung, Doku reprend 118 → 133 au lieu de 20:00 |
| la checklist de fin reprend les cases cochées pendant | B3 | **PASS** | 2 chapitres cochés pendant la partie → bilan `2/13` en Dexie, `2/13` au DOM, `2/13` dans le `.mono-tag` |
| « tout sélectionner » se lit comme un raccourci de saisie | B3 bis | **PASS** | trois marques concordantes, §2.1 ci-dessous |
| une partie interrompue par un rafraîchissement se reprend, brouillon compris | B4 | **PASS** | après `reload` : même partie, même phase, `3/13`, grille `5/1/4/2/5`, ressenti `77`, chrono figé à 81 s — identique champ pour champ |
| valider deux fois = un seul enregistrement | B5, A4 | **PASS** | **trois** clics dans chaque parcours → `simulations` passe de 3 à 4, puis de 5 à 6. `+1` exactement, id = `lauf.id` |

### 2.1 Le raccourci de saisie

Rendu exact au-dessus de la liste (`PartEvaluation.tsx:83-94`) :

> Bilan — Anamnese · **Coche ce que tu as réellement fait. Le score se calcule seul.**
> Checklist de contenu — 19 %
> **Raccourci de saisie ·** `2/13`   ·   **Tout cocher**

1. la consigne nomme l'acte (« coche ce que tu as **réellement fait** ») ;
2. l'étiquette du contrôle **dit ce qu'il est** — « Raccourci de saisie » ;
3. le verbe est un verbe de saisie (« Tout cocher »), pas d'évaluation, et il
   bascule en « Tout décocher » : il s'annule d'un geste.

Le poids visuel suit le sens : `text-[11.5px] text-slate-400 underline
decoration-dotted`. Un bouton neutre de notation aurait le poids d'une action
principale ; celui-ci a celui d'un lien d'aide à la saisie.

### 2.2 Ce que le parcours a coûté à établir

Deux écarts d'environnement, consignés dans le spec §0 pour que le prochain ne
les repaie pas :

- **le worker Edge local doit être tiédi**. À froid, `functions/v1/content`
  rend `546` puis `502` (boot Deno ~5 s, annulé par le superviseur) et l'app
  reste sur « Doctopus a besoin d'une connexion pour le premier chargement »
  (`main.tsx:84-95`). « Réessayer » ne suffit pas : chaque rechargement retombe
  sur un worker froid. Remède : une boucle `curl` toutes les 2 s en fond.
- **`case-ulcus` n'existe pas** sur la base locale (12 cas, palier gratuit).
  Les preuves antérieures l'utilisaient. Le parcours utilise `case-gib`.

---

## 3. Les deux défauts trouvés et corrigés pendant cette session

### 3.1 Le chrono d'une simulation neuve héritait de la précédente (`fa558d2`)

Mesuré : un `Lauf` créé depuis **119 s** portait **194 s** d'Anamnese. Reproduit
deux fois.

`SimulationRunner.tsx` montait `<SimTimer key={partKey}>`. En enchaînant deux
simulations **sans recharger la page** — bilan enregistré, puis nouvelle
simulation dont le premier Teil est le même —, la `key` ne changeait pas : React
ne remontait pas `SimTimer`, qui gardait son `elapsed` de la simulation
précédente. Son premier tick l'écrivait dans le `Lauf` neuf, et la garde
monotone de `tickChrono` (`automat.ts:141-145`, INV-28) — qui existe pour qu'un
remontage ne « remette pas au début » — le gravait pour de bon.

Correction : `key={`${lauf.id}:${partKey}`}`. L'identité d'un chrono, c'est
(partie **de cette simulation**), pas (partie).

Contre-preuve, même parcours rejoué : `Lauf` neuf âgé de 32 s, **32 s**
d'Anamnese, sans rechargement de page (`performance.now()` = 111 s).

### 3.2 `restauriere()` était testée, verte, et morte (`42b9a95`)

Trouvé en revue. `restauriere()` complète un `Lauf` incomplet et traduit les ids
de checklist legacy (§4.4). `grep` ne rendait que sa définition et **son propre
test** : la porte réelle de la reprise, `ladeAktivenLauf`, rendait le `Lauf`
brut sorti de `db.meta`.

Conséquence : un `Lauf` écrit par une version antérieure revenait avec ses ids
legacy intacts — donc les cases cochées pendant la partie ne se retrouvaient
plus dans la checklist du bilan, exactement la régression que ce chantier
corrige — et avec des champs absents, sur lesquels le runner lit `.length` et
`.filter` dès le premier rendu.

Correction à la porte unique : `ladeAktivenLauf` rend `restauriere(l)` ;
`bereinigeAltenLauf` et `useLauf` en héritent tous les deux. Test d'abord :
rouge sur `expected 'cl-3' to be 'anam-vegetativ'`, vert après.

---

## 4. Les lignes de CI — vérifiées par code de sortie

Toutes mesurées sur `42b9a95`, dans le worktree, jamais lues au travers d'un pipe.

| commande (celle de `.github/workflows/quality.yml`) | exit |
|---|---|
| `npm run typecheck` | **0** |
| `node scripts/checkProbeCoverage.mjs` | **0** |
| `node scripts/checkMusterCoverage.mjs` | **0** |
| `node scripts/checkGuideCoverage.mjs` — **contrat guide ↔ fiche** | **0** |
| `node scripts/checkPlayedTrame.mjs` | **0** |
| `node scripts/checkUiTells.mjs` | **0** |
| `npx vitest run --dir src` | **1** — voir ci-dessous |

### 4.1 Ce que j'ai cassé vs ce qui échouait déjà

**Je n'ai rien cassé.** Les tests de mon périmètre sont verts :

```
npx vitest run --dir src lauf checklists simulationSave features/simulation
  → 6 fichiers passés, 131 tests passés
```

Les échecs de `npx vitest run --dir src` vivent tous **hors de mon périmètre**,
et **le jeu d'échecs change à chaque exécution**. Trois exécutions de la même
commande sur la même branche :

| exécution | échecs | fichiers |
|---|---|---|
| 1 | 8 tests / 5 fichiers | `SelectionExplainer`, `StarButton`, `bedeutung.search`, `CaseTermsPanel`, `DrillPage` |
| 2 | 8 tests / 5 fichiers | les mêmes fichiers, **d'autres tests** |
| 3 | 12 tests / 6 fichiers | `CardToast`, `GlossaryDrawer`, `StarButton`, `TermHoverCard`, `FachbegriffePage`, `sync/queue` |

Aucun de ces fichiers n'est touché par la branche (`git diff --stat
main...HEAD -- <chemin>` rend un diff **vide** pour chacun). La troisième
exécution tournait en concurrence avec mes autres travaux sur cette machine, ce
qui explique le jeu plus large. Contrôle : `src/lib/sync/queue.test.ts`, lancé
seul, rend **11 passés / 11**.

Comparaison avec **`main`**, mêmes fichiers, même `--testTimeout` :

| | `main` | `feat/s3-simulation` |
|---|---|---|
| tests en échec (exéc. 1) | **8** | **8** |
| fichiers concernés | les mêmes | les mêmes |
| identité des tests en échec | **varie d'un run à l'autre** | idem |

Signature d'une dépendance d'ordre et de minuterie sous charge, pas d'une
régression. Cas le plus net, `ExternalAiSheet.test.tsx` (fichier **non modifié**
par la branche), lancé seul :

```
sur main                    : 2 failed | 8 passed
sur feat/s3-simulation      : 1 failed | 9 passed
```

La branche est, sur ce fichier, strictement **meilleure** que sa base.

Deux autres échecs apparaissent avec `npx vitest run` **nu** (sans `--dir src`) :
3 fichiers `scripts/*.test.mjs` (« No test suite found ») et 4
`supabase/tests/*` (« supabaseKey is required », variable d'environnement
absente). La CI ne lance **pas** ces chemins dans ce job — elle lance
`npx vitest run --dir src` (`quality.yml:106`). Hors sujet, mais consigné pour
que personne ne s'y reprenne.

---

## 5. Réserves, dépassement et propositions de contrat

### 5.1 La revue de branche n'a pas eu lieu comme prévu — RÉSERVE

Le brief demande `quality-branch-reviewer` (Opus), un seul fixeur, re-revue.
**L'outil `Task` est désactivé dans cette session** (`No such tool available:
Task. Task is disabled for this session, in subagents as well as here.`). Aucun
sous-agent n'a pu être dispatché — ni le relecteur, ni `fsp-qa-tester`.

J'ai donc fait moi-même la QA et la revue. C'est une violation de la règle
« implémenteur OU relecteur, jamais les deux ». Je la déclare plutôt que de la
masquer : **la revue de branche par un tiers reste à faire**. Ce que ma revue a
produit est réel (elle a trouvé §3.2) mais ne la remplace pas.

### 5.2 Dépassement de périmètre à régulariser — `store/ui.ts`

Mon périmètre déclaré couvre `store/simSession.ts`, pas `store/ui.ts`. Des
commits antérieurs de cette branche y ont ajouté un champ `externalAiTeil` et un
paramètre optionnel à `openExternalAi` (contrat `ai-bridge.md`). Les deux
changements sont **additifs et rétro-compatibles** — aucun appelant existant ne
casse — mais ils sont hors contrat. **Proposition** : les régulariser, ou les
déplacer si `store/ui.ts` appartient à un autre chantier.

### 5.3 Le mis-classement `scope:'full'` — SIGNALÉ, NON CORRIGÉ

`lib/simScope.ts:19-23` :

```ts
export function isFullSimulation(sim: Simulation): boolean {
  if (sim.scope === 'teil') return false;
  if (sim.scope === 'full') return true;          // ← croit l'intention
  return Object.values(sim.parts).filter((p) => p?.done).length >= 2;
}
```

Le contrat §5 (INV-25) dit que **la portée est le FAIT, jamais l'intention** —
mon écrivain le respecte (`lib/lauf/speichern.ts:76-91`, `scope: vollstaendig ?
'full' : 'teil'`, vérifié en base : les deux runs d'un Teil sont bien écrits
`teil`, le run à quatre parties `full`). Mais le **lecteur** croit `scope`
sur parole. Or `lib/simulationSave.ts:70` vaut `scope: i.scope ?? 'full'` : tout
appelant qui omet la portée écrit `full`. Une telle ligne — un run déclaré
complet, abandonné après une partie — est comptée « simulation complète » sur
`features/stats/StatsPage.tsx:44`, et l'historique déjà écrit ne peut plus être
réparé côté écrivain.

`simScope.ts` appartient au chantier **Programme**. **Non corrigé.**
**Proposition de contrat** : que `isFullSimulation` croise `scope` avec le
nombre de parties réellement `done`, ce qui répare l'historique d'un coup.

### 5.4 Autres propositions déjà ouvertes (inchangées)

1. **`app/src/main.tsx`** — les 6 routes `/simulation/:laufId/…` du contrat §2.2.
   Repli en périmètre : l'état du `Lauf` est porté par des paramètres d'URL sur
   `/simulation/:caseId/run` (propriétés observables identiques, prouvé en §2 :
   `?sim=<id>` recharge le bilan enregistré). Changement de forme de route =
   décision de `main`.
2. **`app/src/db/db.ts`** — index Dexie `simulations: '…, profileId, teil'`
   (contrat §6). Chantier Programme.
3. **`app/src/db/types.ts`** — `ChecklistItem.kapitel`. Contourné par un type
   dérivé dans `lib/checklists.ts` (typage structurel sur un champ réellement
   persisté). Proposition : le remonter dans `db/types.ts`.

### 5.5 Exports sans appelant de production — à nettoyer au prochain passage

`zustandIndex`, `minutenProTeil`, `alleChecklistItems`, `CHECKLIST_PREFIX` :
définis, testés, jamais appelés hors de leur fichier et de leurs tests.
`minutenProTeil` est explicitement nommé par le contrat §1, donc légitime en
attente. Les trois autres sont des candidats à la suppression. Pas touchés :
un nettoyage cosmétique n'a pas sa place dans un diff qui porte deux
corrections de comportement.

---

## 6. Les classes du système de design consommées sans exister — **aucune**

Le brief anticipait une dette à déclarer (`.btn-glass`, `.panel`, tokens
d'élévation, livrés sur `feat/s3-primitives`). Vérification faite sur les 28
fichiers de la branche :

| classe attendue | occurrences dans mon périmètre | définie sur ma branche |
|---|---|---|
| `.btn-glass` | **0** | non — mais je ne la consomme pas |
| `.panel` | **0** | non — mais je ne la consomme pas |
| tokens d'élévation (`--elev-*`, `.surface-*`) | **0** | — |

Ce que je consomme réellement, et qui est **défini sur la branche** :

| classe | usages | définitions trouvées |
|---|---|---|
| `label` | 97 | 2 (`index.css`) |
| `card` | 36 | 12 |
| `btn-outline` | 15 | 1 |
| `btn-primary` | 12 | 2 |
| `btn` | 10 | ✓ |
| `mono-tag` | 2 | 2 |

La seule occurrence de « panel » est `--panel-offset`, une **variable CSS que je
publie moi-même** (`SimulationRunner.tsx:199`) et que `components/SidePanel.tsx`
consomme avec un repli (`var(--panel-offset, 7rem)`). Rien ne casse si elle
manque.

Les tokens Tailwind employés (`ease-fluid`, `brand`, `ink`) sont définis dans
`tailwind.config.js` de la branche (lignes 41, 11, 25).

**Aucune surprise au merge de `feat/s3-primitives` de ce côté.** La seule
réserve visuelle est d'environnement, pas de branche : le worktree partage
`node_modules` avec `Claude FSP/app` et Vite rend `403` sur les `.woff2`, donc
les polices tombent sur le repli système en headless (consigné dans le spec
§Non vérifié). Aucun jugement de mise en page n'est porté ici.

---

## 7. Décisions de charte appliquées

- **L'ombre portée sous le verre est interdite** (`953a2b3`). Les trois surfaces
  en verre restantes de mon périmètre — feuille de note de l'`ImmersiveMode`,
  onglets de l'écran simulant, pastille d'icône d'une carte de mode — passent au
  bord supérieur plus clair (`shadow-[inset_0_1px_0_0_…]`), avec une valeur
  sombre distincte. Le seul `shadow-md` restant (`SimulationRunner.tsx:294`,
  pastille d'étape active) est sur une surface **opaque** `bg-brand-600`, pas du
  verre : hors de la règle.
- **Contrat de mouvement** : règle A (garde CSS globale) s'applique
  universellement ; règle B (`motion-safe:`) est limitée à
  `components/visuals/*`. Les animations existantes de `SimulationRunner`
  (fusion des deux barres d'en-tête au défilement, `duration-[440ms]
  ease-fluid`) ne sont donc **pas** préfixées — conforme.

---

## 8. Non vérifié

- **Deux onglets simultanés** (médecin + simulant, `/#/patient/:caseId`). Le
  protocole `fsp-patient-sync` et le `BroadcastChannel` ne sont pas dans mon
  périmètre d'écriture et n'ont pas été exercés. **Le brief demandait cette
  vérification** : elle reste à faire.
- **La revue de branche par un tiers** (§5.1).
- **`pickSession.ts`** — exclu du périmètre ; le parcours entre par URL directe.
- **La reprise après fermeture complète du navigateur** (et non un `reload`) :
  `lauf.aktiv` vit dans Dexie et devrait survivre, non mesuré.
- **Un cas payant** : la base locale n'expose que les 12 cas du palier gratuit.
