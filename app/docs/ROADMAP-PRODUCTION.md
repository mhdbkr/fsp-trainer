# Feuille de route — mise en production

> Réponse à FB-I3. Distincte du développement produit : ici on ne parle plus de
> ce que l'app fait, mais de ce qu'il faut trancher pour qu'elle soit publiée,
> tenue dans la durée, et éventuellement vendue.
>
> **Ce document ne décide rien.** Il pose les questions dans l'ordre où elles
> se bloquent les unes les autres, et signale celles qui ne peuvent pas être
> déléguées.

---

## 0. Où on en est

| | État |
|---|---|
| Application | React + TypeScript + Vite, **100 % locale** (IndexedDB/Dexie) |
| Contenu | 52 cas cliniques, 2 266 Fachbegriffe, 16 Aufklärungen, guides |
| Déploiement | GitHub Pages, automatique à chaque push sur `main` |
| Dépôt | `github.com/mhdbkr/fsp-trainer` — **public** |
| Comptes / serveur | aucun · aucune donnée ne quitte l'appareil |
| Qualité | 6 validateurs en CI + 5 agents de revue |

**Le tout-local est un atout majeur, pas une limite.** Aucune donnée
personnelle ne transite : pas de RGPD à gérer, pas de serveur à sécuriser, pas
de coût d'infrastructure, l'app marche hors ligne. Toute évolution qui casse
cette propriété doit être payée par un bénéfice supérieur — et il faut le
formuler explicitement avant de la coder.

---

## 1. Les trois verrous — à lever AVANT toute publication élargie

Ces trois-là bloquent tout le reste. Aucun n'est technique.

### 1.1 · L'origine du contenu — **le verrou le plus dur**

Le corpus est dérivé de `00 FSP {Freiburg,Karlsruhe,Reutlingen,Stuttgart}.md`,
soit environ 580 comptes rendus rédigés par de vrais candidats, plus
`Fachbegriffe_FSP.csv` (2 249 termes) et `anki_FSP.txt`.

Questions à trancher, dans cet ordre :

1. **D'où viennent ces fichiers ?** Rédigés par toi, collectés dans un groupe
   d'entraide, achetés, trouvés en ligne ? La réponse change tout le reste.
2. **Les cas produits sont-ils des œuvres dérivées ?** Ils sont réécrits, mais
   ancrés sur des patients réels des protocoles, avec noms, âges et dates.
3. **Les noms de patients.** Même issus de comptes rendus d'examen, ce sont des
   identités. Les cas les reprennent (« Herr Hans Hedgke, 45 J. »). À
   pseudonymiser systématiquement avant toute diffusion large — c'est peu coûteux
   et cela retire un risque entier.
4. **Les termes du glossaire** — un lexique de 2 249 entrées a probablement une
   source. Vérifier sa licence.

> **Non délégable.** Aucun agent ne peut répondre à « d'où vient ce fichier ».
> Tant que ce n'est pas tranché, la publication reste raisonnable en usage
> personnel et entre pairs, mais la **monétisation est à geler**.

### 1.2 · La visibilité du dépôt

Le dépôt est public : **tout le contenu — la valeur du produit — est lisible et
copiable par quiconque**. C'est cohérent avec un outil personnel partagé entre
candidats. Ça ne l'est pas avec un produit payant.

Trois voies, à choisir consciemment :

| Voie | Ce que ça implique |
|---|---|
| **Rester public** | Outil offert à la communauté. Réputation, pas de revenu. Simple. |
| **Passer privé** | Dépôt privé + Pages privées (ou autre hébergeur). Prérequis à toute vente. |
| **Séparer** | Code public (crédibilité, contributions), contenu privé dans un dépôt ou un paquet distinct. Le plus souple, le plus de travail. |

### 1.3 · Le cadre de responsabilité

FSP-Cockpit prépare à un examen de **langue**. Il n'est ni un dispositif
médical, ni une aide à la décision clinique. À rendre explicite avant toute
diffusion :

- **Avertissement en clair** dans l'app et sur la page d'accueil : outil
  pédagogique, contenu non destiné à guider une prise en charge réelle.
- **Aucune promesse de résultat.** Ne jamais laisser entendre une garantie de
  réussite à l'examen.
- **Mentions légales** — obligatoires en Allemagne (Impressum) dès qu'un site
  est régulièrement accessible, a fortiori s'il est payant.

---

## 2. Phase A — durcir avant d'ouvrir

Une fois les verrous levés. Objectif : que l'app tienne devant des utilisateurs
qui ne sont pas toi.

