# ADR-0005 — Crédits hybrides — cœur illimité, IA en crédits, grand livre

**Statut** : accepté · **Date** : 2026-09-10

## Contexte

Un compteur de tokens sur toute l'offre créerait une anxiété de consommation (« je ne lance pas de simulation pour ne pas gaspiller »), contraire à la symbiose. Un solde stocké serait inauditable.

## Décision

Cas, simulations, glossaire, fiches, programme : illimités dans l'abonnement. Patient IA vocal, correction d'Arztbrief, Oberarzt IA : en Doctopus Credits (quota mensuel Pro/Premium, recharges, démo en Free). Les crédits sont un ledger (`credit_ledger`, unique (user_id, reason, ref)) ; le débit est atomique et précède l'appel IA.

## Conséquences

Marge protégée, expérience préservée ; le crédit devient la monnaie de la communauté (protocole soumis, ligue).
