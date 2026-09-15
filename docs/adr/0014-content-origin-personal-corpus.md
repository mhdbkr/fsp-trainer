# ADR-0014 — Origine du contenu : recueil personnel ; verrou de monétisation levé

**Statut** : accepté · **Date** : 2026-09-16

## Contexte

`ROADMAP-PRODUCTION.md` §1.1 posait l'origine du corpus (~580 comptes rendus, glossaire) comme verrou non délégable bloquant la monétisation, et le site prévoyait une liste d'attente tant qu'il n'était pas levé.

## Décision

La direction établit que le contenu est un **recueil personnel**. Le verrou est levé : le site propose un checkout réel dès la V1. La pseudonymisation des noms de patients (phase A de la roadmap) reste à faire avant diffusion élargie, par prudence, indépendamment de ce verrou.

Nommage : **Doctopus** = projet et marque ; **FSP Trainer** = produit (l'app). Site en allemand seul en V1 ; domaine pressenti `doctopus.co` (à confirmer) ; tagline « Die Generalprobe. » ; analytics UE sans cookie.

## Conséquences

Pipeline `site` (#8) : option checkout, pas de waitlist. `ROADMAP-PRODUCTION.md` §1.1 à mettre à jour à la fin de la vague V1.
