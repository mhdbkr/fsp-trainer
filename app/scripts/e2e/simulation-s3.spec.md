# Preuve de parcours — entrée et sortie de simulation (série 3, C2) — playwright-cli

Date : 2026-09-30. Worktree `doctopus-s3-simulation`, branche `feat/s3-simulation`.
Deux parcours : **A** simulation complète (Anamnese → Aufklärung → Dokumentation →
Fallvorstellung) et **B** un seul Teil (`?teil=anamnese`).
Cinq propriétés prouvées : la validation n'a jamais reculé ; le chrono d'une partie
validée ne redémarre pas ; la checklist de fin reprend ce qui a été coché pendant ;
une partie interrompue par un rafraîchissement se reprend avec son brouillon ;
valider deux fois produit un seul enregistrement.

Ce document est **rejouable tel quel** : chaque étape porte son URL, son sélecteur
et la valeur attendue. Aucune étape ne suppose un état laissé par une autre.

---

## 0. Mise en place (à refaire à chaque rejeu)

### 0.1 Serveur

```bash
cd app && rm -rf node_modules/.vite && npm run dev -- --port 5191 --strictPort
```

### 0.2 Le worker Edge doit être TIÈDE, sinon rien ne charge

`.env` du worktree pointe sur Supabase **local** (`http://127.0.0.1:54321`).
Au premier appel, `functions/v1/content` répond **546** puis **502** (le worker
Deno boote en ~5 s et le superviseur annule la requête avant). L'app affiche
alors « Doctopus a besoin d'une connexion pour le premier chargement » —
`main.tsx:84-95`, jeté par `contentLoader.sync()`. Cliquer « Réessayer » ne suffit
pas : chaque rechargement retombe sur un worker froid.

Remède, **à lancer en arrière-plan et à laisser tourner pendant tout le parcours** :

```bash
K=<VITE_SUPABASE_ANON_KEY de app/.env>
while :; do curl -s -o /dev/null \
  "http://127.0.0.1:54321/functions/v1/content?since=0" \
  -H "Authorization: Bearer $K"; sleep 2; done
```

Vérification : `curl -w "%{http_code} %{time_total}\n"` sur la même URL doit rendre
`200` en < 2 s trois fois de suite (mesuré : 5,2 s / 5,5 s / 0,3 s / 0,8 s / 1,3 s —
les deux premières sont le boot).

### 0.3 Cas de travail

La base locale ne porte que **12 cas** (palier gratuit). `case-ulcus`, utilisé par
les preuves antérieures, **n'existe pas** ici. Ce parcours utilise **`case-gib`**
(« Obere GI-Blutung bei Ulcus ventriculi »). Pour lister les cas disponibles :

```js
// playwright-cli eval
async () => {
  const db = await new Promise(r => { const q = indexedDB.open('fsp-cockpit'); q.onsuccess = () => r(q.result); });
  const cs = await new Promise(r => { const q = db.transaction('cases','readonly').objectStore('cases').getAll(); q.onsuccess = () => r(q.result); });
  return cs.map(c => c.id);
}
```

### 0.4 Repartir propre

L'état d'une partie en vol vit dans Dexie `fsp-cockpit` → store `meta`, clé
**`lauf.aktiv`** (`lib/lauf/speichern.ts:20`). Les simulations enregistrées vont
dans le store **`simulations`**.

**Piège** : supprimer `lauf.aktiv` pendant que le runner est monté ne sert à rien —
l'effet de persistance de `useLauf` (`useLauf.ts:95-97`) le réécrit au tick suivant.
Il faut d'abord **quitter le runner**.

```
1. playwright-cli goto "http://localhost:5191/#/stats"      ← on quitte le runner
2. eval : suppression de lauf.aktiv + sessionStorage.removeItem('fsp.simSession')
```

```js
// purge.js — l'étape 2
async () => {
  const db = await new Promise(r => { const q = indexedDB.open('fsp-cockpit'); q.onsuccess = () => r(q.result); });
  await new Promise(r => { const q = db.transaction('meta','readwrite').objectStore('meta').delete('lauf.aktiv'); q.onsuccess = () => r(1); });
  sessionStorage.removeItem('fsp.simSession');
  return 'ok';
}
```

### 0.5 La sonde d'état, utilisée partout ci-dessous

Elle lit **le DOM de l'app et IndexedDB**, jamais un module importé — un
`import("/src/…")` dans une sonde crée une seconde instance de module (≠ `@/…`)
et rend des mesures fausses.

