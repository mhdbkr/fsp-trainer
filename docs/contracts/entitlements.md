# Matrice d'entitlements — source de vérité : table `entitlements` (`app/supabase/seed.sql`)

| Feature | Free | Pro | Premium | Sens de `limit_value` |
|---|---|---|---|---|
| `content.tier` | 1 | 2 | 3 | tier maximal lisible (RLS `content_items`) |
| `sim.online` | — | ∞ | ∞ | binôme en ligne |
| `league` | — | ∞ | ∞ | ligue |
| `ai.arztbrief` | — | ∞ | ∞ | accès à la feature (coût en crédits) |
| `ai.voice` | — | — | ∞ | accès (coût en crédits) |
| `credits.monthly` | 0 | 200 | 1000 | grant à chaque `invoice.paid` (`plans.monthly_credits`) |

**Règles**
- `null` = illimité ; absence = pas le droit ; `has(f)` ⇔ `limit(f) === null || limit(f) > 0`.
- Plan effectif — `effective_plan(uid)` : `active`/`trialing` → plan ; `past_due` → plan pendant **7 jours** ; `canceled` → plan **jusqu'à `current_period_end`** ; sinon `free`. Pas de ligne `subscriptions` = `free`.
- **Côté client** : uniquement les RPC sans argument `my_plan()`, `my_tier()`, `my_credits()` (agissent sur `auth.uid()`). Les fonctions paramétrées `effective_plan(uuid)`, `tier_of(uuid)`, `credit_balance(uuid)` sont **révoquées** pour anon/authenticated — réservées au service role et aux policies.
- Aucun `plan === 'pro'` dans le code : `useEntitlements().has(feature)` / `limit(feature)` seulement.

**Tiers de contenu** (attribués par `app/scripts/publishContent.mjs`)
- Cas : `tier` dans `seedCases.ts`, défaut 2 ; 12 cas Free (un par spécialité majeure).
- Fiche Fachwissen / Aufklärung / Muster : tier minimal des cas qui les référencent (échantillon **complet** pour le Free).
- Fachbegriffe : Free = spécialité `Allgemein` (1 204 termes) ; termes de spécialité = Pro.
- Guides : Free.
