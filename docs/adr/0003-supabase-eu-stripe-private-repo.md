# ADR-0003 — Supabase région EU, Stripe, dépôt privé

**Statut** : accepté · **Date** : 2026-09-11

## Contexte

Passage d'un outil local à un SaaS opéré par un fondateur seul, avec des données personnelles de candidats européens et un contenu qui est la valeur du produit.

## Décision

Backend Supabase (Postgres + Auth + RLS + Edge Functions + Realtime) en région Francfort ; paiement Stripe (Checkout, Customer Portal, webhooks) ; dépôt Git privé (code et contenu). Sandbox Stripe `acct_1UG2IORuBvu9xf7x` pour le développement ; le contexte live n'est jamais touché par les agents.

## Conséquences

Zéro serveur à administrer ; sécurité déclarative auditable (RLS) ; données en UE. Tout ce qui est secret, payant ou juridiquement sensible passe par les Edge Functions ; l'expérience reste locale et hors ligne.
