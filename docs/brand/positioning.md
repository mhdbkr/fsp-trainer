# Doctopus — positionnement

> Pôle Croissance · `brand-strategist` · v0.1 (2026-09-16, sous réserve de G1).
> Lu par `site-implementer`, `growth-content-engine`, `brand-creative-director`.
> Sources : `app/docs/PRODUCT-VISION.md` §1–3, `ANALYSE.md` §3.4, `ROADMAP-PRODUCTION.md` §1.3,
> `docs/contracts/entitlements.md`, `CONTEXT.md`. Toute preuve chiffrée ci-dessous cite sa source.

## 0. Hypothèses surfacées (à confirmer par lead-site / main)

| # | Hypothèse | Si fausse |
|---|---|---|
| H1 | Le corpus (580 comptes rendus) provient de **4 centres, tous en Bade-Wurtemberg** (Freiburg 91 · Karlsruhe 169 · Reutlingen 151 · Stuttgart 182 — `ANALYSE.md` L110). | Si d'autres Länder sont couverts, la §4 s'élargit. Tant que non : **on ne dit jamais « toute l'Allemagne »** comme preuve, seulement comme ambition. |
| H2 | L'app est en français (`app/index.html` `lang="fr"`, titres UI FR). Le public initial est donc francophone (France, Maghreb, Afrique francophone) → voir `naming-and-domain.md` §3. | Si l'app est internationalisée avant le site, la langue principale du site se rediscute. |
| H3 | Les prix ne sont pas fixés (`PRODUCT-VISION.md` §4 : « décision de la direction »). | Aucun message ne cite un prix. |
| H4 | Le Bereitschaftsindex, la correction d'Arztbrief et le patient IA vocal ne sont **pas livrés** (backlog V1–V4). | On en parle au futur ou « bientôt », jamais comme preuve. |

## 1. Catégorie

- **Catégorie déclarée** : outil de préparation à la Fachsprachprüfung (FSP).
- **Catégorie réelle** (ce à quoi le candidat nous compare) : l'école de prépa FSP (cours 4–8 semaines, 800–2 500 €, jeu de rôle avec un formateur), les livres/PDF de protocoles qui circulent sur Telegram/WhatsApp, Anki, et un binôme trouvé sur un groupe Facebook.
- **Catégorie d'opportunité** (celle qu'on veut posséder) : **le simulateur d'examen ancré sur ce qui tombe vraiment**. Ni école, ni livre, ni app de vocabulaire : l'instrument qui reproduit la salle, le minutage, le Bogen et les questions réellement posées dans le centre du candidat.

Recommandation : parler depuis la catégorie d'opportunité. Le mot-clé est **simulateur**, pas « cours » ni « app ».

## 2. Carte concurrentielle (texte)

Axe 1 : *Générique* ← → *Ancré sur les protocoles réels d'un centre*
Axe 2 : *Humain à horaires fixes, cher* ← → *Disponible à toute heure, prix aligné sur le cycle d'examen*

| Acteur | Position | Ce qu'il possède |
|---|---|---|
| École de prépa FSP | ancré (le formateur connaît les protocoles), horaires fixes, cher | la correction humaine, le groupe, la réassurance |
| Livre / PDF de protocoles | ancré mais statique, très bon marché | le « vrai » contenu brut, non structuré, non mis à jour |
| Anki / apps de vocabulaire | générique, à toute heure, gratuit | le drill de Fachbegriffe |
| Binôme trouvé en ligne | humain, gratuit, aléatoire | le jeu de rôle, sans structure ni évaluation |
| Apps généralistes de langue | générique, à toute heure | rien de spécifique à la FSP |
| **Doctopus** | **ancré ET à toute heure** — case vide aujourd'hui | le simulateur structuré (3 parties, Bogen par ville, fiche du simulant, évaluation sur le barème officiel) |

Territoire vide : *ancré sur les protocoles réels + disponible 24 h/24 + structuré comme l'examen*. Personne n'y est.

## 3. Territoire

- **L'espace** : la répétition générale de l'examen, autant de fois qu'il faut, sur les cas qui tombent vraiment.
- **Le public possédé** : le médecin non germanophone qui a une date (ou une fenêtre) d'examen FSP, un niveau B2–C1, et qui veut savoir s'il est prêt — pas seulement « réviser ».
- **Le fossé** : (1) 130 cas construits depuis ~580 comptes rendus de vrais candidats, avec fréquences par pathologie et par centre ; (2) la boucle communautaire (protocole soumis → crédits → corpus rafraîchi) qui fait grandir ce corpus à chaque session d'examen ; (3) la structure exam-exacte (3 parties, barème 60 pts / 60 % par partie, Bogen par ville). Copier (3) est possible ; copier (1)+(2) demande des années de candidats.

