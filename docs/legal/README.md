# docs/legal/ — état des brouillons

> **Aucun de ces textes n'est validé. Aucun n'est certifié conforme.**
> Ce dossier documente ce qui manque, pas ce qui est acquis.

Rédigé par `compliance-checker` (pôle Fondations), 2026-09-16, en réponse au
handoff `lead-site → compliance-site` (étape 2, sous réserve de G1).
Périmètre d'écriture : `docs/legal/` uniquement.

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
   (page « ce qui tombe vraiment », `PRODUCT-VISION.md` §5), garanties de
   transfert hors UE si l'hébergement du site est confirmé hors UE (Vercel
   présumé, non confirmé par un contrat lu), sous-traitant IA/voix non
   encore choisi à documenter dès sélection, durées de conservation
   fiscales exactes selon droit applicable (FR et/ou DE).
3. **AGB** : clause de droit applicable / juridiction (protection
   impérative du consommateur allemand, art. 6 Rom I, quel que soit le
   droit choisi pour le contrat), règle de péremption et de remboursement
   des crédits (décision produit non tranchée — à faire trancher par la
   direction avant rédaction juridique finale), clause de limitation de
   responsabilité.
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

`{{RAISON_SOCIALE}}`, `{{FORME_JURIDIQUE}}`, `{{PAYS_ETABLISSEMENT}}`,
`{{ADRESSE_RUE_NUMMER}}` / `{{ADRESSE_COMPLETE}}`, `{{PLZ_ORT}}`,
`{{PAYS}}`, `{{VOR_UND_NACHNAME}}`, `{{TELEFON}}`, `{{KONTAKT_EMAIL}}`,
`{{DATENSCHUTZ_KONTAKT_EMAIL}}`, `{{REGISTER_ODER_SIRET_NUMMER}}`,
`{{USTID_ODER_TVA_INTRACOM}}`, `{{HOSTING_ANBIETER}}`,
`{{ANBIETER_NAME_UND_SITZ}}` (fournisseur IA/voix), `{{PREISE_PLATZHALTER}}`,
`{{ANZAHL_CREDITS_PRO}}`, `{{ANZAHL_CREDITS_PREMIUM}}`,
`{{LAUFZEIT_UND_KUENDIGUNGSFRIST}}`, `{{VERFALLSREGEL}}`,
`{{RUECKERSTATTUNGSREGEL}}`, `{{ANWENDBARES_RECHT}}`,
`{{HAFTUNGSBESCHRAENKUNG_KLAUSEL}}`, `{{AUFBEWAHRUNGSFRIST_STEUERRECHT}}`.

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
- [ ] Cookie banner : uniquement si des cookies non essentiels sont
      introduits (recommandation de ce brouillon : aucun au lancement) —
      NON VÉRIFIÉ.
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
| Hébergement site | logs techniques standard | Art. 6(1)(f) | hébergeur du site — **non confirmé** (Vercel présumé) | à définir |

## 6. Points ouverts explicitement non tranchés ici

- Origine et droits du contenu médical du corpus (verrou §1.1 de
  `ROADMAP-PRODUCTION.md`) — ne relève pas de la conformité RGPD/CGV,
  question de propriété intellectuelle et de responsabilité éditoriale
  distincte. Non traité, non deviné.
- Fournisseur IA/voix définitif (ADR-0011 : démo statique pré-générée pour
  l'instant, aucun LLM temps réel en production au moment de ce brouillon).
- Hébergeur du site définitif (Vercel mentionné dans le brief de handoff,
  non retrouvé dans un ADR ou contrat lu par ce pôle).
- Prix, quotas de crédits, règle de péremption/remboursement — décisions
  produit de la direction, pas de conformité.
