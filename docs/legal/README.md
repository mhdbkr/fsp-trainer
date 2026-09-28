# docs/legal/ — état des brouillons

> **Aucun de ces textes n'est validé. Aucun n'est certifié conforme.**
> Ce dossier documente ce qui manque, pas ce qui est acquis.

Rédigé par `compliance-checker` (pôle Fondations), 2026-09-16, en réponse au
handoff `lead-site → compliance-site` (étape 2, sous réserve de G1).
Périmètre d'écriture : `docs/legal/` uniquement.

**Mise à jour 2026-09-16** (message de `lead-site`) : hébergeur du site =
Vercel ; analytics = Plausible ou Umami, UE, sans cookie, sans donnée
personnelle ; checkout réel via Stripe, durées mensuel/3 mois sans
reconduction tacite, résiliation « jederzeit im Konto, ohne Begründung,
wirksam zum Periodenende », jamais « en un clic » ; marque « Doctopus »,
produit « FSP Trainer » ; placeholders d'identité harmonisés `{{LEGAL_*}}`.
Intégré dans les cinq fichiers concernés (voir commits datés du même jour).

## 1. Fichiers

| Fichier | Contenu | Statut |
|---|---|---|
| `impressum.md` | Mentions légales § 5 DDG | brouillon, placeholders |
| `datenschutz.md` | DSGVO — responsable, sous-traitants, droits | brouillon, placeholders |
| `agb.md` | CGV — plans, crédits, résiliation, contenu numérique | brouillon, placeholders + décisions produit ouvertes |
| `widerruf.md` | Rétractation + formulaire type | brouillon, dépend d'une case produit non confirmée branchée |
| `disclaimer.md` | Avertissement outil pédagogique, DE/EN/FR, long+court | brouillon, prêt à traduire en UI sous réserve de relecture |

## 2. Ce qu'un juriste doit valider avant toute publication

1. **Impressum** : régime exact pour un micro-entrepreneur français servant
   un public allemand (mentions françaises complémentaires, SIRET/RCS vs
   Handelsregister/USt-IdNr.), qualification éventuelle du blog comme
   contenu « journalistisch-redaktionell », clause de non-participation à
   la médiation des litiges de consommation.
2. **Datenschutz** : base légale précise pour l'usage agrégé du profil
   (page « ce qui tombe vraiment », `PRODUCT-VISION.md` §5), formulation
   exacte des garanties de transfert hors UE vers Vercel (hébergeur
   confirmé par la direction le 2026-09-16, clauses contractuelles types /
   Data Privacy Framework à préciser), confirmation que l'outil analytics
   retenu (Plausible ou Umami, `{{ANALYTICS_PROVIDER}}`) ne traite
   effectivement aucune donnée personnelle sur la configuration déployée,
   sous-traitant IA/voix non encore choisi à documenter dès sélection,
   durées de conservation fiscales exactes selon droit applicable (FR
   et/ou DE).
3. **AGB** : clause de droit applicable / juridiction (protection
   impérative du consommateur allemand, art. 6 Rom I, quel que soit le
   droit choisi pour le contrat), règle de péremption et de remboursement
   des crédits (décision produit non tranchée — à faire trancher par la
   direction avant rédaction juridique finale), clause de limitation de
   responsabilité, et la clause de non-reconduction tacite au § 5 au
   regard du droit allemand de la résiliation en ligne (§ 312k BGB).
4. **Widerruf** : formulation et emplacement de la case de renonciation
   expresse au droit de rétractation (§ 356 Abs. 5 BGB) — condition de
   validité, non vérifiable dans un document ; calcul du remboursement
   proportionnel en cas de rétractation partielle.
5. **Disclaimer** : conformité au droit de la publicité et de la protection
   des consommateurs allemand sur les promesses de résultat.
6. **Origine du contenu** (verrou §1.1 de `ROADMAP-PRODUCTION.md`) — la
   provenance et les droits sur le corpus de cas médicaux ne relèvent pas
   de ce brouillon et ne sont **pas tranchés ici**. Point ouvert, à statuer
   séparément avant publication ; ce README ne préjuge d'aucune réponse.

## 3. Placeholders à remplir par la direction

Depuis 2026-09-16, tous les placeholders d'identité de l'exploitant sont
harmonisés sous le préfixe `{{LEGAL_*}}` (décision `lead-site`).

