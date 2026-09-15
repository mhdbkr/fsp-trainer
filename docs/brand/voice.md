# Doctopus — voix et lexique

> Pôle Croissance · `brand-strategist` · v0.1 (2026-09-16, sous réserve de G1).
> Opposable : la §6 (interdits) est écrite pour être lue par un validateur (regex, casse-insensible).
> S'applique à : site, blog, posts sociaux, e-mails, créas Higgsfield/Canva, UI copy de l'app quand elle cite la marque.

## 1. Essence

Doctopus parle comme **un Oberarzt bienveillant qui a fait passer cent examens** : précis, calme, sans effet de manche, et qui te dit où tu en es plutôt que ce que tu veux entendre. Il rassure par l'exactitude, jamais par la promesse.

*Doctopus sonne comme un instrument clinique — précis, calme et honnête.*

Cohérence avec l'identité visuelle (`fsp-brand-identity`) : « instrument clinique de précision » — readout mono, pétrole, coral parcimonieux. La voix est le pendant verbal : chiffres exacts, phrases courtes, un seul accent par écran.

## 2. Dimensions de ton

| Axe | Position | En pratique | Exemple |
|---|---|---|---|
| Familier ↔ Formel | **Tutoiement, registre soigné** (FR : « tu » ; DE : « du » ; EN : « you ») | On parle à un médecin, pas à un élève. Pas d'argot, pas de « salut ! ». | « Tu as 20 minutes. Le patient a 58 ans et une douleur épigastrique. » |
| Calme ↔ Énergique | **Calme** | Pas de point d'exclamation dans le corps de texte. L'urgence vient du minuteur, pas de la copie. | « Il reste 4 minutes pour la Fallvorstellung. » |
| Sérieux ↔ Drôle | **Sérieux, une pointe de sec** | L'humour est permis dans la mascotte et le patient croqué, jamais dans le pricing ni le légal. | « Le jury ne t'écoutera pas plus de 20 minutes. Nous non plus. » |
| Accessible ↔ Expert | **Expert qui rend clair** | On emploie les termes de l'examen (Anamnese, Bogen, Fallvorstellung) sans les diluer ; on les explique une fois. | « Le Bogen — la feuille de notes que tu remplis pendant l'anamnèse — change selon la Kammer. » |
| Distant ↔ Intime | **Proche du parcours, pas de la personne** | On connaît sa date d'examen et son Land, on ne fait pas semblant d'être son ami. | « Examen à Stuttgart le 14 novembre ? Voilà ce qui y est tombé depuis 2023. » |

## 3. Qualités de voix

**Exact** — Chaque chiffre a une source (`positioning.md` §4). Un chiffre rond non sourcé est une faute.
- Do : « 130 cas, construits à partir d'environ 580 comptes rendus de candidats. »
- Don't : « Des centaines de cas réels ! »

**Ancré dans l'examen** — On décrit la salle, le minutage, le barème, la Kammer. Le lecteur doit reconnaître son examen.
- Do : « Trois parties de 20 minutes, 60 points, 60 % par partie. »
- Don't : « Une préparation complète et immersive. »

**Honnête sur ce qu'on mesure** — On dit « ton indice est à 54 % » ; on ne dit jamais « tu vas réussir ».
- Do : « Ton Bereitschaftsindex mesure la couverture des spécialités et ta courbe de langue. Il n'est pas une prédiction. »
- Don't : « Avec Doctopus, la réussite est à portée de main. »

**Sobre** — Un adjectif par phrase, maximum. Pas de superlatif.
- Do : « Le simulateur qui reproduit ta Fachsprachprüfung. »
- Don't : « Le meilleur simulateur ultra-réaliste et révolutionnaire. »

**Respectueux du médecin** — Le lecteur est déjà médecin. On l'aide sur la langue et la forme de l'épreuve, jamais sur « la médecine ».
- Do : « Tu connais la pancréatite. Ici, tu apprends à la présenter en 20 minutes, en Konjunktiv I. »
- Don't : « Apprends la médecine en allemand. »

