# ANALYSE_ITERATION2.md — Relecture ciblée & conception (Itération 2)

> Document de PHASE 0. **Aucun code avant ta validation.** Il consigne ce que la relecture des ressources m'a appris, mes décisions de conception par module, l'analyse des options du plugin dictionnaire/IA (Module 5), et une section **Propositions**.
>
> Convention conservée : **interface FR, termes médicaux DE**. Skills à mobiliser en construction : `superpowers` (brainstorming → writing-plans → TDD → verification), `frontend-design` + `ui-ux-pro-max` sur chaque écran.

> **PRINCIPE TRANSVERSAL AJOUTÉ (retour user) — App illustrative, anti-mur-de-texte.** Le candidat ne doit jamais se perdre dans des blocs de texte. Partout : privilégier **illustrations médicales / pictogrammes SVG**, **iconographie par chapitre d'anamnèse et par spécialité**, **blocs colorés et cartes** plutôt que paragraphes, **mindmaps**, **jauges/steppers/progress visuels**, schémas simples (corps humain, systèmes d'organes), codes couleur cohérents. Le texte dense est replié (toggles) ou remplacé par des repères visuels. Objectif : lisibilité immédiate, hiérarchie visuelle forte, apprentissage par l'image. → à appliquer sur **chaque écran** avec `frontend-design` + `ui-ux-pro-max`.

---

## 0. Sources relues (et méthode)

| Source | Ce que j'en tire pour l'itération 2 |
|---|---|
| **`ArztbriefVorstellung_2.pdf`** (ODAK V4) | Ordre EXACT des chapitres de la Vorstellung/Arztbrief (I→XII + Diagnostik/Procedere) + **Redewendungen par chapitre** (plusieurs alternatives) + exemple de Muster-Bogen manuscrit (p. 8). |
| **`Anamnese__V4__ODAK_2.pdf`** | Agencement du Muster-Bogen ODAK (sections I→XII) — support des Notizen refondues. |
| **4 `*Anamnesebogen FSP.pdf`** (rendus en images) | **Layout réel des Muster-Bogen par ville** (Freiburg / Karlsruhe / Reutlingen / Stuttgart) — differences concrètes ci-dessous. |
| **Livre Rogoveanu** | Kommunikative Strategien (6 situations, 2.4.1–2.4.6) ; Spezielle Anamnese (Schmerzanalyse + 13 spécialités, 2.2.1–2.2.14) ; squelette Aufklärung (7 blocs) × 16 actes (5.1–5.16). |
| **PDF ODAK spécialité** (Kardio, Uro, Hämato, Schilddrüse) | Contenu **Fachwissen** (Definition/Diagnostik/Therapie) — pas des questions d'anamnèse. La Fachanamnese vient du **livre** (2.2.x). |
| **Protocoles centres** | Vraies questions patient/examinateur (déjà exploitées) + confirment le pattern des Bogen par ville. |

---

## 1. Fallvorstellung & Arztbrief — structure exacte (source ArztbriefVorstellung_2)

**Ordre des chapitres (numérotation ODAK)** — c'est l'ossature à dérouler en mode Assisté (toggles cochables), et à « avoir en tête » en mode Autonome :

