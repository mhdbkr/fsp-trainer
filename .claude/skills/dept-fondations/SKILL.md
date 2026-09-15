---
name: dept-fondations
description: Standards du pôle Fondations (plateforme Supabase, sync, paiement, sécurité, ops) — contrats, RLS, idempotence, pagination, tests d'intégration. À invoquer avant toute migration, Edge Function, ou modification de sync/paiement.
---

# Fondations — standards

## Contrats d'abord (ADR-0002)
Toute API/table/protocole commence dans `docs/contracts/` (architecte). `schema.sql` est GÉNÉRÉ (`dumpSchema.mjs`). Un implémenteur ne change pas un contrat : il propose.

## Supabase (`source-driven-development`, `sparc:supabase-admin`)
- RLS sur TOUTE table ; aucune policy d'écriture client sur `subscriptions`, `credit_ledger`, `content_items`, `stripe_events`, `rate_limits`.
- Fonctions `security definer` : `set search_path = public`, `revoke execute … from public, anon, authenticated` ; le client n'appelle que des wrappers sans argument (`my_*()`). Les quals de policy tournent avec le rôle appelant.
- PostgREST plafonne à 1 000 lignes : PAGINER (content, pull, publish).
- Realtime : publication explicite + `realtime.setAuth(jwt)` avant `subscribe`.
- `db reset` efface le contenu publié : appliquer les migrations avec `psql` sur une base vivante ; republier sinon.
- Edge Functions sans JWT (invités, webhooks) : `verify_jwt = false` dans `config.toml`.

## Sync (sync-protocol.md)
Journal additif, id client, curseur `received_at` serveur, ack qui rétro-remplit, outbox avec backoff par ligne, pull paginé au démarrage. Aucune écriture utilisateur ne bloque sur le réseau.

## Paiement (`doubt-driven-development` obligatoire)
Webhook : signature vérifiée, idempotent par `event.id`, AU-MOINS-UNE-FOIS (libérer l'event si le traitement échoue), seuls les 404 Stripe ignorés. Un abonnement actif → pas de second Checkout. Crédits : débit atomique AVANT l'appel IA, idempotent par `(reason, ref)`. Sandbox uniquement ; jamais le live.

## Tests (`test-driven-development`)
Unitaires (Vitest, fake-indexeddb) + intégration contre Supabase local (`scripts/testRls.mjs`) : RLS A/B, isolation, idempotence, signatures HMAC réelles. Les secrets de CI sont factices (`.env.ci`).

## Sécurité (`security-and-hardening`, `security-review`)
Aucun secret côté client ; Zod à l'entrée de chaque fonction ; rate limit par utilisateur ; `returnUrl` validé ; colonnes serveur (`received_at`, `user_id`) posées par trigger, jamais par le client.
