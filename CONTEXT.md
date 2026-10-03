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
- **Muster** — phrase modèle d'Arztbrief (9 chapitres) ou de Fallvorstellung
  (12 chapitres). Contrat de couverture par cas.
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
  (progression) ; **Mode focus** = immersif plein écran.
- **Bogen** (`BogenNotes`) — feuille de notes structurée par modèle de ville.
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
- **État par Teil** (`vierge | fragile | acquis | solide`) — un cas n'a plus de
  pourcentage. `vierge` = « pas encore travaillé », information neutre.
- **Point faible** — se décide **sur la performance, jamais sur l'absence** :
  seul `fragile` en est un.
- **Dette de Teil** — ce qui reste à faire ; elle ordonne le travail. Elle ne se
  confond **jamais** avec la faiblesse, qui nomme un défaut.
- **Mode d'avancement** (`teil-first | cas-complet | specialite | examen-blanc`)
  — la stratégie du candidat, demandée plutôt que devinée.
- **Frage** — la question atomique : un seul « ? », un chapitre, ses relances
  (`nachfragen`) et ses sondes couvertes (`deckt`). Une question composée est un
  arbre aplati (`docs/contracts/frage-atomique.md`).
- **Gabarit non résolu** — une alternative dépendante du cas laissée dans le
  texte (« die Hand oder der Fuß ») alors que le cas sait laquelle. Interdit par
  la CI. À distinguer de l'**énumération d'irradiation**, qui est légitime.

## Doctopus (SaaS)

- **Crédits** — unité de consommation des features IA (patient vocal,
  correction d'Arztbrief). Le cœur (cas, simulations, glossaire) est illimité.
- **Bereitschaftsindex** — indice de préparation calculé depuis l'historique.
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
- « Maîtrise du cas », « confiance », « % du cas » — un cas a un **état par
  Teil**, pas un pourcentage (ADR-0017).
- « En retard », « assiduité » — un jour non ouvert n'existe pas ; rien ne
  s'accumule en silence.
- « Suggestion du jour » pour la tâche du plan figé : c'est une **tâche**, pas
  une suggestion. Une suggestion se recalcule ; une tâche, non.
