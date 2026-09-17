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

## Termes à éviter

- « Test » pour une simulation ; « quiz » pour un drill ; « patient IA » pour
  le simulant humain.