- [ ] **Pseudonymiser** tous les noms de patients du corpus (script + validateur
      qui refuse un nom réel).
- [ ] **Sauvegarde / restauration** — tout est en IndexedDB : vider le cache du
      navigateur efface des mois de travail. Export/import JSON, indispensable.
- [ ] **Migration de schéma** — aujourd'hui `SEED_VERSION` réécrit le contenu ;
      la progression (SRS, simulations) survit par convention, pas par contrat.
      Écrire des migrations versionnées et **les tester**.
- [ ] **Onboarding** — un nouvel utilisateur arrive sur une app dense. Premier
      parcours guidé, 3 écrans maximum.
- [ ] **Passe des cinq agents** sur tout le corpus, correctifs appliqués.
- [ ] **Test sur vrais appareils** — iOS Safari et Android Chrome, notamment la
      fiche du simulant en second écran (le cas d'usage le plus exposé).

## 3. Phase B — publier

- [ ] **Nom de domaine** propre — `fsp-cockpit.de` ou équivalent. Crédibilité,
      et indépendance vis-à-vis de GitHub Pages.
- [ ] **Impressum + politique de confidentialité** (courte : « aucune donnée ne
      quitte votre appareil » est un argument, pas une contrainte).
- [ ] **PWA** — installable, hors ligne complet. L'app y est presque : il manque
      un manifest et un service worker. Fort impact perçu pour peu de travail.
- [ ] **Page d'accueil publique** — à qui ça s'adresse, ce que ça fait, une
      capture qui montre une simulation en cours.
- [ ] **Boucle de retour** — un moyen de signaler un contenu faux. Sur du
      contenu médical, c'est un filet de sécurité, pas un confort.

## 4. Phase C — le modèle économique

À n'ouvrir qu'après le verrou 1.1. Options réalistes pour cette niche
(quelques milliers de candidats par an en Bade-Wurtemberg, en tension, avec un
enjeu professionnel majeur — donc une vraie disposition à payer) :

| Modèle | Pour | Contre |
|---|---|---|
| **Gratuit, réputation** | Aucun verrou juridique à lever, adoption maximale | Aucun revenu ; le temps investi n'est pas soutenable seul |
| **Freemium** — cas de base gratuits, corpus complet payant | Conversion naturelle, l'essai précède l'achat | Exige comptes + paiement → serveur, RGPD, sécurité |
| **Achat unique** (~30–60 €) | Simple, aligné sur un examen qu'on passe une fois | Pas de revenu récurrent ; mises à jour à financer |
| **Licence institutionnelle** — écoles de langue, cliniques recrutant à l'étranger | Peu de clients, panier élevé, B2B plus stable | Cycle de vente long, exige facturation et support |

**Recommandation** : achat unique ou licence institutionnelle. Le freemium
oblige à construire comptes, paiement et serveur — c'est-à-dire à sacrifier
précisément la propriété qui rend l'app simple, sûre et gratuite à exploiter.

**Conséquences techniques d'un passage au payant** (à budgéter, pas à
improviser) : authentification, paiement (Stripe), un serveur, donc RGPD réel,
sécurité, sauvegardes, et un support à assurer. Ce n'est pas une évolution de
l'app : c'est un second produit.

## 5. Phase D — tenir dans la durée

- [ ] **Rythme de mise à jour du contenu** — les protocoles évoluent chaque
      session d'examen. Qui les collecte, à quelle fréquence ?
- [ ] **Revue trimestrielle** par les cinq agents (voir `AGENTIC-TEAM.md`).
- [ ] **Métriques** — si un jour on mesure quoi que ce soit, le faire **sans
      quitter le local** (statistiques agrégées, opt-in explicite). Ne pas
      troquer la propriété la plus précieuse de l'app contre un tableau de bord.

---

## 6. Ce qui bloque quoi

```
verrou 1.1 (origine du contenu) ──▶ bloque la monétisation (phase C)
verrou 1.2 (dépôt public) ────────▶ bloque la monétisation (phase C)
verrou 1.3 (responsabilité) ──────▶ bloque la publication (phase B)
pseudonymisation (phase A) ───────▶ bloque la publication (phase B)
sauvegarde/migration (phase A) ───▶ bloque l'usage par des tiers
```

**Le chemin le plus court vers quelque chose d'utile** : lever 1.3, faire la
phase A, publier en gratuit. La monétisation demande de lever 1.1 et 1.2, ce
qui relève de décisions que toi seul peux prendre.
