# Doctopus — vision produit

> Source unique de la vision pour tous les agents. Ce que Doctopus veut être,
> ce qui le rend différent, ce qui a été décidé. Les décisions structurantes
> ont chacune un ADR dans `docs/adr/`.

## 1. L'ambition

**Doctopus devient la référence de préparation aux examens d'équivalence
médicale en Allemagne** — d'abord la Fachsprachprüfung (FSP), dans tous les
Länder ; puis la Kenntnisprüfung ; puis l'automatisation des candidatures
(Hospitationen, Stellen) ; puis, pourquoi pas, les EVC en France.

Ce qui le distingue d'une école de prépa et d'un livre : des outils
centralisés, une expérience immersive, une approche pédagogique qui simplifie
l'examen, un apprentissage intuitif, et une gamification qui récompense ce qui
fait réussir — jamais ce qui retient.

## 2. Le principe de conception — la symbiose

Les retours d'usage réel (`BACKLOG-FEEDBACK.md`) l'ont montré : les défauts
qui comptent ne sont pas des bugs, ce sont des **ruptures de symbiose** — les
instants où l'outil oblige l'humain à s'adapter à lui (Frauenanamnese posée à
un homme, OPQRST récité à un diabétique sans douleur, notes absentes du focus).

Conséquences organisationnelles : un **avocat de l'utilisateur** joue l'app
avec des personas et rapporte au produit ; le **pédagogue a un droit de veto**
sur toute mécanique de rétention et relit chaque page de pricing ; la
persuasion est éthique (transparence, résiliation en un clic, prix aligné sur
le cycle d'examen) — les dark patterns détruiraient une référence en un thread.

## 3. Les innovations — ce qui fait basculer un candidat

Par ordre d'impact. Les quatre premières sont bâties sur ce qui existe déjà.

1. **Prüfungstag-Simulator + Bereitschaftsindex** — 60 minutes réelles, les
   trois parties enchaînées, sans assistance, évaluation complète ; puis un
   indice « es-tu prêt ? » calculé sur les simulations, la couverture des
   spécialités, la courbe de langue. L'indice gratuit dit « 54 % », l'abonnement
   dit comment atteindre 80. Feature de conversion n° 1.
2. **Correction instantanée de l'Arztbrief** — comparaison au Muster sur les
   axes de l'examen : Konjunktiv I manquant, formule orale dans l'écrit,
   Fachbegriff attendu absent. La correction humaine de l'école, à 23 h.
3. **L'ancrage sur les protocoles réels, rendu visible** — 130 cas issus
   d'environ 580 comptes rendus, avec fréquences par pathologie et par ville.
   Page publique « Ce qui tombe vraiment à Stuttgart » : argument marketing et
   preuve d'autorité.
4. **La boucle de protocoles communautaires** — après l'examen, formulaire
   structuré → crédits → pipeline v3 → corpus rafraîchi à chaque session, dans
   chaque Land. **Le fossé défensif** et la richesse de données, consenties.
5. **Système de personnages** — patient croqué (posture, zone douloureuse,
   grimace à la bonne question), Oberarzt caricaturé qui pose les
   `caseSpecificQuestions`, même trait sur les trois parties, l'Aufklärung et le
   site. **Rive**, pas 3D : vectoriel, 40 Ko, machine à états `posture` ·
   `douleur:zone` · `émotion`.
6. **Prüfungsakademie** — parcours animé : la salle, les trois personnes, le
   minutage, le barème (60 points, 60 % par partie, langue uniquement), les
   questions du jury, enregistrements exemplaires d'anamnèse et de Vorstellung.
   Le candidat qui a vu la salle a déjà gagné dix points de stress.
7. **Carte de fidélité par Landesärztekammer** — choisis ton Land → Bogen,
   minutage, jury, questions typiques. Le Muster par ville existe déjà ; on
   généralise. Personne ne couvre l'Allemagne entière avec cette précision.
8. **Binôme à distance** — session par lien, fiche simulant qui suit le
   candidat, rôles inversables ; le partenaire de jeu de rôle de l'école,
   disponible à toute heure.
9. **Fachbegriffe rafraîchi** — favoris (étoile, « expliquer »), decks
   personnels, bouton Fachbegriffe du cas dans la barre de simulation, drill
   post-simulation ancré sur le cas puis la spécialité, tri alphabétique à
   curseur vertical avec zoom au survol, étiquettes par statut SRS, favoris
   dans le programme temps réel, **explication en contexte** (le mot dans sa
   phrase), **registre double** (terme technique / formulation patient, côte à
   côte — la compétence exacte que l'examen note).
10. **Fachwissen visuel** — un système, pas des illustrations : bibliothèque
    de composants (silhouette anatomique cliquable, arbre décisionnel, mindmap
    de syndrome, frise, tableau comparatif, toggles thérapie, jauge de score)
    pilotés par une spec JSON par pathologie ; style reconnaissable sans logo ;
    le texte se décharge. Higgsfield pour les héros et le social, pas pour la
    structure pédagogique.
11. **Ligue** — opt-in, pseudonyme, points validés serveur, récompense une
    simulation complète en Autonome (beaucoup) et un login (zéro) ; code promo
    mensuel au vainqueur.
12. **Trois modes de simulation**, choisis en pré-simulation : local (QR +
    smartphone, existant), en ligne (binôme à distance), patient virtuel IA
    vocal — ce dernier **grisé « bientôt »** avec une **démo sur un cas fictif,
    5–6 questions, audio pré-généré et servi en statique** (zéro LLM, zéro
    coût par écoute). Le chantier complet vient à part.

## 4. Le modèle — crédits hybrides

Le cœur est **illimité** dans l'abonnement : cas, simulations locales et en
ligne, Fachbegriffe, Fachwissen, programme. Les **Doctopus Credits** couvrent
ce qui coûte réellement : patient IA vocal, correction d'Arztbrief, Oberarzt
IA. Quota mensuel inclus dans Pro, recharges possibles, plus dans Premium ;
quelques crédits de démo en Free. Le crédit est aussi la monnaie de la
communauté (protocole soumis, ligue gagnée). Un compteur sur *tout* créerait
l'anxiété de consommation — l'inverse de la symbiose.

Plans : Free (échantillon complet — 12 cas avec leurs fiches, Aufklärungen,
termes Allgemein) / Pro / Premium. Les prix sont une décision de la direction.

## 5. Profilage — le profil comme parcours de procédure

À l'inscription, quatre champs : Land visé, date d'examen, niveau de langue,
étape de la procédure. Le reste progressif. Il pilote la difficulté des cas
(champ `difficulty` à ajouter aux 130 cas), le Bogen, le plan à rebours,
l'indice de préparation ; agrégé et consenti, il nourrit la page « ce qui
tombe vraiment ». Concevoir le profil comme un parcours rend l'extension KP
et candidatures naturelle.

## 6. Le site

Séparé de l'app, dans un monorepo partageant les tokens de design :
`apps/app`, `apps/site`, `packages/tokens`, `packages/content-schema`,
`supabase/`. Pages : accueil, présentation approfondie, quick guide, pricing,
FAQ, blog (la FSP est une niche *cherchée* — le SEO est un canal majeur), à
propos, support, statut, bloc légal allemand (Impressum, Datenschutz, AGB,
Widerrufsbelehrung), et — plus tard — institutions. Liquid glass 3D **comme
signature du hero et des transitions**, pas comme matière de page : un site
rapide avec un moment de magie convertit mieux qu'un site lourd.

## 7. Marketing autonome — une machine à politiques

Meta et Google exposent des API publicitaires (MCP). Mehdi fixe les
directives (budget quotidien maximal, audiences, ton) ; les agents rédigent,
programment, lisent les métriques, proposent les réallocations. Deux seuils
d'approbation : toute créa avant publication, tout dépassement de budget.
Créas via Higgsfield (API si disponible, sinon navigateur), relues par la
marque avant publication. Pas de B2B au départ : un site rentable et des
campagnes sociales.

## 8. Cadre légal et fiscal — orientation, pas conseil

Stripe exige un statut légal ; la TVA UE sur services numériques est due dans
le pays du client (Stripe Tax + OSS) ; Estonie et Chypre ne changent pas le
lieu d'imposition d'un résident. Orientation recommandée, à faire valider par
un comptable : **micro-entreprise en France maintenant**, migration vers une
structure allemande au déménagement. Pas d'entreprise « officielle » au-delà
au départ ; comptable et déclaration si le marché se confirme.

## 9. Ce qui est décidé (ADRs)

| ADR | Décision |
|---|---|
| 0001 | La couche mécanique tranche avant tout jugement d'agent |
| 0002 | Les agents communiquent par contrats écrits |
| 0003 | Supabase région EU, Stripe, dépôt privé |
| 0004 | Un compte = une personne (profils locaux supprimés) |
| 0005 | Crédits hybrides : cœur illimité, IA en crédits ; ledger |
| 0006 | Free = échantillon complet ; Fachbegriffe Free = Allgemein |
| 0007 | Personnages en Rive, pas en 3D |
| 0008 | Avocat de l'utilisateur ; veto du pédagogue ; pricing éthique |
| 0009 | Routage des modèles : Opus juge, Sonnet exécute, Haiku trie |
| 0010 | Monorepo app + site + tokens partagés |
| 0011 | Voix : démo statique pré-générée d'abord ; chantier complet à part |