```js
// state.js
async () => {
  const db = await new Promise(r => { const q = indexedDB.open('fsp-cockpit'); q.onsuccess = () => r(q.result); });
  const all = s => new Promise(r => { const q = db.transaction(s,'readonly').objectStore(s).getAll(); q.onsuccess = () => r(q.result); q.onerror = () => r(null); });
  const L = ((await all('meta')) || []).find(x => x.key === 'lauf.aktiv')?.value ?? null;
  const sims = (await all('simulations')) || [];
  const main = document.querySelector('main') || document.body;
  const cb = [...main.querySelectorAll('input[type=checkbox]')];
  return {
    hash: location.hash,
    id: L?.id, zustand: L?.zustand, modus: L?.modus, aktuellerTeil: L?.aktuellerTeil,
    gespielt: L?.teileGespielt, sek: L?.sekundenProTeil,
    ageSec: L?.startedAt && Math.round((Date.now() - L.startedAt) / 1000),
    laufCoches: L ? (L.checkliste||[]).filter(i => i.checked).length + '/' + (L.checkliste||[]).length : null,
    entwurf: L ? Object.fromEntries(Object.entries(L.entwurf||{}).map(([k,v]) => [k, { feeling: v.feeling, grid: v.grid && Object.entries(v.grid).map(([a,b]) => a+'='+b).join(' ') }])) : null,
    domCoches: cb.filter(x => x.checked).length + '/' + cb.length,
    monotags: [...main.querySelectorAll('.mono-tag')].map(e => e.innerText.trim()),
    ranges: [...main.querySelectorAll('input[type=range]')].map(r => r.value),
    btns: [...main.querySelectorAll('button')].map(b => b.innerText.replace(/\s+/g,' ').trim()).filter(Boolean),
    simsGib: sims.filter(s => s.caseId === 'case-gib').map(s => s.id), simsTotal: sims.length,
    pageUptimeSec: Math.round(performance.now()/1000),
  };
}
```

Et l'action, toujours la même forme — on clique **un libellé**, pas une position :

```js
// click.js — remplacer LABEL
async () => {
  const b = [...document.querySelectorAll('button')].find(x => x.innerText.replace(/\s+/g,' ').includes('LABEL'));
  if (!b) throw new Error('bouton introuvable: LABEL');
  b.click(); await new Promise(r => setTimeout(r, 1500));
  return { clicked: b.innerText.replace(/\s+/g,' ').trim(), hash: location.hash };
}
```

---

## Parcours B — un seul Teil (`?teil=anamnese`)

Départ : §0.4 fait, puis
`playwright-cli goto "http://localhost:5191/#/simulation/case-gib/run?teil=anamnese"`.

### B1 — la partie démarre seule, l'automate est en vol

Sonde `state.js` :

| champ | attendu | mesuré |
|---|---|---|
| `zustand` | `laufend` | `laufend` |
| `modus` | `teil` | `teil` |
| `aktuellerTeil` | `anamnese` | `anamnese` |
| `geplant` | `['anamnese']` | `['anamnese']` |
| `laufCoches` | `0/13` | `0/13` |
| chrono affiché | compte à rebours depuis 20:00 | `19:57` |

Le bouton « Terminer la partie ✓ » est présent dans l'en-tête collant dès la
première seconde.

### B2 — cocher DEUX chapitres pendant la partie

La trame d'anamnèse rend **11** `input[type=checkbox]` (un par chapitre).
On coche les indices 0 (`Gesprächseröffnung`) et 2 (`Aktuelle Beschwerden`) :

```js
async () => { const cb = [...document.querySelectorAll('input[type=checkbox]')];
  cb[0].click(); await new Promise(r=>setTimeout(r,400));
  cb[2].click(); await new Promise(r=>setTimeout(r,800));
  return [...document.querySelectorAll('input[type=checkbox]')].map(x=>x.checked); }
```

Attendu : `state.js` → `laufCoches: "2/13"`. **Mesuré : `2/13`.**
Le pont chapitre → item de checklist (`lib/checklists.ts`) fonctionne : 11 chapitres
cochables alimentent une checklist de 13 items.

### B3 — « Terminer la partie ✓ » → **PASS** : la checklist de fin reprend les cases

Clic `click.js` LABEL = `Terminer la partie`. Sonde :