**Identité de l'exploitant** (répétés à l'identique dans chaque fichier) :
`{{LEGAL_NAME}}` (raison sociale), `{{LEGAL_FORM}}` (forme juridique),
`{{LEGAL_COUNTRY}}` (pays d'établissement), `{{LEGAL_ADDRESS_STREET}}`,
`{{LEGAL_ADDRESS_CITY}}` (PLZ/Ort), `{{LEGAL_REPRESENTATIVE}}` (nom du
représentant), `{{LEGAL_PHONE}}`, `{{LEGAL_EMAIL}}` (contact général),
`{{LEGAL_PRIVACY_EMAIL}}` (contact protection des données, peut être
identique à `{{LEGAL_EMAIL}}`), `{{LEGAL_REGISTER_OR_SIRET}}`,
`{{LEGAL_VAT_ID}}`.

**Autres placeholders, par fichier** :
- `datenschutz.md` : `{{ANALYTICS_PROVIDER}}` (Plausible ou Umami, choix
  final non arrêté), `{{LEGAL_AI_PROVIDER_NAME_AND_SEAT}}` (fournisseur
  IA/voix, non choisi), `{{LEGAL_TAX_RETENTION_PERIOD}}`.
- `agb.md` : `{{LEGAL_SUBSCRIPTION_PRICES}}`, `{{LEGAL_CREDITS_EXPIRY_RULE}}`,
  `{{LEGAL_CREDITS_REFUND_RULE}}`, `{{LEGAL_GOVERNING_LAW}}`,
  `{{LEGAL_LIABILITY_CLAUSE}}`, `{{BESCHREIBUNG_PRO}}`,
  `{{BESCHREIBUNG_PREMIUM}}`, `{{ANZAHL_CREDITS_PRO}}`,
  `{{ANZAHL_CREDITS_PREMIUM}}`.

Marque et produit (tranchés, pas des placeholders) : marque « Doctopus »,
produit « FSP Trainer ».

## 4. Check-list de ce qui doit être BRANCHÉ dans le produit (pas seulement écrit)

Cette section documente ce qui manque, elle ne certifie rien. Statut
`NON VÉRIFIÉ` = ce pôle n'a pas accès au code du site pour vérifier
(périmètre d'écriture limité à `docs/legal/`) ; à vérifier par
`site-implementer` / `review-site`.

- [ ] Lien Impressum visible sur **toutes** les pages (pied de page),
      atteignable en un clic — NON VÉRIFIÉ.
- [ ] Lien Datenschutz visible sur toutes les pages — NON VÉRIFIÉ.
- [ ] Lien AGB accessible depuis la page de pricing/checkout avant paiement
      — NON VÉRIFIÉ.
- [ ] Lien Widerrufsbelehrung + formulaire accessible depuis le checkout —
      NON VÉRIFIÉ.
- [ ] Disclaimer version courte dans le pied de page (DE au minimum) — NON
      VÉRIFIÉ.
- [ ] Case à cocher **distincte** au moment du paiement : (a) acceptation
      des AGB, (b) acceptation de la Datenschutzerklärung — deux cases
      séparées, pas une seule case fourre-tout — NON VÉRIFIÉ.
- [ ] Case à cocher **supplémentaire, distincte des deux précédentes** :
      renonciation expresse au droit de rétractation pour contenu
      numérique (§ 356 Abs. 5 BGB) — condition de validité juridique de
      `widerruf.md` § « Vorzeitiges Erlöschen » — NON VÉRIFIÉ, sans cette
      case le droit de rétractation reste ouvert malgré le texte.
- [ ] Export des données du compte (droit à la portabilité, art. 20 DSGVO)
      accessible depuis les paramètres du compte — NON VÉRIFIÉ, dépend du
      pôle app (hors périmètre d'écriture ici).
- [ ] Suppression de compte accessible depuis les paramètres, effaçant
      `profiles`, `progress_events`, `credit_ledger` (droit à l'effacement,
      art. 17 DSGVO) — NON VÉRIFIÉ, hors périmètre d'écriture ici ; à
      confirmer que la suppression Supabase Auth entraîne bien la
      suppression/anonymisation des lignes liées par `user_id`
      (`docs/contracts/schema.sql`).
- [ ] Cookie banner : non nécessaire tant que l'analytics UE
      (`{{ANALYTICS_PROVIDER}}`) reste sans cookie et sans donnée
      personnelle et qu'aucun autre traceur n'est ajouté — NON VÉRIFIÉ, à
      confirmer sur la configuration technique réellement déployée.
- [ ] Bouton/flux de résiliation dans le compte conforme à § 312k BGB
      (résiliation facile, en ligne, confirmation) — décrit dans `agb.md`
      § 5 comme « jederzeit im Konto, ohne Begründung, wirksam zum
      Periodenende », jamais présenté comme « en un clic » — NON VÉRIFIÉ.
- [ ] Previews de déploiement (Vercel) en `noindex` — NON VÉRIFIÉ.
- [ ] Cohérence entre le disclaimer du site et celui de l'app (hors
      périmètre d'écriture ici, transmis au pôle app via le coordinateur).

## 5. Registre des traitements (minimal, à valider par un juriste)

| Traitement | Données | Base légale envisagée | Sous-traitant | Durée envisagée |
|---|---|---|---|---|
| Compte | e-mail, mot de passe, display_name | Art. 6(1)(b) | Supabase (EU, Francfort) | jusqu'à suppression du compte |
| Profil de procédure | pays visé, date d'examen, niveau, étape, spécialité, pays diplôme, intention KP | Art. 6(1)(b) | Supabase (EU) | jusqu'à suppression du compte |
| Progression | événements simulation/SRS/plan/palier | Art. 6(1)(b) | Supabase (EU) | jusqu'à suppression du compte |
| Crédits | grand livre (montant, raison, référence) | Art. 6(1)(b) | Supabase (EU) | conservation comptable à confirmer |
| Paiement | abonnement, moyens de paiement (non stockés par Doctopus) | Art. 6(1)(b) | Stripe | selon obligations fiscales |
| IA Arztbrief / patient vocal | texte/audio soumis pour correction ou dialogue | Art. 6(1)(b) | fournisseur IA/voix — **non choisi**, placeholder | à définir avec le fournisseur |
| Hébergement site | logs techniques standard | Art. 6(1)(f) | **Vercel** (confirmé 2026-09-16), siège US — garanties de transfert à préciser | à définir |
| Analytics site | mesure d'audience, sans cookie visé | Art. 6(1)(f) (si donnée personnelle) | **Plausible ou Umami** (UE, choix final ouvert), placeholder `{{ANALYTICS_PROVIDER}}` | à définir |

## 6. Points ouverts explicitement non tranchés ici

- Origine et droits du contenu médical du corpus (verrou §1.1 de
  `ROADMAP-PRODUCTION.md`) — ne relève pas de la conformité RGPD/CGV,
  question de propriété intellectuelle et de responsabilité éditoriale
  distincte. Non traité, non deviné.
- Fournisseur IA/voix définitif (ADR-0011 : démo statique pré-générée pour
  l'instant, aucun LLM temps réel en production au moment de ce brouillon).
- Choix final entre Plausible et Umami pour l'analytics (hébergeur du site
  Vercel et principe « UE, sans cookie, sans donnée personnelle » tranchés
  par la direction le 2026-09-16 ; le fournisseur analytics précis ne
  l'est pas encore).
- Prix, quotas de crédits, règle de péremption/remboursement — décisions
  produit de la direction, pas de conformité.

## 7. Notes de rédaction par fichier (hors des textes publiés)

Ces notes étaient rendues telles quelles dans les pages publiques `/de/impressum/`,
`/de/datenschutz/`, `/de/agb/` et `/de/widerruf/` : `LegalPage.astro` restitue tout le
corps Markdown. Elles sont déplacées ici — langue de travail interne, destinataire la
direction — sans une ligne de changée.

### `impressum.md`

**FR — note pour la direction**

Ceci est un brouillon de mentions légales (Impressum) pour le site Doctopus.
Contexte retenu (source : `app/docs/PRODUCT-VISION.md` §8, ADR-0003) :
opérateur en **micro-entreprise en France maintenant**, migration vers une
structure allemande envisagée au déménagement. Le site cible un public
germanophone et l'application traite des données de candidats à la FSP
(Allemagne) — l'obligation d'Impressum du droit allemand (§5 DDG, ex-TMG)
s'applique dès qu'un service est « geschäftsmäßig » proposé à des
utilisateurs en Allemagne, **indépendamment du lieu d'établissement du
prestataire**. Un établissement en France n'exonère donc pas des mentions ;
il change leur contenu (forme juridique française, RCS/SIRET au lieu de
Handelsregister, TVA intracommunautaire au lieu de USt-IdNr. le cas échéant).
**Ce point — l'articulation droit français / droit allemand pour un
prestataire établi en France servant un public allemand — est un point à
faire trancher par un juriste**, idéalement bilingue droit des médias
allemand + droit français, avant toute mise en ligne.

Décision direction (2026-09-16, via `lead-site`) : marque « Doctopus »,
produit « FSP Trainer ». Placeholders d'identité harmonisés sous le
préfixe `{{LEGAL_*}}` — liste complète dans `docs/legal/README.md` §3.


### `datenschutz.md`

**FR — note pour la direction**

Traitements identifiés (source : `docs/contracts/schema.sql`, ADR-0003,
ADR-0005, ADR-0011, `app/docs/PRODUCT-VISION.md` §4–5) :

- **Compte** : e-mail, mot de passe (Supabase Auth), `display_name`.
- **Profil de procédure** (`profiles`) : pays d'examen visé (`target_land`),
  date d'examen, niveau de langue, étape de procédure, spécialité d'origine,
  pays du diplôme, intention KP — données sensibles au sens large (liées à
  un parcours de reconnaissance professionnelle et de santé, pas des données
  de santé au sens de l'art. 9 RGPD mais à traiter avec prudence).
- **Progression** (`progress_events`, `credit_ledger`) : simulations
  terminées, révisions SRS, plans, paliers de cas atteints, crédits
  consommés/attribués (raison, référence).
- **Paiement** : Stripe (Checkout, Customer Portal, webhooks) — Doctopus ne
  stocke pas les données de carte, Stripe agit comme sous-traitant.
- **IA / voix** : consommation de crédits pour Arztbrief (correction IA) et
  patient IA vocal — implique un ou plusieurs sous-traitants IA/voix. **Le
  fournisseur exact n'est pas encore arrêté dans les contrats lus**
  (ADR-0011 mentionne une démo statique pré-générée sans LLM en temps réel
  pour l'instant ; le chantier #13 patient IA vocal temps réel n'est pas
  livré). Placeholder à compléter dès que le fournisseur est choisi.
- **Hébergement du site** : **Vercel, confirmé par la direction le
  2026-09-16** (root `apps/site`, previews en `noindex`). Transfert de
  données hors UE (Vercel Inc., États-Unis) à documenter avec les garanties
  (clauses contractuelles types / Data Privacy Framework) — reste à faire
  valider par un juriste, mais le choix du fournisseur n'est plus ouvert.
- **Analytics** : décision direction — Plausible ou Umami, **hébergé UE,
  sans cookie, sans donnée personnelle**. Fournisseur exact en placeholder
  `{{ANALYTICS_PROVIDER}}` (le nom définitif entre Plausible et Umami n'est
  pas encore arrêté). Pas de bandeau de consentement nécessaire tant que
  l'outil ne dépose aucun cookie et ne traite aucune donnée à caractère
  personnel — **à faire confirmer par un juriste** sur la base de la
  configuration réellement déployée (ce brouillon ne peut pas vérifier la
  configuration technique).
- **Cookies** : recommandation maintenue — **aucun cookie non essentiel au
  lancement**. Si le marketing autonome (ADR §7 de `PRODUCT-VISION.md`)
  introduit des pixels publicitaires plus tard, un bandeau de consentement
  CMP redevient nécessaire et cette section devra être réécrite.


### `agb.md`

**FR — note pour la direction**

Structure retenue (source : `app/docs/PRODUCT-VISION.md` §4, ADR-0005,
ADR-0006) : trois plans Free / Pro / Premium ; cœur pédagogique illimité
dans l'abonnement ; Doctopus Credits pour les fonctions coûteuses (patient
IA vocal, correction Arztbrief, Oberarzt IA) avec quota mensuel inclus et
recharges possibles ; les crédits sont aussi une monnaie communautaire
(récompense de protocole soumis, de ligue gagnée). **Les prix ne sont pas
fixés** (décision direction, non tranchée dans les contrats lus) — laissés
en placeholder. Le contenu numérique + les crédits soulèvent une question
de renonciation au droit de rétractation (voir `widerruf.md`) qui doit être
cohérente avec cet AGB (case à cocher de renonciation expresse au moment de
l'achat).

Décisions direction (2026-09-16, via `lead-site`) intégrées ci-dessous :
checkout réel via Stripe ; durées mensuelle et 3 mois, **sans reconduction
tacite silencieuse** ; résiliation « jederzeit im Konto, ohne Begründung,
wirksam zum Periodenende » — **jamais présentée comme « en un clic »**.
Placeholders d'identité harmonisés sous `{{LEGAL_*}}`.


### `widerruf.md`

**FR — note pour la direction**

Point sensible : les abonnements Doctopus et l'achat de crédits sont du
« contenu numérique non fourni sur un support matériel ». Le droit de
rétractation de 14 jours peut s'éteindre par avance si le consommateur (a)
consent expressément à l'exécution avant la fin du délai et (b) reconnaît
perdre son droit de rétractation de ce fait (§ 356 Abs. 5 BGB). **Ceci doit
être branché dans le produit** : une case à cocher explicite au moment du
paiement, distincte de l'acceptation des AGB — non vérifiable par ce
brouillon (voir `README.md`, case « branché »). Sans cette case, le
consommateur garde son droit de rétractation même après consommation, ce
qui expose à des remboursements a posteriori.

Décision direction (2026-09-16, via `lead-site`) : le checkout est réel,
via Stripe. La case de renonciation expresse (§ 356 Abs. 5 BGB) doit donc
être intégrée dans le flux Stripe Checkout (ou juste avant, côté site,
avant redirection) — **hors périmètre d'écriture de ce brouillon**, à
vérifier « branché » par `site-implementer`. Placeholders d'identité
harmonisés sous `{{LEGAL_*}}`.

