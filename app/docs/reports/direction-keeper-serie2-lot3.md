# direction-keeper — Série 2, lot 3 (FB2-O1 à O6 : éradiquer l'AI slop)

> Revue faite le 17 sept. 2026 sur `main` @ `ea27d7a` (commits revus :
> `b2f7984` charte/ADR-0016, `674d87c` contrôles de phrase). Doctrine :
> `app/docs/DIRECTION-STYLE.md` §4. Mesures : `git`, `gh run list/view`,
> `curl` sur le bundle GitHub Pages, DOM de l'app via `playwright-cli -s=keeper`
> headless sur le Vite local (5173) avec `getComputedStyle` (jamais de module
> importé par une sonde), greps documentées. Cas joués : `case-gib`
> (homme, 71 ans, Rentner, ex-fumeur, douleur épigastrique) et `case-zystitis`
> (femme, 26 ans, Erzieherin, fumeuse, brûlures mictionnelles). Lecture seule.

## Verdict court

Le fond du lot est **juste et vérifié dans le DOM** : `.label`/`.eyebrow` en
Plex Sans, plus aucun `text-transform: uppercase` sur 5 pages (clair et
sombre) ; le contrôle de variantes est un lien gris 11 px sans bordure ni fond,
la liste n'a plus d'option « Standard » ; la variante choisie survit au
rechargement, est reprise en mode focus et **d'un cas à l'autre** ; l'icône
bulle porte `title` + `sr-only` ; la relance n'a plus ni « ↳ » ni ambre ;
« Rauchen Sie ? » est un seul contrôle Ja / Aufgehört / Nie et « Aufgehört »
ouvre la bonne relance — pertinent pour Werner Klein (ex-fumeur) comme pour la
patiente de 26 ans (fumeuse). Mais **le lot a mis la CI au rouge** (test
`variantPrefs.test.ts` qui plante hors `.env`), un `sed` aveugle a laissé
`font-boldst` dans le bundle live, et le compteur « Formulation 1 sur 2 »
recompte la standard qu'on vient de retirer de la liste. Trois fautes
d'application, pas de conception.

---