## 4. Preuves — ce qu'on a le droit d'affirmer aujourd'hui

Chaque preuve est **mesurée** (M), **estimée** (E) ou **à venir** (À). Seules les M sont utilisables telles quelles.

| Preuve | Statut | Formulation autorisée | Source |
|---|---|---|---|
| 130 cas cliniques complets (fiche simulant, vue médicale, fiche examinateur, Muster) | M | « 130 cas complets » | `VERIFICATION-GLOBALE.md` L3 |
| ~580 comptes rendus de candidats, 4 centres | M | « construits à partir d'environ 580 comptes rendus de candidats à Freiburg, Karlsruhe, Reutlingen et Stuttgart » | `ANALYSE.md` L110 |
| Fréquences par pathologie et par centre | M | « ce qui tombe vraiment à Stuttgart » (avec le tableau) | `ANALYSE.md` §3.4 |
| 134 fiches Fachwissen, 23 Aufklärungen | M | chiffres exacts | `VERIFICATION-GLOBALE.md` L3 |
| 2 249 Fachbegriffe, dont 1 204 Allgemein en Free | M | chiffres exacts | `entitlements.md` L21 |
| Barème officiel (60 pts, ≥ 60 % par partie, C1, langue seulement) | M | « évalué sur le barème de l'examen » | `CONTEXT.md` |
| Bogen par ville (Muster-Bogen Freiburg/Karlsruhe/Reutlingen/Stuttgart) | M | « le Bogen de ton centre » — **BW seulement** | `CONTEXT.md`, H1 |
| Free = 12 cas complets + 1 204 termes | M | « 12 cas complets gratuits, sans carte bancaire » (vérifier « sans carte » avec pricing) | `entitlements.md` L19 |
| Trois passes de relecture, 1 720 corrections | M | « relu trois fois » (ne pas citer le chiffre, il inquiète plus qu'il ne rassure) | `VERIFICATION-GLOBALE.md` |
| Bereitschaftsindex | À | « bientôt » uniquement | backlog #2 |
| Correction d'Arztbrief, patient IA vocal | À | « bientôt » uniquement | backlog #4, #13 |
| « Toute l'Allemagne », « tous les Länder » | E/À | **interdit comme preuve** ; autorisé comme ambition explicite (« centre par centre, Land après Land ») | H1 |
| Taux de réussite des utilisateurs | — | **interdit** (aucune donnée, et promesse de résultat, ROADMAP §1.3) | — |

## 5. Énoncé de positionnement

**Stratégique (interne)** — Pour les médecins non germanophones qui préparent la Fachsprachprüfung, Doctopus est le simulateur d'examen qui les entraîne sur les cas qui tombent vraiment dans leur centre, parce qu'il est construit depuis ~580 comptes rendus de vrais candidats et structuré exactement comme l'épreuve (trois parties, Bogen, barème).

**Public (site, FR)** — Doctopus, c'est la répétition générale de ta Fachsprachprüfung : les cas qui tombent vraiment, le Bogen de ton centre, le barème de l'examen — à toute heure, autant de fois qu'il faut.

**Public (site, DE)** — Doctopus ist die Generalprobe für deine Fachsprachprüfung: die Fälle, die wirklich drankommen, der Bogen deiner Kammer, die Bewertung der Prüfung — jederzeit, so oft du willst.

**Public (site, EN)** — Doctopus is the dress rehearsal for your Fachsprachprüfung: the cases that actually come up, your centre's Bogen, the real marking scheme — any time, as often as you need.

## 6. En une phrase (≤ 30 mots)

> Doctopus : le simulateur de Fachsprachprüfung construit sur les comptes rendus de vrais candidats — pour savoir si tu es prêt, pas seulement pour réviser.

## 7. Ce que Doctopus refuse d'être

- Doctopus **n'est pas une école** : pas de promesse de suivi humain, pas de « coach ». (Le binôme à distance est un partenaire, pas un formateur.)
- Doctopus **ne garantit rien** : ni réussite, ni score, ni « 100 % ». Il mesure et il entraîne. (ROADMAP §1.3.)
- Doctopus **n'est pas un dispositif médical** ni une aide à la décision clinique : le contenu sert un examen de langue.
- Doctopus **ne compte pas les cases cochées** : pas de streak punitif, pas de compteur d'anxiété ; on récompense la simulation complète, pas le login (ADR-0008).
- Doctopus **ne se vend pas comme « app IA »** : l'IA est un service en crédits, pas l'identité (ADR-0005).

## 8. Drapeaux rouges à surveiller

- Toute page qui pourrait être celle d'une école ou d'une app de langue générique → réécrire depuis §3.
- Toute preuve non listée en §4 → interdite tant qu'elle n'y est pas.
- Toute mention d'un Land hors BW comme couvert → interdite (H1).