1. **I. Persönliche Daten** — Name, Alter, Größe, Gewicht.
2. **VIII. Aktuelle Beschwerden** *(dit en premier à l'oral)* — phrase-cadre : « *Herr/Frau X ist ein/e …-jährige/r Patient/in, der/die sich heute … in der Notaufnahme wegen [Genitiv : seit/vor … aufgetretener + persistierender/rezidivierender + Charakter + Schmerzen + Lokalisation + mit Ausstrahlung in (Akk.)] vorgestellt hat.* » + évolution (plötzlich/langsam, verschlechtert/verbessert), intensité (…/10), Auslöser/Verstärker/Linderer, Vormedikation, ähnliche Beschwerden (bejaht/verneint), **Begleitsymptome (1–6)**, vegetative Anamnese (unauffällig bis auf … / auffällig : …), Fragen bejaht/verneint.
3. **II. Allergien** — « *seien keine Allergien bekannt* » / « *eine XXX-Allergie sei bekannt, auf die er/sie mit … reagiere* ».
4. **III. Rauchen** — aktuell/Nichtraucher/Ex-Raucher/frühere Gewohnheiten (« *… py* »).
5. **IV. Alkohol** — kein/gelegentlich/regelmäßig (« *Alkoholkonsum* », jamais *-abusus*).
6. **V. Drogen** — kein/aktuell keiner/früher (Marihuana…).
7. **VI. Sozialanamnese** — Beruf, Stress, Familienstand, Kinder, Wohnsituation.
8. **VII. Familienanamnese** — « *Die Mutter leide an … (Dativ)* » / « *Der Vater sei an … gestorben* ».
9. **IX. Vorerkrankungen / Voroperationen** — « *Folgende Erkrankungen seien bekannt : …* » ; « *Z. n. … im Jahr …* ».
10. **X. Medikation** — Name / Dosierung / Frequenz (0-0-0) ; « *… bei Bedarf* ».
11. **XI. Impfung / Reiseanamnese** — vollständig/unbekannt/nicht komplett.
12. **XII. Frauenanamnese** — Gravidität, Periode, Kontrazeptiva.
13. **Diagnostik & Procedere** *(clôture)* :
    1. **Verdachtsdiagnose** : « *Die anamnestischen Angaben deuten am ehesten auf … hin.* » (≥ 5 variantes).
    2. **Differentialdiagnosen** : « *Als Differentialdiagnosen kommen in Betracht : …* ».
    3. **Körperliche Untersuchung** (erste Maßnahme) + Vitalparameter.
    4. **Weitere Diagnostik** : A. Labor (BB, CRP/BSG, Krea/Harnstoff, Elektrolyte, Leberwerte…), B. Apparativ (EKG, Sono/Duplex, Endoskopie, CT/MRT…).
    5. **Therapie** (si VD confirmée) : A. stationär/ambulant, B. medikamentös, C. chirurgisch, D. allgemeine Maßnahmen (Nikotinkarenz, Gewichtsnormalisierung, Patientenschulung…).

→ **Conséquence design** : la Fallvorstellung (Module 2, Assisté) déroule **ces 13 chapitres** en toggles, chacun exposant **ses Redewendungen alternatives** (mots-clés en surbrillance, cliquables vers Fachbegriffe), cochables au fur et à mesure. **Aucune trame orale auto-générée** — le candidat lit/apprend et dit lui-même. Le guide Arztbrief partage la même ossature (mais rédigé, Konjunktiv I / Passiv).

### 1.1 Formats de présentation de la Fallvorstellung (arbitrage demandé)
Tu proposais mindmap / curseur progressif / etc. Décision retenue — **format hybride « à couches »**, un même contenu, 2 vues commutables + un fil de progression :
- **Vue « Ablauf » (par défaut, curseur progressif)** : un **stepper vertical des 13 chapitres**. Le chapitre actif s'ouvre (accordéon), montre ses **Redewendungen alternatives** (mots-clés surlignés + liens Fachbegriffe) ; on **coche** le chapitre → le curseur avance et une **barre de progression « chapitres maîtrisés »** se remplit. C'est le cœur du *par cœur* : réciter → cocher → avancer.
- **Vue « Mindmap » (alternative mémorisation)** : carte radiale — centre = le cas, branches = les 13 chapitres, feuilles = Redewendungen-clés. Sert de récapitulatif visuel et d'ancrage mnésique (clic sur une branche = focus/rappel).
- **Assisté** : Redewendungen visibles + cochables. **Autonome** : seuls les titres de chapitres, chaque Redewendung révélée à la demande (« flash »), le curseur suit quand même la progression.
- Alimente le **Redewendung-Trainer** (proposition §10.3) via SM-2.

---

## 2. Anamnese Muster-Bogen — layout ODAK + les 4 Muster par ville

### 2.1 Constat structurant (très important)
Les Bogen officiels **ne sont PAS un formulaire d'anamnèse complet**. Ils pré-impriment uniquement les **données de fond « statiques »** ; l'**anamnèse dynamique du motif** (Aktuelle Beschwerden, vegetative Anamnese, Vorerkrankungen) va dans l'espace **Bericht/Brief** libre (p. 2). Donc :
- Le **Bogen p.1** = capture structurée des données stables.
- Le **Bericht p.2** = le candidat rédige (Anamnese résumée + VD + Diagnostik + Therapie).

### 2.2 Layout par ville (relevé sur les PDF rendus)

| Ville | En-tête | Sections pré-imprimées p.1 | Consigne | p.2+ |
|---|---|---|---|---|
| **Freiburg** | Name / Alter / Gewicht / Größe · Datum | Allergien/Unverträglichkeiten · **Noxen** · Sozialanamnese · Familienanamnese | (libre) | p.2 = « **Brief** » (libre) |
| **Karlsruhe** | *Berichtsbogen – FSP* (Muster) ; Patient/in (boîte) + Datum (jj.mm.aaaa) ; Alter / Größe / Gewicht (boîtes) | Allergien/Unverträglichkeiten · **Genussmittel/Drogen** · Sozialanamnese · Familienanamnese | — | p.2 = Bericht : **Anamnese / Verdachtsdiagnose / weitere Diagnostik / Therapievorschläge**, en **ganzen Sätzen**, « *Angaben der ersten Seite nicht wiederholen* » |
| **Reutlingen** | *Berichtbogen – FSP Reutlingen* (Muster) ; Name / Geburtsdatum ; Alter / Größe / Gewicht | Allergien/Unverträglichkeiten · **Medikamente** *(box en plus !)* · Noxen (Genussmittel / Drogen) · Sozialanamnese · Familienanamnese | « *in kurzen **Stichpunkten*** » | 4 pages (notes + Bericht) |
| **Stuttgart** | *Berichtbogen – Fachsprachenprüfung* ; Name / Geburtsdatum ; Alter / Größe / Gewicht (pointillés) | Allergien/Unverträglichkeiten · **Genussmittel/Drogen** · Sozialanamnese · Familienanamnese | « *in kurzen **Stichpunkten*** » | 4 pages |

**Différences à encoder** : (a) libellé Noxen : « Noxen » (Fr/Reu) vs « Genussmittel/Drogen » (Ka/St) ; (b) Reutlingen ajoute **Medikamente** ; (c) style de saisie attendu : **ganze Sätze** (Karlsruhe) vs **Stichpunkte** (Reutlingen/Stuttgart) ; (d) Karlsruhe = champs encadrés, Stuttgart/Reutlingen = lignes pointillées.

### 2.3 Muster-Bogen ODAK (manuscrit, p.8 de ArztbriefVorstellung)
En-tête (Name Alter Geburtsdatum Größe Gewicht) → **Hauptbeschwerde** (Ort / Dauer / Charakter / Verlauf / Intensität / Ausstrahlung) → **Vegetativ** (bloc) → **Vorerk | Vorop | Medik** (3 colonnes) → **Sozial** → **Familie** → **Allergie | Unvert** → **Impfung** → **Noxen** (Rauchen / Drogen) → **FRAUEN**. C'est le Bogen « pédagogique » complet (couvre l'anamnèse dynamique), à proposer comme Muster « ODAK » en plus des 4 villes.