### [BLOQUANT] Workflow « Qualité » rouge depuis `674d87c` — le « fait » n'est pas vert
- **Où** : `.github/workflows/quality.yml` job « Types & build », étape `npx vitest run --dir src` ; `app/src/lib/variantPrefs.ts:1-2`
- **Constat** : `variantPrefs.ts` importe `AUTH_MODE` depuis `@/lib/auth/session`, qui importe `@/lib/supabase`, qui lève à l'import quand `VITE_SUPABASE_URL` manque. En CI (pas de `.env`), le test échoue ; en local il passe grâce à `app/.env` — le « tests verts » de l'implémenteur était un faux vert. Le job s'arrête avant `npm run build`.
- **Preuve** : `gh run list` → `35169363389` (`674d87c`) **failure**, `35169381969` (`ea27d7a`) **failure** ; `gh run view 35169381969 --log-failed` → `FAIL src/lib/variantPrefs.test.ts … Error: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants` ; `Test Files 1 failed | 32 passed`. Localement, `env -u VITE_SUPABASE_URL npx vitest run src/lib/variantPrefs.test.ts` → `3 passed` (le `.env` est chargé par Vite : `ls app/.env` existe).
- **Correctif** : dans `variantPrefs.ts`, ne pas importer `session.ts` ; lire `import.meta.env.VITE_AUTH_MODE === 'founder'` directement (ou déplacer `AUTH_MODE` dans un module feuille sans effet de bord, ex. `lib/auth/mode.ts`, et l'importer des deux côtés). Re-pousser, exiger `Qualité` vert avant de remonter « fait ». Le déploiement Pages ne dépend pas de `Qualité` : c'est ce qui a laissé passer le bundle — à discuter (gate `needs:`).

### [BLOQUANT] `font-boldst` : classe Tailwind cassée par un remplacement aveugle, visible en prod
- **Où** : `app/src/features/simulation/ImmersiveMode.tsx:233` ; bundle live `https://mhdbkr.github.io/fsp-trainer/assets/index-C8_8XACQ.js` (`grep -c font-boldst` = 1)
- **Constat** : `font-bold uppercase tracking-widest` → `sed` a retiré « uppercase tracking-wide » et laissé `font-boldst`. Le chip de libellé en mode focus (« Technique pro », « Schlüsselfrage », « Alarmzeichen »…) n'est plus gras : c'est exactement « ça m'énerve de te voir faire des fautes pareilles, applique-toi ».
- **Preuve** : DOM en focus, chapitre Persönliche Daten, item 4 : `{"cls":"mt-4 inline-block rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-boldst text-brand-300","fw":"400"}` — poids calculé **400** au lieu de 700.
- **Correctif** : `font-boldst` → `font-bold`. Porte CI : un test/lint qui échoue sur toute classe `font-(bold|semibold|medium)[a-z]+` ou, mieux, activer `eslint-plugin-tailwindcss/no-custom-classname` sur `src/`.

### [MAJEUR] « Formulation 1 sur 2 » recompte la standard que FB2-O2 vient de sortir de la liste
- **Où** : `app/src/components/PhraseControls.tsx:61` : `` `Formulation ${idx + 1} sur ${alts.length + 1}` ``
- **Constat** : après choix, le contrôle affiche « Formulation 1 sur 2 » alors que la liste ouverte ne contient qu'**un** item numéroté « 1 » (l.95 `index={i + 1}`, la standard n'y est plus). Le « +1 » est la logique de développeur que Mehdi a rejetée dans O2, déplacée du menu vers le compteur.
- **Preuve** : DOM runner `case-gib`, item 2 : `btn: "Formulation 1 sur 2"` ; liste : `opts: [{"t":"1Ich möchte gern das Aufnahmegespräch…"}]` (un seul `role=option`, `hasStandard: false`).
- **Correctif** : au repos après choix, un libellé sans dénominateur — « Formulation 1 » ou simplement le nombre d'autres formulations restantes (« 1 autre formulation ») ; le badge « retenue » sur la phrase dit déjà l'état. Ne pas afficher deux compteurs contradictoires.

### [MAJEUR] La liste de variantes expose une relance conditionnelle déguisée en « autre formulation » — et permet de la « retenir »
- **Où** : `app/src/data/guides/anamneseChapters.ts:259-261` : `text: 'Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?'`, `alts: ['Falls in Rente: Was haben Sie früher beruflich gemacht?']`
- **Constat** : ce n'est pas une formulation équivalente, c'est une condition (« Falls in Rente ») rangée dans `alts`. Le nouveau picker l'affiche comme « 1 autre formulation », et `variantPrefs` la mémorise comme formulation par défaut si on la clique : le candidat se retrouve à ouvrir chaque simulation par « Falls in Rente : … ». Pour `case-gib` (71 ans, `fam-beruf` l.699 : « Ich bin Rentner ; früher habe ich ganz normal gearbeitet ») c'est précisément la question qui devait s'adapter ; lot 2 (`21972c5`, FB2-J2) a retouché cette même question sans la voir.
- **Preuve** : DOM runner, chapitre Familien- & Sozialanamnese : « Was sind Sie von Beruf? … » suivi de « 1 autre formulation » ; source citée ci-dessus. `grep -n "alts: \['Falls" anamneseChapters.ts` → 1 occurrence (l.261) ; l.277 `text: 'Falls in den Wechseljahren: …'` est le même défaut sur un `text`.
- **Correctif** : déplacer l.261 en `followUp: ['Falls in Rente: Was haben Sie früher beruflich gemacht?']` (toggle « In Rente / Nein ») ; l.277 → `text` sans préfixe + `followUp`. Porte CI dans `checkGuideDuplicates.mjs` : échec si un `alts[]` ou un `text` commence par `Falls `.