| champ | mesuré |
|---|---|
| `zustand` | `bilanz` |
| `aktuellerTeil` | `anamnese` |
| `laufCoches` (Dexie) | **`2/13`** |
| `domCoches` (DOM du bilan) | **`2/13`** |
| `.mono-tag` rendu | **`2/13`** |
| `.label` rendus | `Checklist de contenu`, `Grille de langue (barème officiel)`, `Ressenti`, `Score de la partie` |

Les deux cases cochées pendant la partie sont **déjà cochées** dans le bilan.
C'est la régression que `PartEvaluation.tsx:14-18` documente comme corrigée
(l'ancien `useState(() => checklistFor(part))` repartait de `checked: false`).

### B3 bis — le raccourci se lit comme une saisie, pas comme une note — **PASS**

Texte exact rendu au-dessus de la liste (`PartEvaluation.tsx:83-94`) :

> Bilan — Anamnese · **Coche ce que tu as réellement fait. Le score se calcule seul.**
> Checklist de contenu — 19 %
> **Raccourci de saisie ·** `2/13`     **Tout cocher**

Trois marques concordantes, toutes lisibles sans survol :
1. la consigne nomme l'acte (« coche ce que tu as **réellement fait** ») ;
2. l'étiquette du contrôle **dit ce qu'il est** — « Raccourci de saisie » ;
3. le verbe du bouton est un verbe de saisie (« Tout cocher »), pas un verbe
   d'évaluation, et il bascule en « Tout décocher » quand tout est coché — donc
   il s'annule d'un geste.

Rendu discret assumé : `text-[11.5px] text-slate-400 underline decoration-dotted`.
Un bouton neutre de notation aurait le poids d'une action principale ; celui-ci a
le poids d'un lien d'aide à la saisie. **Aucune confusion possible avec un score
offert** — et le prix de l'abus est visible : le contenu pèse 55 % de la partie
(`scoring.ts:46`), tout cocher afficherait 100 % de contenu immédiatement.

### B4 — brouillon d'évaluation puis **rafraîchissement** → **PASS**

On remplit le bilan : 5 curseurs de grille (0–5) et le curseur de ressenti (0–100),
plus une troisième case cochée dans le bilan lui-même.

```js
async () => { const main = document.querySelector('main');
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, String(v));
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); };
  const r = [...main.querySelectorAll('input[type=range]')];
  [5,1,4,2,5].forEach((v,i) => set(r[i], v)); set(r[5], 77);
  await new Promise(x=>setTimeout(x,300));
  const un = [...main.querySelectorAll('input[type=checkbox]')].find(x=>!x.checked); un.click(); }
```

État **avant** `page.reload()` :

```
zustand    bilanz          sek        { anamnese: 81 }
laufCoches 3/13            ranges     ["5","1","4","2","5","77"]
entwurf.anamnese { feeling: 77, grid: "aussprache=5 wortschatz=1 grammatik=4 redefluss=2 kommunikation=5" }
```

`playwright-cli reload`, puis attendre que « Bilan » réapparaisse. État **après** :

```
hash       #/simulation/case-gib/run?teil=anamnese   ← même partie
zustand    bilanz                                    ← même phase
sek        { anamnese: 81 }                          ← chrono figé, à la seconde
laufCoches 3/13   domCoches 3/13   mono-tag 3/13
entwurf.anamnese { feeling: 77, grid: "aussprache=5 wortschatz=1 grammatik=4 redefluss=2 kommunikation=5" }
ranges     ["5","1","4","2","5","77"]                ← les 6 curseurs repositionnés
chrono     18:39  (= 20:00 − 81 s)
```

**Identique champ pour champ.** La reprise passe par Dexie `lauf.aktiv`, pas par
`sessionStorage` (qui n'alimente plus que l'affichage de la barre « Reprendre »).

### B5 — valider → **PASS** : on avance, et une seule fois

En Teil seul il n'y a pas de partie suivante : `PartEvaluation` ne rend qu'une
sortie, « **Terminer la simulation →** » (et « Revenir à la partie », dont le
libellé dit l'autre destination). Deux boutons, deux destinations.

On clique **trois fois** le même bouton : deux clics consécutifs sans attente,
puis un troisième 2,5 s plus tard.

| | avant | après |
|---|---|---|
| `hash` | `…/run?teil=anamnese` | `…/run?teil=anamnese&sim=11b7a967-f5c7-4de6-af5b-1bbc221d838d` |
| lignes `simulations` (toutes) | **3** | **4** |
| lignes `simulations` pour `case-gib` | `[]` | `["11b7a967-…"]` |
| `lauf.aktiv` | présent | **`null`** |

**+1 exactement pour trois clics.** L'id enregistré **est** `lauf.id` : l'écriture
est idempotente sur cette clé (`lib/lauf/speichern.ts`, INV-22).

Écran atteint : le bilan **enregistré** — « Encore un effort · score moyen 46 % ·
Anamnese 46 % (contenu 25 % · langue 68 %) · Corrections prioritaires ». Ce n'est
pas l'exercice : la trame de questions a disparu. **« Valider » n'a pas reculé.**

---

## Parcours A — simulation complète, avec la branche Aufklärung

Départ : §0.4 fait, puis
`playwright-cli goto "http://localhost:5191/#/simulation/case-gib/run"` (sans `teil`).

`state.js` : `modus: komplett`, `geplant: ['anamnese','dokumentation','fallvorstellung']`,
`laufCoches: 0/35`, `aktuellerTeil: anamnese`.

### A1 — Anamnese → bilan → Dokumentation : le chrono validé ne bouge plus — **PASS**

```
Terminer la partie ✓        → zustand bilanz, gespielt ['anamnese'], sek.anamnese 312
                              sorties : « Partie suivante — Dokumentation → »
                                        « Terminer la simulation → »
                                        « Revenir à la partie »
Partie suivante — Doku…  →  zustand laufend, aktuellerTeil dokumentation
```

Puis on laisse **16 s** s'écouler dans la Dokumentation et on relit :

```
sek = { anamnese: 312, dokumentation: 44 }
```

`anamnese` est **inchangée au centième de son dernier tick** pendant que
`dokumentation` court sur **son propre** chrono, parti de 0 (affiché 19:16 = 20:00 − 44 s).
L'écran montre la Dokumentation (« Mes notes », « Notes de l'anamnèse ») et la frise
porte « **✓** Anamnese ». On a avancé.

### A2 — branche Aufklärung en plein milieu — **PASS**

Clic sur « Aufklärung » dans l'en-tête, pendant la Dokumentation :

```
aktuellerTeil  aufklaerung          chrono 04:46 (cible 5 min, pas 20)
laufCoches     0/44                 ← la checklist de l'Aufklärung s'ajoute aux 35
sek            { anamnese: 312, dokumentation: 118, aufklaerung: 14 }
```

`Terminer la partie ✓` → bilan de l'Aufklärung, `gespielt: ['anamnese','aufklaerung']`.
La sortie proposée s'appelle « **Partie suivante — Dokumentation →** » : elle nomme
le Teil qu'on avait quitté, pas l'Aufklärung qu'on vient de finir. Clic :

```
aktuellerTeil  dokumentation        chrono 17:47 (= 20:00 − 133 s)
sek            { anamnese: 312, dokumentation: 133, aufklaerung: 92 }
```

Trois choses à la fois : on **revient** sur la Dokumentation inachevée (pas sur
l'Aufklärung finie) ; son chrono **reprend où il était** (118 → 133) au lieu de
repartir de 20:00 ; les chronos de l'Anamnese (312) et de l'Aufklärung (92) sont
**figés**. Aucune validation n'a reculé sur la branche.

### A3 — Dokumentation → Fallvorstellung

```
Terminer la partie ✓ ; Partie suivante — Fallvorstellung →
aktuellerTeil fallvorstellung
gespielt      ['anamnese','aufklaerung','dokumentation']
sek           { anamnese: 312, dokumentation: 254, aufklaerung: 92 }
```

### A4 — DERNIÈRE partie : une seule sortie, un seul enregistrement — **PASS**

`Terminer la partie ✓` → `zustand bilanz`, `gespielt` contient les quatre Teile.
Les boutons du bilan **ne contiennent plus de « Partie suivante »** — la seule
sortie avant est « **Terminer la simulation →** ». C'est `terminerLabel` quand
`suivant === null` (`PartEvaluation.tsx:33`).

Chronos juste avant de valider :
`{ anamnese: 312, dokumentation: 254, aufklaerung: 92, fallvorstellung: 398 }`
pour un `Lauf` âgé de 1 359 s — la somme (1 056 s) est **inférieure** à l'âge, ce qui
est la signature d'un chrono par partie qui ne court que quand sa partie est active.

Trois clics sur « Terminer la simulation → » (deux consécutifs, un troisième 2,5 s après) :

| | avant | après |
|---|---|---|
| `hash` | `…/case-gib/run` | `…/case-gib/run?sim=9c19fcea-419d-4c8f-9810-b3a66be87a9d` |
| lignes `simulations` | **5** | **6** |
| `case-gib` | 2 ids | 3 ids, le nouveau = `lauf.id` |
| `lauf.aktiv` | présent | **`null`** |

Écran atteint : « Encore un effort · score moyen 22 % », **les quatre parties
listées** (Anamnese 26 %, Aufklärung 26 %, Dokumentation 10 %, Fallvorstellung 26 %).
La dernière validation d'un run complet mène au bilan enregistré, pas à l'exercice.

---

## Le défaut trouvé pendant ce parcours, et corrigé

**Le chrono d'une simulation neuve héritait de la précédente.**

Constaté à l'étape §Parcours A : un `Lauf` créé depuis **119 s** portait **194 s**
d'Anamnese. Reproduit deux fois de suite.

Cause. `SimulationRunner.tsx` montait `<SimTimer key={partKey} …>`. En enchaînant
deux simulations **sans recharger la page** — bilan enregistré, puis nouvelle
simulation dont le premier Teil est le même — la `key` ne changeait pas, donc
React **ne remontait pas** `SimTimer` : il gardait son `elapsed` de la simulation
précédente. Son premier tick écrivait cette valeur dans le `Lauf` tout neuf, et la
garde monotone de `tickChrono` (`lib/lauf/automat.ts:141-145`, INV-28) — qui existe
pour qu'un remontage ne « remette pas au début » — la gravait définitivement.

Correction (commit `fa558d2`) : `key={`${lauf.id}:${partKey}`}`. L'identité d'un
chrono, c'est (partie **de cette simulation**), pas (partie).

Contre-preuve, **même parcours rejoué après correction** :

| | avant correction | après correction |
|---|---|---|
| âge du `Lauf` neuf | 119 s | 32 s |
| `sek.anamnese` du `Lauf` neuf | **194 s** | **32 s** |
| page rechargée entre les deux runs ? | non (`performance.now()` = 111 s) | non (idem) |

---

## Résumé

| Propriété | Parcours | Verdict |
|---|---|---|
| « Valider la partie » n'a jamais reculé — Teil seul | B5 | **PASS** |
| … dernière partie d'un run complet | A4 | **PASS** |
| … branche Aufklärung | A2 | **PASS** |
| Le chrono de la partie validée ne redémarre pas | A1, A2, B4 | **PASS** |
| La checklist de fin reprend les cases cochées pendant | B3 | **PASS** |
| « Tout cocher » se lit comme un raccourci de saisie | B3 bis | **PASS** |
| Partie interrompue par un rafraîchissement, brouillon compris | B4 | **PASS** |
| Valider deux fois = un seul enregistrement | B5 (3 clics), A4 (3 clics) | **PASS** |

---

## Non vérifié

- **Deux onglets simultanés** (médecin + simulant, `/#/patient/:caseId`). Le
  protocole `fsp-patient-sync` et le `BroadcastChannel` ne sont pas dans le
  périmètre d'écriture de ce chantier et n'ont pas été exercés ici.
- **Le chemin `pickSession.ts`** (choix du cas depuis le hub) : exclu du périmètre,
  parcours entré par URL directe.
- **La reprise après fermeture complète du navigateur** (et non un simple
  `reload`) : `lauf.aktiv` vit dans Dexie et devrait survivre, non mesuré.
- **Le rendu visuel** : les polices tombent sur le repli système, le worktree
  partage `node_modules` avec `Claude FSP/app` et Vite rend **403** sur
  `@fs/.../ibm-plex-sans-latin-wght-normal.woff2`. Sans incidence sur les
  critères fonctionnels ci-dessus, aucun jugement de mise en page n'est porté.
- **Les classes du système de design** `.btn-glass`, `.panel` et les tokens
  d'élévation sont consommés par cette branche mais **livrés sur
  `feat/s3-primitives`** : les surfaces concernées retombent sur leur rendu de
  repli tant que le merge n'est pas fait.
- **Un cas payant** : la base locale n'expose que les 12 cas du palier gratuit.
  Les parties d'un cas premium n'ont pas été jouées.