→ **Conséquence design (refonte Notizen, Module 2)** : un composant **Anamnese-Bogen** avec :
- **Sélecteur de Muster** : ODAK (complet) · Freiburg · Karlsruhe · Reutlingen · Stuttgart — reproduisant l'agencement et les libellés de chacun.
- **Assisté** : sections visibles avec micro-guidage (placeholder = questions-clés du chapitre).
- **Autonome** : agencement épuré, sections repliées/« en tête », pas de guidage permanent.
- Sortie = un **Anamnese-Bogen** proche du vrai document (utile pour Doku ET Fallvorstellung, sans génération auto du courrier).

---

## 3. Kommunikative Strategien (livre 2.4) — 6 situations
1. **Patient ohnmächtig/bewusstlos** (2.4.1) · 2. **keine Krankheitseinsicht** (orientation, 2.4.2) · 3. **verweigert Zusammenarbeit** (veut l'OA, 2.4.3) · 4. **spricht nicht klar** : zu schnell / zu langsam / zu leise / Dialekt / unterbricht / zu ausführlich (2.4.4) · 5. **fordert sofortige Diagnose** (2.4.5) · 6. **fordert sofortige Therapie** (2.4.6).
→ **Design** : (a) attachées aux cas correspondants comme *répliques déclenchables* de la fiche patient ; (b) **guide d'entraînement dédié** « Schwieriger Patient » avec les parades (répliques modèles) et un mode drill (situation tirée → formuler la parade).

## 4. Spezielle / Fachanamnese par spécialité (livre 2.2) — 14 blocs
Schmerzanalyse (OPQRST, 2.2.1) + **Kardiologie · Pneumologie · Gastroenterologie · Nephrologie · Neurologie · Frauenheilkunde · Sexualanamnese · Hautheilkunde · Orthopädie (DMS) · Hämatologie · Onkologie · Infektiologie · Psychiatrie** (2.2.2–2.2.14), chacun avec ses questions et Risikofaktoren.
→ **Design** : sous-guides de **Fachanamnese** ; en simulation, si le cas ∈ spécialité, un **sous-chapitre extra** « Fachanamnese [Spécialité] » s'affiche après l'Allgemeine Anamnese (Assisté : déroulé ; Autonome : raccourci).

## 5. Aufklärung (livre chap. 5) — 7 blocs × 16 actes (rappel)
Blocs : Einleitung · Metakommunikation · Warum · Ablauf · Vorbereitung · **Standardrisiken** (hérités) · **Spezifische Risiken** · Abschluss. 16 actes (Röntgen, CT, MRT, Angiografie, Phlebografie, Sono, KM-Sono, Feinnadelpunktion, Skelett-/Schilddrüsenszinti, ÖGD, ERCP, Kapsel, Koloskopie, Laparoskopie, Allg. OP). Déjà modélisé ; en simulation Assisté = chapitres cochables + questions patient (protocoles).

## 6. ODAK — rôle exact
Les PDF ODAK spécialité = **Fachwissen** structuré (Definition / Klinik / DD / Diagnostik / Therapie), + **blocs de rédaction** (Redewendungen) réutilisés dans le guide Arztbrief/Vorstellung. La **Fachanamnese** (questions) vient du livre (§4), pas des ODAK. → je ne confonds pas les deux sources.

---

## 7. MODULE 5 — Plugin dictionnaire/IA : options gratuites, choix & limites

**Contrainte ferme : aucun coût, aucune API payante.** Panneau flottant, 2 voies.

### Voie 1 — Terme isolé → traduction (offline, instantané)
| Option | Gratuit/Offline | Qualité (médical DE→FR) | Poids | Verdict |
|---|---|---|---|---|
| **Fachbegriffe internes** (2 249 CSV + Anki) | ✅ 100 % offline | Excellente sur le lexique FSP | ~0 (déjà là) | **Base prioritaire** |
| **FreeDict deu-fra / deu-eng** (licence GPL/CC) | ✅ offline (JSON bundlé) | Bonne, généraliste | ~2–8 Mo | **Complément retenu** (fallback hors lexique FSP) |
| Wiktextract/Kaikki (Wiktionary, CC-BY-SA) | ✅ offline possible | Très riche mais volumineux | 100+ Mo (à filtrer) | Option future si besoin de couverture |
| **Reverso** (que tu citais) | ❌ pas d'API libre sans clé, ToS restrictifs | Bonne | — | **Écarté** comme moteur intégré (pas gratuit/keyless) ; possible seulement en **deep-link** (voie 2, échappatoire B) |
| dict.cc / Linguee | ❌ redistribution non libre | — | — | Écarté (licence) |

> **« Skill dédié » (ta remarque)** : je créerai, via `skill-creator`, un **skill de config du dictionnaire** propre à l'app (choix de la source voie 1, du modèle WebLLM voie 2, seuil mot-isolé vs requête, langue cible) — pour que le module soit paramétrable proprement plutôt que codé en dur.

→ **Choix voie 1** : recherche en cascade **Fachbegriffe internes → FreeDict deu-fra bundlé** (filtré/compressé). 100 % offline, instantané, sans clé.

### Voie 2 — Requête complexe → explication « façon IA » (sans API payante)
| Option | Gratuit sans clé | Offline | Qualité | Contraintes |
|---|---|---|---|---|
| **WebLLM** (LLM in-browser, WebGPU) — Qwen2.5-1.5B / Llama-3.2-1B-3B Instruct | ✅ (poids libres HF) | ✅ après 1er téléchargement, mis en cache | Correcte (pas ChatGPT) ; DE médical acceptable en 3B | **WebGPU requis** (Chrome/Edge, Safari 18+) ; **~0,6–2 Go** à télécharger une fois ; latence CPU/GPU |
| **transformers.js** (WASM/WebGPU) — opus-mt de-fr / petit instruct | ✅ | ✅ | Traduction bonne ; explication ouverte faible | Léger (~50–300 Mo) mais peu « conversationnel » |
| Endpoints « gratuits sans clé » | ⚠️ instables | ❌ | Variable | Rate-limits, disparaissent, parfois clé requise → **non fiable** |
| Free-tier avec clé (Groq/OpenRouter free) | ⚠️ clé requise, en ligne | ❌ | Bonne | Exclu par la contrainte « sans clé/payant » + hors-ligne |

→ **Choix voie 2 (proposé)** : **WebLLM** avec un petit modèle instruct (Qwen2.5-1.5B ou Llama-3.2-3B), **téléchargé à la demande** (opt-in explicite), **caché** pour un usage offline ensuite ; **repli** transformers.js (opus-mt) pour la reformulation/traduction de phrases si WebGPU indisponible, et sinon dégradation vers recherche Fachbegriffe + Fachwissen.

> ⚠️ **Point à trancher avec toi (comme demandé)** : le 100 % hors-ligne de la voie 2 (modèle 1–3B) **dégrade nettement la qualité** vs ChatGPT (nuances médicales, formulations patient). Trois postures possibles :
> **(A)** 100 % offline WebLLM 1–3B — autonome, qualité moyenne ; **(B)** offline par défaut + bouton « ouvrir la question dans un service web gratuit » (deep-link, pas d'intégration, pas de clé) quand le candidat veut mieux ; **(C)** voie 2 limitée à la reformulation/traduction (transformers.js) et pas d'« explication ouverte ». **Ma reco : (B)** — offline autonome + échappatoire manuelle, zéro coût, sans clé. Dis-moi ton choix avant que je code le Module 5.

---

## 8. Décisions de conception par module (résumé)

- **M1 Programme dynamique** : dialogue d'onboarding (date d'examen **ou** nb semaines, intensité, h/session, jours off, systèmes prioritaires, auto-éval par axe). Moteur : capacité = jours travaillés × h/session ; répartition pondérée par faiblesses (stats), **SM-2** (termes) + **révision par couches** (couche 1 Assisté → couches 2-3 Autonome) ; recalcul continu (retard→rattrapage, temps réel passé). Vue agenda à l'accueil + onglet « Programme ».
- **M2 Simulation (priorité)** : sélecteur **Assisté/Autonome** en entrée ; Anamnese (guide par chapitres, toggles, mots-clés surlignés + liens Fachbegriffe/Fachwissen, cases à cocher) ; **Fachanamnese** extra selon spécialité ; **Notizen refondus** en Anamnese-Bogen (Muster par ville, layout §2) ; Fallvorstellung (13 chapitres §1, Redewendungen cochables, **pas de trame auto**) ; Arztbrief (guide + **comparaison au corrigé** avec analyse légère structure/registre/blocs manquants, **pas de courrier auto**) ; Aufklärung (chapitres cochables + questions patient) ; **fiche patient sur 2ᵉ écran** (voir §9) ; **Kommunikative Strategien** intégrées ; **ambiance d'entrée** discrète (respiration/compte à rebours « salle d'examen »).
- **M3 Barème** : critères cochables par axe (structure, registre, Fachbegriffe, complétude, fluidité) → score déduit, **pondéré par niveau d'assistance (Autonome > Assisté) et couche atteinte** ; indicateurs par axe + global « prêt à réussir ? » ; interconnexion (axe faible → accueil + heatmap + reprogrammation).
- **M4 Cas cliniques** : déjà en place (filtres centre/spécialité/fréquence/statut/confiance, aperçu, lancer sim) → j'améliore l'aperçu (dernier score, confiance) et l'harmonise au nouveau design.
- **M5 Dictionnaire/IA** : §7.
- **M6 Mémo de réflexes** : surcouche/panneau activable « Déroulé du jour J » (ouvrir l'anamnèse, gérer le temps, transitions module→module, checklist avant de passer à la Fallvorstellung). Consultable pendant l'entraînement pour ancrer les transitions.

---

## 9. Fiche patient sur 2ᵉ écran — solution 100 % locale (sans cloud)
- **Route dédiée responsive** `#/patient/:caseId` (vue « rôle patient » optimisée mobile) — ne montre que la fiche jouable + répliques difficiles déclenchables.
- **Même appareil, 2ᵉ fenêtre** : synchro live via **BroadcastChannel** (le candidat change de cas → la fenêtre patient suit).
- **Autre appareil (smartphone du partenaire, même Wi-Fi)** : accès à l'**URL réseau local** (Vite `--host`, `http://<IP-LAN>:5173/#/patient/<caseId>`) ; un QR code affiché dans la simulation ouvre directement la bonne fiche sur le téléphone.
- ⚠️ **Limite honnête** : l'auto-suivi *cross-device* (le téléphone change de cas quand le candidat change) exige un petit broker local (WebSocket/WebRTC) que je peux ajouter, mais par défaut je propose **QR → sélection explicite du cas** (robuste, zéro dépendance). Dis-moi si tu veux l'auto-suivi cross-device (je l'implémente via un mini-serveur local optionnel).

---

## 10. Propositions (améliorations UX non listées)
1. **Vue « Prüfungsraum » split** : en simulation, disposition inspirée de l'examen (chrono discret en haut, Bogen au centre, panneau guide latéral) + le QR fiche-patient — immersion sans gadget.
2. **Barre de transitions inter-modules** : un ruban Anamnese → Doku → Vorstellung → (Aufklärung) qui matérialise l'enchaînement et entraîne le réflexe de passage (lié au Module 6).
3. **« Redewendung-Trainer »** : à partir des Redewendungen de la Vorstellung, un micro-drill (chapitre → réciter/reconnaître la bonne formulation) intégré au SM-2 — apprendre les phrases par cœur, comme demandé.
4. **Diff visuel Arztbrief** : la comparaison au corrigé surligne blocs présents/manquants et signale registre (Konjunktiv I/Passiv) sans « corriger à ta place ».
5. **Heatmap à double grain** : spécialité × axe **et** couche (1/2/3), pour voir non seulement où mais à quelle profondeur tu maîtrises.
6. **Mode « Prüfer »** enrichi pour le partenaire (déjà esquissé) : sur le 2ᵉ écran, en Teil 3, les questions d'examen à poser + minuteur.
7. **Journal de préparation** : chaque session nourrit une timeline « ce que j'ai travaillé / ce qui reste » alignée sur le Programme dynamique.
8. **Indicateur « Prêt à réussir ? »** en jauge unique sur l'accueil, cliquable → décomposition par axe et prochaines actions recommandées.

---

## 11. Ordre d'exécution proposé (après ta validation)
1. **M2 Simulation** en priorité (superpowers: brainstorming → plan → TDD ; design: frontend-design + ui-ux-pro-max) : un **cas pilote** (Leberzirrhose) pleinement jouable dans **les 2 modes**, Notizen refondus (Anamnese-Bogen + Muster par ville), fiche patient 2ᵉ écran (QR + BroadcastChannel), Fallvorstellung & Arztbrief **guidés non auto-générés**, Fachanamnese + Kommunikative Strategien, ambiance d'entrée.
2. **M1 Programme dynamique** + **M3 Barème/indicateurs**, connectés aux stats.
3. **M4 Cas** (harmonisation) · **M5 Dictionnaire/IA** (selon ton choix A/B/C) · **M6 Mémo de réflexes**.
4. À chaque écran : rien ne reste une île (interconnexion vérifiée).

## 12. Skills & plugins mobilisés (mapping concret)
Le user demande d'appliquer activement tous les skills pertinents. Mapping retenu :
- **superpowers:brainstorming** → avant chaque module non trivial (exploration d'intention).
- **superpowers:writing-plans** → un plan écrit (`PLAN_ITERATION2.md`) avant de coder chaque module.
- **superpowers:test-driven-development** → logique pure d'abord testée (moteur de programme, barème/pondération assistance-couche, SM-2, comparateur Arztbrief).
- **superpowers:systematic-debugging** → toute anomalie.
- **superpowers:verification-before-completion** → build + typecheck + preview avant de dire « fait ».
- **superpowers:requesting-code-review** → à la fin de chaque module majeur.
- **frontend-design** + **ui-ux-pro-max** → tokens, direction visuelle, composants, accessibilité, états d'interaction sur **chaque écran** (Simulation en priorité, ambiance d'entrée).
- **skill-creator** → création du **skill de config du dictionnaire** (Module 5) et, si utile, d'un skill de génération de contenu FSP pour la PHASE 2 d'import.
- **anthropic-skills (docx/pdf)** si besoin d'exporter un Anamnese-Bogen imprimable.

Les autres familles installées (bio-research, data, gsd-core, notion, agentops…) ne sont pas pertinentes pour cette app et ne seront pas forcées.

---

## 13. ✅ Décisions validées (retour user) — feu vert donné
1. **Module 5, voie 2 = (B)** : WebLLM offline autonome + échappatoire deep-link vers un service web gratuit. ✔
2. **Fiche patient cross-device** : QR + sélection explicite du cas, **auto-suivi cross-device ok** aussi (BroadcastChannel même appareil ; mini-broker local optionnel pour le smartphone). ✔
3. **Priorités** : M2 Simulation d'abord, **cas pilote Leberzirrhose** dans les 2 modes. ✔
4. **Pas de centre de référence défini** → je propose les **5 Muster** (ODAK + 4 villes) sans défaut imposé ; le Muster ODAK complet sert de vue par défaut jusqu'à ce qu'un centre soit choisi. ✔

**Exécution** : M2 (Simulation) → M1 (Programme) + M3 (Barème) → M4/M5/M6. Chaque écran : brainstorm → plan → TDD (logique) → design → vérif → review.