### [MAJEUR] Toggle « Die Periode schon aufgehört hat / Nein » — un libellé de bouton qui est une phrase
- **Où** : `app/src/data/guides/anamneseChapters.ts:540` : `followUp: ['Falls die Periode schon aufgehört hat: Hatten Sie seitdem noch einmal eine Blutung?']` ; `followUp.ts:41` (le fallback « la condition devient le libellé »)
- **Constat** : le parseur produit `kind: 'ja', label: 'die Periode schon aufgehört hat'` → `Seg` affiche « Die Periode schon aufgehört hat » à côté de « Nein ». C'est la revue « tous les `kind: 'ja'` dont le label n'est pas une réponse oui » demandée par FB2-J3, non faite jusqu'au bout ; `checkGuideDuplicates` ne l'attrape pas (pas un synonyme).
- **Preuve** : `grep -oE "Falls [^:]{2,40}:" anamneseChapters.ts | sort | uniq -c` → `1 Falls die Periode schon aufgehört hat:` ; `parseFollowUp` l.41 `return { kind: 'ja', label: cond, question }`.
- **Correctif** : `Falls in den Wechseljahren:` ou `Falls aufgehört:` (deux mots max), ou `kind: 'wahl'` « Regelmäßig / Aufgehört ». Porte CI : échec si un label de toggle situationnel dépasse 3 mots.

### [MAJEUR] Aucun validateur pour l'avenir sur O5/O6 : le mono-capitales et l'orange peuvent revenir demain
- **Où** : `.github/workflows/quality.yml` (9 portes contenu, 0 porte charte) ; `docs/adr/0016…md` « grep uppercase = 0 » (fait à la main, une fois)
- **Constat** : la doctrine §4.7 exige la porte CI. Le retrait de `uppercase`, du `font-mono` en libellé, des `amber` sur `PhraseControls` n'est protégé par rien ; `GuidesPage.tsx:78` parle encore de « variantes équivalentes (⇄) et ses relances (↳) », deux glyphes qui n'existent plus dans l'UI, et `PhraseControls.tsx:123` commente encore « accent ambre » — preuves que rien ne relit ces surfaces.
- **Preuve** : `grep -rln "uppercase\|font-mono" app/scripts .github` → vide ; `grep -rn "uppercase" app/src` (hors tests) → 0 aujourd'hui, sans garde.
- **Correctif** : `app/scripts/checkCharte.mjs` (exit 1) : (1) aucun `uppercase` dans `src/**/*.tsx|css` ; (2) `font-mono` autorisé seulement sur un élément dont le contenu est chiffre/chrono/code — à défaut, liste blanche de fichiers ; (3) aucun `amber|orange` dans `PhraseControls.tsx`, `PhraseLine.tsx` ; (4) aucune classe `font-*` inconnue. Corriger `GuidesPage.tsx:78` et le commentaire l.123.

### [MINEUR] Libellés qui ont perdu leur casse CSS et se lisent bizarrement en minuscule
- **Où** : `SimulationSetup.tsx:64` « conseillée » (badge pétrole sur le bouton Couche) ; `ProgramPage.tsx:188` « prêt·e » (sous « 72 % ») ; `ProgramPage.tsx:357` « ajouté » (tag) ; `HomePage.tsx:70` « jours de suite »
- **Constat** : un badge ou un tag isolé s'écrit avec une majuscule (« Conseillée », « Ajouté ») ; « prêt·e » sous un pourcentage passe en minuscule mais « Prêt·e » est plus net ; « jours de suite » sous le chiffre est une unité, la minuscule est juste — mais le chiffre est « 1 » et le texte dit « jours » (pluriel figé).
- **Preuve** : DOM accueil : `"jours de suite [10px/600]"` sous `streak = 1` ; source citée. L'ADR-0016 les avait notés « à relire au fil de l'eau » : c'est ce fil de l'eau.
- **Correctif** : « Conseillée », « Ajouté », « Prêt·e » ; « jour{s} de suite » pluralisé selon `streak`.