**Pédagogue, jamais manipulateur** (ADR-0008) — Aucune urgence artificielle, aucune culpabilisation.
- Do : « Tu peux résilier en un clic, à tout moment. »
- Don't : « Plus que 2 heures pour profiter de l'offre ! » · « Tu n'as pas ouvert l'app depuis 3 jours… »

## 4. Règles d'écriture

- **Phrases** : courtes (≤ 20 mots) ; une longue tolérée par paragraphe pour expliquer.
- **Ponctuation** : point d'exclamation **interdit** hors dialogue de personnage. Points de suspension interdits. Tiret cadratin autorisé, un par phrase.
- **Casse** : phrase (sentence case) partout, y compris titres. Les termes allemands gardent leur majuscule (Anamnese, Bogen).
- **Chiffres** : toujours en chiffres (« 3 parties », « 20 minutes », « 130 cas »), chiffres tabulaires en UI. « environ 580 » — on garde « environ », c'est une estimation de comptage.
- **Voix** : active. Sujet = « tu » ou « Doctopus ». Passif seulement pour les faits de l'examen (« l'épreuve est notée sur 60 points »).
- **Termes allemands dans un texte FR/EN** : en italique à la première occurrence avec une glose courte, puis nus. Jamais traduits quand ils désignent la chose officielle (on dit *Fachsprachprüfung*, pas « examen de langue médicale » seul).
- **Humour** : autorisé uniquement via personnages (mascotte, patient, Oberarzt). Jamais dans pricing, légal, erreurs, e-mails transactionnels.
- **Emoji** : aucun (cohérent avec l'app : zéro emoji structurel).

## 5. Lexique DE / FR / EN

Le terme officiel est allemand ; il **ne se traduit pas**, il se glose. Colonne « glose » = ce qu'on met entre parenthèses à la première occurrence.

| DE (officiel, on l'écrit tel quel) | Glose FR | Glose EN | Notes |
|---|---|---|---|
| Fachsprachprüfung (FSP) | examen de langue médicale | medical German language exam | Toujours « Fachsprachprüfung » en titre ; « FSP » ensuite. |
| Kenntnisprüfung (KP) | examen de connaissances | medical knowledge exam | Produit futur ; ne pas en parler sur le site v1. |
| Landesärztekammer / Kammer | ordre des médecins du Land | state medical chamber | « Kammer » seul après la première occurrence. |
| Land / Länder | Land (région fédérée) | federal state | Ne pas dire « région ». |
| Anamnese | anamnèse (entretien patient) | patient history | Partie 1. |
| Dokumentation / Arztbrief | compte rendu écrit / lettre médicale | written documentation / discharge letter | Partie 2. « Arztbrief » préféré. |
| Fallvorstellung / Arzt-Arzt-Gespräch | présentation du cas au médecin senior | case presentation to a senior doctor | Partie 3. |
| Aufklärung | information du patient (consentement) | patient information (informed consent) | Demandée à la volée. |
| Bogen (Anamnesebogen) | feuille de notes de l'anamnèse | history sheet | Varie par ville. |
| Muster | phrase modèle | model sentence | Interne surtout ; sur le site : « phrases modèles ». |
| Fachbegriff(e) | terme technique | medical term | Toujours au pluriel allemand sur le site. |
| Fachwissen | fiche pathologie | condition sheet | |
| Oberarzt / Oberärztin | médecin senior (le jury de la partie 3) | senior physician | Personnage. |
| Prüfer / Jury | examinateur | examiner | |
| Konjunktiv I | discours indirect | reported speech | Axe d'évaluation de l'Arztbrief. |
| Prüfungstag | jour d'examen | exam day | Nom du simulateur 60 min. |
| Bereitschaftsindex | indice de préparation | readiness index | Nom propre Doctopus ; « bientôt » tant que non livré. |
| Prüfungsakademie | l'Akademie | the Academy | Nom propre ; non livré. |
| Doctopus Credits / crédits | crédits | credits | Minuscule en FR/EN sauf nom complet. |
| Simulation | simulation | simulation | **Jamais « test »**. |
| Drill | drill | drill | **Jamais « quiz »**. |
| Simulant / binôme | partenaire qui joue le patient | role-play partner | **Jamais « patient IA » pour un humain**. |
| Candidat | candidat | candidate | Notre lecteur. Jamais « utilisateur », « élève », « apprenant » sur le site. |
| Doctopus / FSP Trainer | Doctopus = marque et projet ; FSP Trainer = le produit (l'app) | idem | Voir `naming-and-domain.md` §1. « Doctopus » sans article ; « der FSP Trainer » (masculin) en DE. |

Mots-clés SEO DE à employer nus : *Fachsprachprüfung Vorbereitung*, *FSP Simulation*, *Fachsprachprüfung Stuttgart/Karlsruhe/Freiburg/Reutlingen*, *Anamnese üben*, *Arztbrief schreiben*, *Fallvorstellung üben*, *Ärztekammer Baden-Württemberg FSP*.

## 6. Interdits — liste opposable

Un validateur peut refuser tout texte public contenant l'une de ces chaînes (casse-insensible, accents normalisés). Colonnes DE/FR/EN.

### 6.1 Promesse de résultat (ROADMAP §1.3 — bloquant)

| FR | DE | EN |
|---|---|---|
| garantie, garanti(e), garantir | Garantie, garantiert | guarantee(d) |
| réussite assurée, réussite garantie | Erfolg garantiert, sicher bestehen | guaranteed pass, pass guaranteed |
| 100 % (de réussite / des cas) | 100 % (Erfolg / bestehen) | 100 % (pass / success) |
| passe ton examen, réussis ton examen (à l'impératif comme promesse) | besteh(e) deine Prüfung (als Versprechen) | pass your exam (as a promise) |
| tu vas réussir, vous allez réussir | du wirst bestehen | you will pass |
| taux de réussite (sans donnée sourcée) | Erfolgsquote, Bestehensquote | pass rate, success rate |
| du premier coup | beim ersten Versuch | first time, first try |
| sans échec, zéro échec | ohne Durchfallen | no fail, never fail |
| certifié, agréé, officiel (en parlant de Doctopus) | zertifiziert, anerkannt, offiziell | certified, accredited, official |
| partenaire de la Kammer / de l'Ärztekammer | Partner der Ärztekammer | partner of the chamber |

*Nuance autorisée* : « préparer », « s'entraîner à », « mesurer », « savoir où tu en es » ; « les candidats qui ont réussi nous ont envoyé leur protocole » (fait, pas promesse) — sous réserve d'un consentement.

### 6.2 Hype et vide

| FR | DE | EN |
|---|---|---|
| révolutionnaire, ultime, meilleur(e) (superlatif absolu), n° 1, leader | revolutionär, ultimativ, der/die/das beste, Nr. 1, Marktführer | revolutionary, ultimate, the best, #1, leading |
| boostez, propulsez, maximisez | boosten, pushen | boost, supercharge, unlock |
| immersif (sans preuve concrète à côté) | immersiv | immersive |
| propulsé par l'IA, IA de pointe | KI-gestützt (als Identität), modernste KI | AI-powered, cutting-edge AI |
| magique, sans effort | magisch, mühelos | magic, effortless |

### 6.3 Périmètre et responsabilité

| FR | DE | EN |
|---|---|---|
| toute l'Allemagne, tous les Länder, toutes les Kammern (comme preuve) | ganz Deutschland, alle Länder, alle Kammern | all of Germany, every state |
| apprends la médecine, deviens un meilleur médecin | lerne Medizin, werde ein besserer Arzt | learn medicine, become a better doctor |
| diagnostic, traitement (comme promesse produit) | Diagnose, Therapie (als Produktversprechen) | diagnosis, treatment (as product claim) |
| conseil juridique, conseil fiscal | Rechtsberatung, Steuerberatung | legal advice, tax advice |

### 6.4 Dark patterns (ADR-0008)

| FR | DE | EN |
|---|---|---|
| dernière chance, offre limitée, plus que X heures | letzte Chance, nur noch X Stunden, limitiertes Angebot | last chance, only X hours left, limited offer |
| ne rate pas, tu vas le regretter | verpass nicht, du wirst es bereuen | don't miss out, you'll regret |
| streak perdu, tu nous manques | Streak verloren, du fehlst uns | streak lost, we miss you |
| annuler à tout moment* | jederzeit kündbar* | cancel anytime* |

\* *Autorisé uniquement si c'est vrai et en un clic* : FR « résiliation en un clic, sans justification » · DE « Kündigung mit einem Klick, ohne Begründung » · EN « cancel in one click, no questions asked ».

### 6.5 Vocabulaire produit interdit (CONTEXT.md)

test (pour une simulation) · quiz (pour un drill) · patient IA (pour le simulant humain) · utilisateur / élève / apprenant (pour le candidat) · région (pour Land).

## 7. Avant / après

**Avant** : « Réussis ta FSP du premier coup grâce à notre IA révolutionnaire ! »
**Après** : « Entraîne-toi sur les cas qui sont tombés à Stuttgart, dans les conditions de l'examen. »
*Pourquoi* : preuve concrète à la place d'une promesse ; zéro exclamation.

**Avant** : « Des centaines de cas réels pour une préparation immersive et complète. »
**Après** : « 130 cas complets, construits à partir d'environ 580 comptes rendus de candidats. »
*Pourquoi* : chiffres sourcés, adjectifs supprimés.

**Avant** : « Ne perds pas ta série ! Reviens vite. »
**Après** : « Ta dernière simulation complète date de mardi. Une nouvelle te prend 60 minutes. »
*Pourquoi* : fait, pas culpabilisation ; on récompense la simulation, pas le login.

**Avant** : « Doctopus, partenaire officiel de ta réussite en Allemagne. »
**Après** : « Doctopus prépare à la Fachsprachprüfung. Il n'est ni une école, ni la Kammer, ni une garantie. »
*Pourquoi* : refuse l'ambiguïté d'officialité.

**Avant** : « Apprends la médecine en allemand avec un patient IA. »
**Après** : « Tu connais la pancréatite. Ici, tu apprends à la présenter au jury en 20 minutes. »
*Pourquoi* : respecte le médecin ; le périmètre est la langue et la forme.

## 8. Adaptation par canal

| Canal | Flexion | Exemple |
|---|---|---|
| Hero du site | plus court, une preuve à côté | « La répétition générale de ta Fachsprachprüfung. 130 cas, construits sur ce qui tombe vraiment. » |
| Blog / SEO | plus explicatif, termes DE nus, phrases longues tolérées | « À Reutlingen, la fibromyalgie est tombée 8 fois sur 151 comptes rendus. Voici comment la présenter. » |
| Social | une donnée par post, jamais un slogan | « Karlsruhe : Depression 11, Appendizitis 9, Ösophaguskarzinom 9. Ce sont les cas les plus fréquents dans nos comptes rendus. » |
| E-mail transactionnel | neutre, factuel, aucun humour | « Ton abonnement Pro est actif. Résiliation en un clic depuis ton compte. » |
| Support | patient, précis, reconnaît le défaut | « Tu as raison, la question Frauenanamnese ne devait pas être posée ici. Corrigé dans la version 3.2. » |
| Erreur UI | courte, dit quoi faire | « Hors ligne. Ta simulation est sauvegardée ; la synchronisation reprendra. » |
| Mascotte / personnages | seul lieu de l'humour | « Le jury ne t'écoutera pas plus de 20 minutes. Moi non plus. » |
