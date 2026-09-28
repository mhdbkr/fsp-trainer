# Doctopus — nom, domaine, langue du site

> Pôle Croissance · `brand-strategist` · v0.1 (2026-09-16, sous réserve de G1).
> v0.2 : décisions de la direction intégrées (via `lead-site`, 2026-09-16) — voir §0. Les options
> initiales sont conservées pour mémoire. La disponibilité des domaines n'a **pas** été vérifiée (§5).

## 0. Décisions de la direction (2026-09-16)

| Sujet | Décision |
|---|---|
| Architecture de marque | **Doctopus** = nom de la marque et du projet. **FSP Trainer** = nom du produit (l'app). Le site présente Doctopus, qui édite FSP Trainer. |
| Langue du site | **DE seul en V1.** FR/EN plus tard. |
| Domaine | **`doctopus.co`** (à confirmer : disponibilité et marque non vérifiées). App sur `app.doctopus.co` (proposition). |
| Tagline | **« Die Generalprobe. »** validée. |
| Checkout | Réel dès V1 (Stripe) — pas de liste d'attente. |
| Preuve d'autorité | Limitée au Bade-Wurtemberg (inchangé, `positioning.md` H1). |

**Conséquence de « DE seul » sur l'app FR** (constat §3, inchangé) : le visiteur passe d'un site DE à une app FR. Proposition de contrat vers le pipeline app : internationaliser l'UI (DE en priorité) avant l'ouverture publique — hors périmètre `docs/brand/`, à porter par `lead-site` → `main`.

### Règles de nommage marque / produit
- « Doctopus » pour : la marque, le site, le compte, les crédits (« Doctopus Credits »), la mascotte, l'éditeur dans le footer et l'Impressum (« Doctopus » + forme juridique quand fixée).
- « FSP Trainer » pour : l'application, ses features (« FSP Trainer Prüfungstag »), les captures, les boutons qui ouvrent l'app.
- Formule canonique DE : *FSP Trainer — von Doctopus.* / *Doctopus entwickelt den FSP Trainer.*
- Jamais « Doctopus Trainer », « FSP-Trainer » avec trait d'union, « Fsp Trainer ». En DE : « der FSP Trainer ».
- Le wordmark reste « Doctopus » ; « FSP Trainer » est un titre produit en Bricolage, pas un second logo.

## 1. Le nom

**Doctopus** = marque (décidé §0) ; **FSP Trainer** = produit. Points à cadrer :

- **Orthographe** : « Doctopus » (D majuscule, un seul mot). Jamais « DocTopus », « Doc Topus », « DOCTOPUS » hors wordmark.
- **Genre / article** : FR « Doctopus » sans article (« Doctopus prépare… ») ; DE « Doctopus » sans article également ; éviter « der/die/das Doctopus ».
- **Risque de confusion** : « Doctopus » évoque la pieuvre (mascotte) et « doc » ; il ne dit pas « examen » — la tagline doit le faire. Ne jamais expliquer le jeu de mots.
- **Nom des produits internes** : Prüfungstag, Bereitschaftsindex, Prüfungsakademie, Doctopus Credits — noms propres allemands, non traduits (voir `voice.md` §5).

## 2. Domaine — options (mémoire ; décision §0 : `doctopus.co`)

| Option | Exemple | Pour | Contre |
|---|---|---|---|
| A · `.de` | `doctopus.de` | Signal Allemagne, SEO local, confiance Kammer/Impressum | Impressum allemand obligatoire de toute façon ; peut sembler « allemand pour allemands » à un public francophone |
| B · `.com` | `doctopus.com` | Neutre, extensible (KP, EVC France), international | Moins de signal local ; probablement pris (non vérifié) |
| C · `.app` | `doctopus.app` | Cohérent produit, HTTPS forcé, souvent disponible | Dit « app », pas « référence » ; faible pour le SEO institutionnel |
| D · `.eu` | `doctopus.eu` | Hébergement EU, ambition multi-pays | Peu mémorisé ; peu de confiance grand public |
| E · descriptif | `fsp-simulator.de`, `fachsprachpruefung.app` | SEO exact-match | Pas une marque ; à réserver comme redirection, jamais comme domaine principal |

**Recommandation** : un domaine de marque court (A ou B selon disponibilité), plus une redirection descriptive (E) pour le SEO ; `app.` en sous-domaine pour l'application (`app.doctopus.<tld>`), `site` à la racine. Si A et B sont pris : C, avec réserve de A/B quand ils se libèrent.

**Vérification requise avant décision** (hors périmètre de cet agent) : disponibilité WHOIS, dépôt de marque (DPMA / EUIPO) pour « Doctopus » en classe 41 (éducation) et 42 (logiciel), collision avec des marques existantes.

## 3. Langue(s) du site — options (mémoire ; décision §0 : DE seul en V1)

**Le fait qui tranche** : l'app est aujourd'hui en français (`app/index.html` `lang="fr"`, titres UI FR : « Cas cliniques », « Se connecter »). Un site allemand qui envoie vers une app française rompt la promesse dès le premier clic.

**Le public** : un médecin non germanophone natif, B2–C1, qui prépare un examen *en allemand*. Il lit l'allemand mais cherche, compare et décide plus vite dans sa langue. Ses recherches Google sont en allemand pour l'examen (« Fachsprachprüfung Vorbereitung »), mais aussi dans sa langue pour la décision (« préparation FSP Allemagne », groupes Facebook/Telegram francophones et arabophones).

| Option | Description | Pour | Contre |
|---|---|---|---|
| 1 · FR seul | Site FR, comme l'app | Cohérence totale, un seul contenu à maintenir, public initial (France, Maghreb, Afrique francophone) | Zéro SEO sur les requêtes DE ; pages légales DE obligatoires quand même ; plafonne la marque à la francophonie |
| 2 · DE seul | Site DE | SEO sur la niche cherchée, crédibilité « allemande », légal natif | Rupture avec l'app FR ; l'app doit être traduite d'abord ; freine la décision d'achat d'un B2 |
| **3 · FR principal + DE** | Site FR par défaut pour les visiteurs francophones, DE pour le reste ; pages « Ce qui tombe vraiment » et blog **en DE d'abord** (SEO), légal en DE | Cohérent avec l'app, capte le SEO DE là où il compte (preuve d'autorité, blog), route par `Accept-Language` | Deux langues à maintenir dès le départ |
| 4 · DE + EN + FR | Trilingue | Couvre arabophones/lusophones/etc. via EN | Triple maintenance avant d'avoir un client payant |

**Recommandation initiale (non retenue — la direction a choisi DE seul)** : option 3, avec cette règle : *hero, présentation, quick guide, pricing, FAQ, à propos en FR et DE ; « Ce qui tombe vraiment » et le blog en DE d'abord (FR ensuite) ; légal en DE (obligatoire) avec traduction FR informative.* EN en V2 quand l'app l'aura. Et une **proposition de contrat** vers le pipeline app : internationaliser l'UI (FR → DE, puis EN) avant l'ouverture au public germanophone — sinon l'option 3 se dégrade en option 1.

## 4. Tagline

**Validée : « Die Generalprobe. »** (FR « La répétition générale. » réservé aux versions FR futures.) — dit ce que c'est, se traduit, ne promet rien. Deuxième : « Ce qui tombe vraiment. / Was wirklich drankommt. » (pour le social et la page d'autorité).

## 5. Non vérifié

- Disponibilité des domaines A–E.
- Existence d'une marque « Doctopus » déposée (DPMA/EUIPO/INPI).
- Part réelle des candidats francophones vs autres (aucun chiffre dans `docs/market/` — le dossier n'existe pas encore ; à demander à `market-analyst`).
- Que « sans carte bancaire » est vrai pour le Free (dépend de `pricing-designer`).

## 6. Reste à trancher
1. Confirmation de `doctopus.co` après vérification WHOIS + marque.
2. Contrat i18n de l'app (DE) — proposition portée par `lead-site`.
3. Forme juridique de l'éditeur pour le footer / Impressum (compliance-site).