### [MINEUR] Trois signaux pour un seul état « variante retenue »
- **Où** : `PhraseLine.tsx:52` badge « retenue » ; `PhraseControls.tsx:61` « Formulation 1 sur 2 » ; `PhraseControls.tsx:66-69` « ↺ standard »
- **Constat** : au repos, la ligne montre la phrase + « retenue », puis dessous « ⑂ Formulation 1 sur 2  ↺ standard ». Discret (tout en slate-400, 10-11 px, mesuré), mais c'est trois mots pour dire une chose ; Mehdi lit « gonflé » quand ça se répète sur 40 phrases.
- **Preuve** : DOM `case-gib` item 2 : `retenue {fs:10px, c:rgb(148,163,184)}`, `btn "Formulation 1 sur 2" {fs:11px, c:rgb(148,163,184)}`, `std "standard" {fs:11px}`.
- **Correctif** : garder « retenue » sur la phrase et « ↺ standard » ; le bouton de liste redevient « n autres formulations » quel que soit l'état (cf. MAJEUR compteur).

### [MINEUR] Le bloc toggle reste une boîte bordée et teintée sous chaque question
- **Où** : `PhraseControls.tsx:157` : `rounded-lg border p-2 … border-slate-200/80 bg-slate-50/60`
- **Constat** : O1 visait les variantes, et c'est réglé ; mais chaque relance conditionnelle reste dans un cartouche gris à bordure. Sur un chapitre à 4 toggles (Vegetativ), quatre cartouches se remarquent « dans la vue d'ensemble ». Pas un retour de défaut signalé — un candidat au prochain.
- **Preuve** : DOM Noxen `case-gib` : `box: {border: "1px rgba(226,232,240,0.8)", bg: "rgba(248,250,252,0.6)", radius: "8px", pad: "8px"}`.
- **Correctif** : à soumettre à `front-design-keeper` : filet gauche pétrole + icône bulle, sans fond ni bordure, aligné sur le style de la relance révélée.

---

## Check-list §4 — point par point

1. **Raisonnement sur le cas** — `case-gib` (h, 71, Rentner, ex-fumeur : `nox-rauchen` l.699 « vor 10 Jahren aufgehört ») et `case-zystitis` (f, 26, fumeuse : l.9420 « Ich rauche, seit ich 18 bin »). Le contrôle à 3 états a un sens pour les deux (Aufgehört / Ja) : DOM identique `["Ja","Aufgehört","Nie"]` sur les deux cas ; Frauenanamnese affichée sur zystitis, absente sur gib. **Mais** la question Beruf reste inadaptée au Rentner (MAJEUR ci-dessus).
2. **Doublons et synonymes** — `grep "followUp: \["` scripté : une seule phrase avait deux `Falls` différents (Rauchen, l.218), fusionnée. Aucun toggle synonyme (`checkGuideDuplicates` règle 3). Un toggle-phrase (l.540, MAJEUR).
3. **Anti-slop** — Variantes au repos : `color rgb(148,163,184)`, `11px`, `border 0`, `bg transparent`, `padding 0`, icône `branch` 12 px ; phrase à 14 px `rgb(30,41,59)` : la phrase est la vedette. Focus : 13 px slate-500, idem. Avant (`674d87c^`) : pilule `rounded-full border border-brand-200 bg-brand-50 text-brand-700` avec « ⇄ 1 variante » + chevron, et liste en carte blanche bordée avec option « Standard » en italique. Mehdi ne dirait plus « imposant » sur ce contrôle. Relance : `border-left 1px rgba(107,189,176,0.7)`, pas de « ↳ », `hasAmber: false`. Mono en libellé : 0 sur accueil / cas / fachwissen / programme / runner (seul mono textuel : `⌘K` en `.kbd`, légitime). `uppercase` : 0 partout, clair et sombre (`dark: true`, labels `rgb(148,163,184)` Plex Sans).
4. **Concision** — Volume stable ; le libellé « Antwort des Patienten » devient une icône ; seul ajout de texte : « retenue » (10 px) et « Formulation n sur m » (à réduire, MINEUR/MAJEUR).
5. **Personnalisation** — Oui : préférence par phrase, par compte en mode fondateur, reprise après reload (`retenueVisible: true`), en focus (« 2 / 4 » affiche la variante retenue) et sur un autre cas (`carriedToGib: true` après choix sur zystitis). `clearPreferredVariants` existe mais **n'est branché sur aucun réglage** (grep : 0 usage hors test) — le critère O3 « remise à zéro depuis les réglages » n'est pas livré.
6. **Déployé et vérifié en prod** — Poussé (`origin/main == ea27d7a`), Pages déployé sur `ea27d7a` (le run de `674d87c` a été annulé, superseded), bundle live contient `doctopus-variants`, « Revenir à la formulation standard », `.label{font-size:11.5px;font-weight:600…}` — et `font-boldst`. **Qualité rouge** sur les deux derniers pushes → statut « pas fait » au sens de la doctrine.
7. **Validateur pour l'avenir** — Test unitaire pour la fusion `zweig` (ok) ; rien pour O5/O6 ni pour les classes cassées (MAJEUR).

