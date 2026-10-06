# Contexte de domaine — Doctopus / FSP-Cockpit

Glossaire des termes du projet. Les skills d'ingénierie lisent ce fichier avant
d'explorer le code et emploient **ce** vocabulaire, pas ses synonymes.

## Examen

- **FSP** (Fachsprachprüfung) — examen de *langue* médicale, 60 min, langue
  seule (le savoir médical n'est pas noté), résultat immédiat, évaluation
  « nach einheitlichem, strukturiertem Schema » (LÄK BW). **Le barème
  « 60 points / 60 % par partie » n'est PAS sourcé** dans un document officiel :
  c'est la grille INTERNE d'entraînement de l'app, à présenter comme telle,
  jamais comme le barème officiel. Source de vérité par Land : `docs/exam/<land>.md`.
- **Les trois parties** — *Anamnese* (20 min), *Dokumentation / Arztbrief*
  (20 min), *Fallvorstellung / Arzt-Arzt-Gespräch* (20 min). *Aufklärung* =
  acte d'information au patient, demandé à la volée.
- **Landesärztekammer / Land** — chaque chambre a ses variantes (Bogen,
  minutage). Le Muster-Bogen est **par ville**.
- **KP** (Kenntnisprüfung) — examen de connaissances, produit distinct prévu.

## Contenu

- **Cas** (`Case`) — un cas clinique complet : `patientSheet` (fiche du
  simulant), `medicalView`, `examinerSheet`, `musterSaetze`.
- **Sonde** (`AnamneseProbe`) — question canonique d'anamnèse identifiée par un
  `probeId` ; toute fiche patient répond à toutes ses sondes applicables
  (`antworten: Record<probeId,string>`). BASE_PROBES + FRAUEN + FACH_PROBES par
  spécialité.
- **Mustersätze** (`musterSaetze`, `caseMuster.ts`) — phrase modèle
  d'Arztbrief (9 chapitres) ou de Fallvorstellung (12 chapitres). Contrat de
  couverture par cas. À ne pas confondre avec le **Muster** de notes
  (ci-dessous, Simulation).
- **Fachwissen** — fiche pathologie. **Fachbegriff** — terme du glossaire, avec
  SRS.
- **Favori** — Fachbegriff marqué ★ par la personne ; événements `term.favorited` /
  `term.unfavorited` ; deck réservé `deck-favorites`.
- **Deck** — collection personnelle de Fachbegriffe : **liste manuelle** (termes
  choisis, `deck.term_added`) ou **deck intelligent** (requête enregistrée
  `DeckQuery` = les filtres de la page, évaluée à la lecture). Un deck est une
  lentille sur le même SRS, jamais un second planning.
- **Dû** — Fachbegriff déjà présenté (`state ≠ Neu`) dont l'échéance SM-2 est
  passée. Un **nouveau** (`Neu`) n'est jamais dû : il entre au drill dans le
  **budget du jour** (5–30, adaptatif : date d'examen + rétention ; 0 le jour de l'examen), par ordre de
  pertinence (★, deck, cas récents, programme du jour).
- **Termes du cas** — termes liés au cas par occurrence dans ses textes
  (pipeline `linkCaseTerms`, triés du plus spécifique au plus transversal) ∪
  termes marqués pendant une session sur ce cas (`payload.caseId`).
- **Réglages SRS** — par personne (`srs.settings_changed`) : **auto** (budget du
  jour × intensité du programme) ou **manuel** (nouveaux/jour, dus présentés/jour).
  Le plafond de dus ne perd rien : les dus au-delà restent dus demain.
- **Hover-card** — carte ★ sur tout terme auto-lié (survol sur ordinateur, tap sur
  mobile) ; ★ = favori immédiat avec le cas courant (`caseId`), puis deck / fiche.
  Clavier : Entrée sur un lien focalisé → ★ ; Échap → ferme ; clic = tiroir.
- **Guide** — questions affichées au candidat, liées aux sondes par `probe:`.
  Le chapitre Fach est **généré** depuis les sondes.

## Simulation

- **Candidat / Simulant** — le médecin joué par l'utilisateur / le partenaire
  qui joue patient puis examinateur. **Binôme** — les deux.
- **Modes** — *Assisté* / *Autonome* (assistance) ; **Couche** 1–3
  (progression), fondue dans le niveau d'assistance à l'écran depuis la
  série 4 : le mot « Couche » n'y figure plus. **Mode focus** = immersif plein
  écran.
- **Bogen** (`BogenNotes`) — la feuille de notes de l'anamnèse, une valeur par
  clé de champ. Elle n'est jamais réécrite, et aucune note n'est perdue au
  changement de Muster.
- **Muster guidé / libre** (`MusterArt`) — la **forme** de la feuille de notes,
  choisie à la pré-simulation. **Guidé** : toutes les rubriques de l'anamnèse,
  un champ par rubrique. **Libre** : les rubriques d'identité, puis un grand
  champ de rédaction libre. Il remplace les cinq Muster-Bogen par ville
  (`MusterCity`, lus avec tolérance : `Standard` → guidé, villes → libre).
- **Rollenskript** — répliques déterministes du simulant, dérivées des sondes
  (`lib/rolePlay.ts`). Base de la pré-génération vocale.
- **Sync patient** — canal `fsp-patient-sync` (`active-case`, `guide-chapter`,
  `guide-probe`) ; devient Supabase Realtime en mode en ligne.
- **IA externe** — simulation jouée dans l'app d'IA du candidat (ChatGPT,
  Claude, Gemini, Perplexity, Grok) avec un prompt généré depuis le
  Rollenskript (`lib/externalAi/`). Le prompt est **à deux temps** : *amorce*
  (≤ 900 car., allemand, une seule instruction de sortie) puis *fiche*. Deux
  **modes de rôle** : `patient` (jamais le diagnostic) et `oberarzt` (le
  diagnostic, par nécessité). La portée est le **Teil d'ancrage**
  (`anamnese` | `fallvorstellung`) — la notion de `Scope` disparaît. La séance
  est **auto-déclarée** au retour et écrit un `TrainingEvent` marqué
  `selbstbewertet` (`docs/contracts/ai-bridge.md`).
- **Lauf** — une partie de simulation, objet unique à identifiant stable, qui
  porte son automate (`vorbereitung → laufend → bilanz → checkliste →
  [arztbrief] → gespeichert`). La checklist, les Teile joués, le minutage et le
  score en sont des **champs**, jamais des états parallèles. Aucune transition
  ne va vers un état antérieur ; « revenir » est une action nommée
  (`docs/contracts/simulation-run.md`).
- **Portée déclarée / portée jouée** — `geplanteTeile` est l'intention,
  `teileGespielt` est le fait. Les statistiques classent sur le fait.
- **Cas entier** — l'unité d'**intention** : le candidat choisit, lance et voit
  des cas, jamais des fractions de cas. Une partie planifie toujours les trois
  Teile. À la fin de chacun : « Continuer » ou « Terminer ici ». Le fil
  d'étapes permet de commencer par un autre Teil (ADR-0021).
- **Teil** — l'unité de **mesure** : Anamnese, Dokumentation, Fallvorstellung.
  Chaque Teil a son état, son score et sa date. Il ne paraît jamais en
  surface comme un choix ou une tâche à part.
- **D'un trait** — les trois Teile joués dans **une même partie, sans
  reprise de plus de 5 min** (`Simulation.enchaine`). L'examen enchaîne les
  trois Teile : l'endurance fait partie de la préparation.
- **Conditions d'examen** (`conditionsExamen`) — une partie d'un trait, en
  Autonome, dans l'ordre A → D → F, avec la grille de langue saisie. C'est
  **une** définition, qui fonde à la fois l'examen à blanc et l'état `prêt`.
- **Examen** (le mode, `/examen`) — un cas tiré au sort et caché jusqu'au
  résultat, trois Teile de 20 min à l'horloge murale, sans aide ni pause.
  C'est un `Lauf` ordinaire (`Lauf.examen`), pas un second moteur
  (`simulation-run.md` §11). Un examen abandonné ou repris après plus de
  5 min est un **examen interrompu** : il compte comme partie, pas comme
  examen à blanc.
- **Non saisi** (`NOT_ENTERED = −1`) — un curseur (ressenti, critère de langue)
  que le candidat n'a pas touché. Le score ne porte que ce qui est saisi, et
  aucune moyenne ne lit `−1`. `0` reste une note.

## Entraînement (programme, journal, contenu)

- **TrainingEvent** — le journal d'entraînement, **append-only**. Tout exercice
  écrit exactement un événement, y compris hors plan. Statistiques, historique,
  indice de préparation et sélection en **dérivent tous**
  (`docs/contracts/training-journal.md`).
- **TaskInstance / DayPlan** — le **plan du jour figé** : matérialisé une fois à
  la première ouverture du jour, stocké, jamais recalculé au rendu. Cocher une
  tâche pose `doneAt` ; rien d'autre ne bouge. **Replanifier** est une action
  nommée. Remplace `ProgramBlock`, `ProgramDay`, `ExtraTask`, `db.plan`.
- **Session du jour** — la première tâche non faite du plan figé. Source unique.
- **Tâche de cas** — une tâche est un cas. Son contenu dit **ce qui reste**
  (`TaskInstance.teile`, figé au moment du plan) : « il te reste la
  Dokumentation · 10 min ». Elle est **faite** quand tout ce qui restait est
  joué le jour même ; c'est une **dérivation du journal**, identique sur tous
  les appareils. Sinon elle est **entamée**, jamais « manquée ». Le reste
  revient en tête le lendemain, proposé et jamais imposé. Une tâche **d'un
  trait** ne se fait qu'en une partie enchaînée.
- **État par Teil** (`vierge | fragile | acquis | solide`) — un cas n'a plus de
  pourcentage. `vierge` = « pas encore travaillé », information neutre.
  **Solide** = deux réussites ≥ 80 espacées d'au moins 3 jours. Une mauvaise
  partie ne fait descendre un Teil solide que d'un cran (ADR-0022).
- **Couverture** — le nombre de Teile d'un cas travaillés et mesurés (0–3).
- **Maîtrise** — la moyenne des derniers scores **des Teile joués**. Elle ne
  baisse jamais parce qu'un Teil manque. Ce n'est pas un « % du cas ».
- **État du cas** (`vierge → entamé → couvert → solide → prêt`) — **entamé** :
  ≥ 1 Teil joué ; **couvert** : 3 Teile joués ; **solide** : 3 Teile solides ;
  **prêt** : solide, et un run en conditions d'examen, chaque Teil ≥ 80,
  joué **après** que le cas est devenu solide. Une retombée défait la
  soudure.
- **Cadran** (`CaseDial`) — le signe unique d'un cas, partout où il apparaît
  (carte, ligne de tâche, pré-simulation, fin de partie). La position dit le
  Teil, la couleur dit l'état. Le centre affiche la maîtrise, l'anneau
  extérieur la couverture. Un cas **prêt** a ses arcs **soudés** en anneau
  continu.
- **Consolidation** — le retour planifié d'un cas solide, après 7, 21, puis
  45 jours (ADR-0022).
- **Erreur transversale** — un item de checklist manqué dans ≥ 3 des 5
  dernières parties d'un Teil, sur ≥ 2 cas. La tâche suivante le rappelle.
- **Point faible** — se décide **sur la performance, jamais sur l'absence** :
  seul `fragile` en est un.
- **Dette de Teil** — ce qui reste à faire ; elle ordonne le travail. Elle ne se
  confond **jamais** avec la faiblesse, qui nomme un défaut.
- **Mode d'avancement** (`teil-first | cas-complet | specialite | examen-blanc`)
  — `examen-blanc` et `specialite` sont des **choix explicites** du candidat.
  Le reste est **observé** sur le journal (`cas-complet` ou `teil-first`), et
  oriente la sélection en silence : ni demandé, ni proposé, jamais en
  surface (ADR-0021).
- **Frage** — la question atomique : un seul « ? », un chapitre, ses relances
  (`nachfragen`) et ses sondes couvertes (`deckt`). Une question composée est un
  arbre aplati (`docs/contracts/frage-atomique.md`).
- **Gabarit non résolu** — une alternative dépendante du cas laissée dans le
  texte (« die Hand oder der Fuß ») alors que le cas sait laquelle. Interdit par
  la CI. À distinguer de l'**énumération d'irradiation**, qui est légitime.
- **Signe** (`Signe`, ex-`Symptom`) — l'information clinique qu'une question
  cherche : une dimension de plainte (Ort, Verlauf…) ou un signe (fièvre,
  fréquence des selles…). Deux questions cherchent le même signe **si et
  seulement si la fiche y répondrait par la même réplique**. Nommer un signe
  dans une énumération, c'est le demander (D1). Toute question jouable déclare
  ses signes (`sucht`) (ADR-0023).
- **Profil clinique** (`patientSheet.profil`) — ce que le cas rend pertinent
  (`tags`), ce qu'il impose de demander (`exige`) et ce qu'il exclut, avec sa
  raison (`exclut`). Il est déclaré et relu ; seuls la nature du motif et
  `hoden` se dérivent des données du cas.
- **Cohérence (de la trame)** — la trame jouée ne demande chaque signe qu'une
  fois, rien hors profil, tout ce que le profil exige, et rien avant ce qu'elle
  présuppose. Le montage l'obtient par `cohere` (quatre règles pures), et la
  porte `checkCoherence` la vérifie.
- **Écarts (de cohérence)** (`Ecart`, `ecarts`) — ce que `cohere` a retiré,
  réduit, ajouté, déplacé ou détaché dans un cas, chaque écart avec sa règle et
  sa raison. Il y a un écart par couple (question, action), et une relance suit
  sa mère.
- **Relance de précision** — une relance qui précise le signe de sa question
  mère et en hérite. Une relance qui cherche un autre signe est une **unité** à
  part (ADR-0023).
- **Banque de sondes** — pour chaque signe exigible, une sonde canonique qui
  cherche ce signe seul (`SIGNE_DEF[s].bank`). C'est la seule source d'une
  question ajoutée par le montage : jamais de texte inventé.

## Doctopus (SaaS)

- **Crédits** — unité de consommation des features IA (patient vocal,
  correction d'Arztbrief). Le cœur (cas, simulations, glossaire) est illimité.
- **Bereitschaftsindex** — *abandonné* (ADR-0021, amendement S4-7) : l'état
  `prêt` du cas est la seule mesure de préparation.
- **Prüfungsakademie** — parcours animé qui explique l'examen.
- **Avocat de l'utilisateur** — agent qui joue l'app avec des personas et
  rapporte les ruptures de symbiose (ce que la machine impose vs ce que
  l'humain attendait).
- **Compte connu** : compte Supabase réel déjà ouvert sur cet appareil, inscrit au registre local (`fsp.accounts`) avec son dernier jeton.
- **Compte actif** : celui dont la base Dexie (`fsp-cockpit-<userId>`) est ouverte ; un seul à la fois ; changer = recharger.
- **Mode founder / public** : `VITE_AUTH_MODE` — comptes immédiats et bascule locale / parcours SaaS (lien magique, Stripe).

## Site (`apps/site`)

- **Ce qui tombe vraiment** (*Was wirklich drankommt*) — page publique de
  fréquences pathologie × centre, générée depuis `ANALYSE.md` §3 ; jamais un
  protocole ni un nom.
- **Centre** — lieu de passage de l'examen (Freiburg, Karlsruhe, Reutlingen,
  Stuttgart) ; distinct du Land (Landesärztekammer).
- **Tokens** — `packages/tokens/tokens.json`, source de vérité de la charte
  (couleurs, polices, motion, verre) partagée app + site (ADR-0010).
- **Avertissement outil de langue** — mention obligatoire (accueil + footer) :
  Doctopus prépare à une épreuve de langue, n'est pas un dispositif médical.
- **Bannière brouillon légal** — signale une page légale dont le front-matter
  `validated_by` est vide.
- **Mode de lancement** — `checkout` (CTA vers l'inscription/paiement) ou
  `waitlist` (CTA liste d'attente) ; réglage de build du site.

## Termes à éviter

- « Test » pour une simulation ; « quiz » pour un drill ; « patient IA » pour
  le simulant humain.
- « Confiance », « % du cas », « taux de complétion du cas » — un cas a un
  **état par Teil**, une **couverture** et une **maîtrise**, pas un pourcentage
  (ADR-0017, ADR-0021). « Maîtrise » ne désigne que la moyenne des Teile joués.
- « Manquée » pour une tâche entamée, « Anamnese de X » pour une tâche — une
  tâche est un cas, entamé ou fait.
- « Ce que le jury note », « ce qui tombe à coup sûr » — une fréquence est
  toujours « dans N protocoles », jamais une prédiction (garde EXAM_CLAIM).
- « En retard », « assiduité » — un jour non ouvert n'existe pas ; rien ne
  s'accumule en silence.
- « Symptôme » pour ce qu'une question cherche : c'est un **signe**
  (`Symptom` n'est plus qu'un alias). « Doublon » mesuré par les mots : un
  doublon est **un signe demandé deux fois**.
- « Journal » pour les traces de `cohere` : ce sont des **écarts**. Le
  journal est le journal d'entraînement (`TrainingEvent`).
- « Suggestion du jour » pour la tâche du plan figé : c'est une **tâche**, pas
  une suggestion. Une suggestion se recalcule ; une tâche, non.
