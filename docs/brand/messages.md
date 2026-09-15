# Doctopus — messages

> Pôle Croissance · `brand-strategist` · v0.1 (2026-09-16, sous réserve de G1).
> Dérivé de `positioning.md` (preuves §4) et `voice.md` (interdits §6). Tout texte ci-dessous est
> utilisable tel quel par `site-implementer` ; les mentions « [À] » désignent une feature non livrée
> et ne doivent apparaître qu'avec « bientôt ».
> Langue de rédaction : FR (recommandation `naming-and-domain.md` §3) ; DE fourni pour le hero et le CTA.

## 1. Message central

*Doctopus aide les médecins non germanophones à savoir s'ils sont prêts pour la Fachsprachprüfung, en les faisant répéter l'examen tel qu'il tombe vraiment dans leur centre.*

## 2. Proposition de valeur

Doctopus est un simulateur de Fachsprachprüfung. Il reproduit les trois parties de l'épreuve — Anamnese, Arztbrief, Fallvorstellung — avec le Bogen de ton centre, le minutage réel et le barème officiel. Ses 130 cas sont construits à partir d'environ 580 comptes rendus de candidats à Freiburg, Karlsruhe, Reutlingen et Stuttgart : tu t'entraînes sur ce qui tombe, pas sur ce qu'un manuel a choisi. Disponible à toute heure, avec ou sans binôme.

## 3. Hiérarchie de messages

**Niveau 1 — Titre (hero)**
FR : *La répétition générale de ta Fachsprachprüfung.*
DE : *Die Generalprobe für deine Fachsprachprüfung.*
EN : *The dress rehearsal for your Fachsprachprüfung.*

**Niveau 2 — Sous-titre**
FR : *130 cas construits à partir de ce qui tombe vraiment. Le Bogen de ton centre, le barème de l'examen, à toute heure.*
DE : *130 Fälle, gebaut aus dem, was wirklich drankommt. Der Bogen deiner Kammer, die Bewertung der Prüfung — jederzeit.*

**Niveau 3 — Piliers (4)**

| Pilier | Titre (5–8 mots) | Copy | Preuve |
|---|---|---|---|
| Ancrage | **Ce qui tombe vraiment, centre par centre** | Nos cas viennent de comptes rendus de candidats, datés et classés par ville. Tu vois ce qui est tombé à Stuttgart avant d'y aller. | ~580 comptes rendus, 4 centres, fréquences par pathologie (`ANALYSE.md` §3.4) |
| Exactitude | **Structuré comme l'épreuve, noté comme l'épreuve** | Trois parties de 20 minutes, 60 points, 60 % par partie. Le Bogen change selon la Kammer ; le tien est là. | Barème officiel (`CONTEXT.md`) ; Bogen Fr/Ka/Re/St |
| Disponibilité | **Ton binôme est disponible à 23 h** | Simulation avec un partenaire (QR sur smartphone), ou seul en mode Autonome. La fiche du simulant répond à chaque question d'anamnèse. | Modes local / Autonome livrés ; en ligne [À] |
| Mesure | **Savoir si tu es prêt, pas seulement réviser** | Chaque simulation complète est évaluée sur le barème. [À] Le Bereitschaftsindex agrège tes simulations, ta couverture des spécialités et ta courbe de langue. | Évaluation livrée ; index [À] |

**Niveau 4 — Banque de preuves** (formulations exactes, voir `positioning.md` §4)
1. 130 cas complets (fiche simulant, vue médicale, fiche examinateur, phrases modèles).
2. Environ 580 comptes rendus de candidats, Freiburg 91 · Karlsruhe 169 · Reutlingen 151 · Stuttgart 182.
3. Fréquences par pathologie et par centre, publiées.
4. 134 fiches Fachwissen, 23 Aufklärungen.
5. 2 249 Fachbegriffe, dont 1 204 gratuits.
6. 12 cas complets en Free.
7. Barème 60 points, 60 % par partie, niveau C1, langue uniquement.
8. Relu trois fois par une équipe de relecteurs avant publication.
9. Hébergement en Union européenne (ADR-0003).
10. Résiliation en un clic.

## 4. Par persona

### P1 — Le candidat en préparation (première fois)
- Ce qui compte : ne pas se tromper de contenu ; savoir à quoi ressemble la salle ; trouver un binôme.
- Entrée : « Tu prépares la Fachsprachprüfung à [ville] ? Voilà ce qui y est tombé. »
- Preuves qui portent : fréquences par ville, Bogen de son centre, 12 cas gratuits.
- Éviter : parler d'échec ; parler de prix avant la preuve.

### P2 — Le candidat qui a échoué une fois
- Ce qui compte : comprendre *pourquoi* (souvent : Arztbrief ou Fallvorstellung sous 60 %) ; ne pas repayer une école ; une mesure honnête.
- Entrée : « 60 % par partie. Une partie faible suffit. Doctopus note chaque partie séparément, comme le jury. »
- Preuves qui portent : évaluation par partie, phrases modèles d'Arztbrief (Konjunktiv I), [À] Bereitschaftsindex.
- Éviter : « cette fois c'est la bonne », toute promesse (voice §6.1), toute condescendance.