## Ce qui change vs `674d87c^` (pour capture avant/après impossible)

| | Avant | Après (mesuré) |
|---|---|---|
| Bouton variantes | pilule bordée `brand-50`, « ⇄ 1 variante » + chevron | lien gris 11 px, icône branche, « 1 autre formulation », sans bordure/fond |
| Liste | carte blanche bordée, « Standard » italique en tête | filet gauche 1 px, items numérotés, pas de « Standard » |
| Badge sur la phrase | `font-mono uppercase` « VARIANTE 1 » pétrole | « retenue » Sans 10 px gris |
| Libellé toggle | texte « Antwort des Patienten » en `.label` mono-caps | icône bulle 14 px + `title` + `sr-only` |
| Relance | `border-l-2 amber-300` + « ↳ » ambre | `border-l 1px brand-300/70`, sans glyphe |
| Rauchen | 2 toggles empilés « Ja/Nein » puis « Aufgehört/Nein » | 1 seg « Ja / Aufgehört / Nie » |

## Mehdi dirait :

« C'est propre, enfin la phrase respire — mais “Formulation 1 sur 2” avec une seule ligne dans la liste, un `font-boldst` en prod et la CI rouge, c'est encore du vibecodé : applique-toi, et mets un validateur pour que ça ne revienne pas. »

## Non vérifié

- Capture avant/après visuelle (pas de screenshot ; comparaison faite sur le code de `674d87c^` et le DOM après).
- `case-gerd` et `case-pankreatitis` : `#/simulation/<id>/run` reste sur « Chargement… » dans ce navigateur (12 cas seulement listés dans `#/cas`, base locale partielle) ; le second cas a donc été `case-zystitis`, pas une patiente non-douleur.
- Le comportement `nie` (« Keine Rückfrage nötig — weiter. ») lu dans le code, pas cliqué.
- La liste `alts` en focus (navigation ↑/↓) — non testée au clavier.
- Le CommandPalette : ouvert (`Meta+k`), en-têtes mesurés en Sans 10 px/500, mais je n'ai pas contrôlé les 94 usages de `.label` un par un ; sondés : sidebar « Centre visé » (11.5/600 vs select 12/400), Muster-Bogen (« Muster-Bogen » 11/600 pétrole, titre 14/700, « Stichpunkte » 12/500), guide (« Guide de questions » 11.5/600 vs h3 16/600) — aucune inversion de hiérarchie trouvée.
- Les 2 occurrences `uppercase` du bundle live n'ont pas été attribuées (CSS de lib ou test) — 0 dans `app/src` hors tests.
- Synchronisation des préférences entre appareils (`progress_events`) : annoncée dans le commentaire, non implémentée, hors périmètre du lot.