### P3 — Le binôme / le groupe / l'école partenaire
- Ce qui compte : jouer le patient sans préparer ; suivre plusieurs candidats ; un contenu qu'ils n'ont pas à écrire.
- Entrée : « Le simulant a la fiche du patient sur son téléphone et répond à chaque question. Tu n'as rien à préparer. »
- Preuves qui portent : fiche simulant (répond à toutes les sondes), mode local QR, Muster.
- Éviter : promettre une offre « écoles » (pas de B2B au départ, `PRODUCT-VISION.md` §7) — une ligne « institutions : nous écrire » suffit.

## 5. Par page du site

| Page | Rôle | Titre | Message clé | Preuve affichée |
|---|---|---|---|---|
| Accueil | convertir vers Free | *La répétition générale de ta Fachsprachprüfung.* | Ce qui tombe vraiment + structuré comme l'épreuve + disponible à toute heure | 130 cas · ~580 comptes rendus · 4 centres · 12 cas gratuits |
| Présentation | expliquer le produit | *Trois parties, un Bogen, un barème. Comme le jour J.* | Parcours d'une simulation : pré-simulation → Anamnese → Arztbrief → Fallvorstellung → évaluation | captures réelles de l'app, barème |
| Quick guide | rassurer et onboarder | *Ta première simulation en 10 minutes.* | 4 étapes : compte, Land + date, choisir un cas Free, lancer avec ou sans binôme | 12 cas Free |
| Pricing | décider sans piège | *Le cœur est illimité. L'IA se compte.* | Free = échantillon complet ; Pro = tout le corpus + crédits inclus ; Premium = plus de crédits. Résiliation en un clic. **Prix : direction.** | ADR-0005/0006 ; pas de prix tant que non fixés |
| Ce qui tombe vraiment | preuve d'autorité + SEO | *Ce qui tombe vraiment à [Stuttgart].* | Tableau des fréquences par pathologie, par centre, avec le nombre de comptes rendus et la période | `ANALYSE.md` §3.4 (chiffres exacts, méthode expliquée) |
| À propos | confiance | *Construit par un candidat, pour les suivants.* | Origine (protocoles collectés), méthode (relecture), ce qu'on n'est pas (§7 positioning), disclaimer ROADMAP §1.3 | équipe, méthode, cadre légal |
| FAQ | lever objections | — | « Est-ce que je vais réussir ? » → « Personne ne peut le garantir. Doctopus mesure et entraîne. » | — |

**Bandeau de responsabilité** (toutes pages, pied) — FR : *Doctopus est un outil pédagogique de préparation à un examen de langue. Il n'est ni un dispositif médical ni une aide à la décision clinique, et ne garantit aucun résultat à l'examen.* DE : *Doctopus ist ein Lernwerkzeug zur Vorbereitung auf eine Sprachprüfung. Es ist weder ein Medizinprodukt noch eine klinische Entscheidungshilfe und garantiert kein Prüfungsergebnis.*

## 6. CTA constant

Un seul CTA primaire sur tout le site, même libellé, même position (hero + fin de chaque page + nav).

| Langue | Libellé | Secondaire |
|---|---|---|
| FR | **Commencer avec 12 cas gratuits** | *Voir ce qui tombe à Stuttgart* |
| DE | **Mit 12 kostenlosen Fällen starten** | *Was in Stuttgart drankommt* |
| EN | **Start with 12 free cases** | *See what comes up in Stuttgart* |

Règles : pas de « Essai gratuit » (implique une carte), pas de « S'inscrire » (abstrait), pas de « Réussir » (interdit). Le chiffre 12 vient de `entitlements.md` L19 ; si le Free change, le CTA change. « Sans carte bancaire » ajouté en micro-copie **si** pricing le confirme.

## 7. Taglines (options, non décidées)

| Tagline | Style | Pourquoi |
|---|---|---|
| **La répétition générale.** / **Die Generalprobe.** | fonctionnel | Dit ce que c'est en deux mots ; se traduit ; ne promet rien. **Recommandée.** |
| Ce qui tombe vraiment. / Was wirklich drankommt. | preuve | Porte la page d'autorité ; excellent en social. Deuxième. |
| Prêt, mesuré. / Bereit, gemessen. | fonctionnel | Mise sur le Bereitschaftsindex — non livré. Plus tard. |
| Ton examen, avant ton examen. / Deine Prüfung, vor deiner Prüfung. | émotionnel | Clair, un peu long. |
| Le simulateur de Fachsprachprüfung. | descriptif | SEO pur, sans âme. Utile en title tag, pas en tagline. |

## 8. Ne pas dire

Voir `voice.md` §6 (liste opposable). Rappels spécifiques au site : aucun prix tant que la direction n'a pas tranché ; aucun Land hors Bade-Wurtemberg présenté comme couvert ; aucun témoignage sans consentement écrit ; aucun logo de Kammer.
