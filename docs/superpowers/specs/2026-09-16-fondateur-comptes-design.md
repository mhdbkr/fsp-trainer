# Version fondateur — comptes immédiats et switch sans login

Date : 2026-09-16 · Statut : validé par la direction (chat), à planifier
Décision de cadrage : ADR-0015 (deux trajectoires, `main` = app personnelle, `saas` = production en pause)

## 1. Intention

Mehdi prépare la FSP avec un partenaire et veut une app **parfaite pour 2 à
quelques personnes**, accessible depuis n'importe quel appareil, où **chaque
personne a ses propres données** (cas parcourus, SRS, simulations, performance,
programme adaptatif) — aucune donnée d'avancement globale. Les features
ajoutées ici remontent ensuite dans la version commerciale : on construit
**sur `main` d'aujourd'hui** (Fondations SaaS incluses), pas sur l'ancien état.

Ce socle est le prérequis des chantiers suivants (Fachbegriffe rafraîchi :
favoris, decks et SRS sont par personne).

## 2. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| D1 | Supabase reste le dos de l'app personnelle | la sync multi-appareils, l'isolation RLS et le contenu par tier existent et sont prouvés ; un Gist GitHub réinventerait tout en jetable |
| D2 | Un compte = une personne réelle Supabase ; **création immédiate** e-mail + mot de passe, **sans lien magique ni confirmation d'e-mail** | le lien magique allonge l'expérience ; la confirmation d'e-mail se désactive dans Supabase Auth |
| D3 | Plusieurs comptes par appareil, **switch sans re-login** via un registre local de sessions | 2 personnes partagent souvent un ordinateur ; ressaisir un mot de passe à chaque bascule casse l'usage |
| D4 | **Une base Dexie par compte** (`fsp-cockpit-<userId>`) | isolation totale sans filtrer chaque requête ; contenu (~1 Mo) re-synchronisé par compte, coût négligeable |
| D5 | Basculer = restaurer la session puis **recharger la page** | tous les stores (Zustand, Dexie singleton, sync) repartent propres ; zéro fuite d'état entre comptes |
| D6 | Accès complet via un abonnement `premium` actif posé par script (sans Stripe) | aucun paywall pour les fondateurs ; les entitlements ne changent pas |
| D7 | Mode `VITE_AUTH_MODE=founder` \| `public` | la production garde lien magique + Google ; ici seul le mot de passe est visible |
| D8 | `main` déployé sur GitHub Pages avec les variables Supabase | aujourd'hui le build Pages n'a pas les variables → page vide |

## 3. Architecture

### 3.1 Modules

| Module | Rôle | Fichiers |
|---|---|---|
| `lib/auth/accounts.ts` (nouveau) | registre local des comptes connus sur l'appareil ; compte actif ; bascule | `localStorage['fsp.accounts']`, `localStorage['fsp.activeUserId']` |
| `lib/auth/session.ts` (étendu) | `signUpWithPassword`, `signInWithPassword` ; capture des jetons rafraîchis vers le registre ; `signOut` ne purge plus la base | — |
| `db/db.ts` (modifié) | nom de base résolu au chargement du module depuis `fsp.activeUserId` | `fsp-cockpit-<userId>` ; `fsp-cockpit` si aucun compte (anonyme) |
| `features/auth/FounderGate.tsx` (nouveau) | écran unique première ouverture : créer / se connecter | — |
| `components/AccountSwitcher.tsx` (nouveau) | chip barre + avatar dock : basculer · ajouter · se déconnecter · oublier sur cet appareil | reprend le pattern de l'ancien `ProfileSwitcher` (6fa1163^) |
| Pré-simulation, carte « Le médecin » | sélecteur de compte (qui s'entraîne) | bascule = D5 |
| `scripts/grantFounder.mjs` (nouveau) | `node scripts/grantFounder.mjs <email>` → `subscriptions(plan_id='premium', status='active')` avec la clé service | jamais en CI |
| `.github/workflows/deploy.yml` | `env: VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` depuis les secrets ; Node 22 | — |

### 3.2 Registre local

```ts
interface KnownAccount {
  userId: string; email: string; displayName: string; color: string;
  refreshToken: string | null;   // dernier jeton valide connu ; null = expiré
  lastActiveAt: number;
}
```

- À chaque `TOKEN_REFRESHED` / `SIGNED_IN`, le jeton du compte courant est
  réécrit dans le registre (rotation Supabase : seul le dernier est valide, et
  un jeton non utilisé reste valide).
- Basculer vers B : `supabase.auth.setSession({ refresh_token })`. Succès →
  `fsp.activeUserId = B` → `location.reload()`. Échec (jeton révoqué/expiré)
  → `refreshToken = null` → invite « mot de passe de B » (un champ), jamais
  d'e-mail.
- « Se déconnecter » : `signOut({ scope: 'local' })`, le compte reste dans le
  registre avec `refreshToken = null`, sa base locale est conservée.
- « Oublier ce compte sur cet appareil » : retrait du registre + `Dexie.delete('fsp-cockpit-<id>')`. Les données restent sur le serveur.

### 3.3 Flux première ouverture (mode `founder`)

1. Aucun compte dans le registre → `FounderGate` plein écran : **Créer mon
   compte** (prénom, e-mail, mot de passe ≥ 8) ; lien « J'ai déjà un compte ».
2. `signUp` → session immédiate → `profiles.display_name = prénom` → compte
   ajouté au registre, actif → reload → app chargée, sync du contenu.
3. Registre non vide mais aucun compte actif (après déconnexion) → même écran
   avec la liste des comptes connus en tête.

En mode `public`, rien ne change par rapport à aujourd'hui (l'anonyme reste un
état normal).

### 3.4 Isolation

- Base par compte (D4). Les tables de contenu y sont resynchronisées par la
  sync existante (`sync({ full: true })` au premier chargement).
- `clearLocalProgress` disparaît de la déconnexion (il n'a plus de raison
  d'être : la base est celle du compte). Il reste disponible pour « Oublier ».
- Aucune vue, stat ou programme ne lit hors de la base active. La ligue et
  toute agrégation inter-comptes sont hors périmètre.

## 4. Réglages hors code (une fois, dashboard Supabase, projet EU)

- Auth → Providers → Email : **Confirm email = off** ; Password minimum 8.
- Auth → Rate limits : laisser par défaut.
- GitHub → Settings → Secrets : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## 5. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | Première ouverture en mode `founder` : créer un compte → app utilisable en < 10 s, sans e-mail reçu | navigateur (playwright) |
| AC-2 | Deux comptes créés sur un appareil : basculer A→B→A sans saisir de mot de passe ; chaque bascule < 3 s | navigateur |
| AC-3 | Une simulation faite par A n'apparaît ni dans l'historique, ni les stats, ni le programme de B ; le SRS d'un terme révisé par A est neuf chez B | navigateur + test Dexie (noms de bases distincts) |
| AC-4 | Compte A ouvert sur un 2ᵉ appareil avec e-mail + mot de passe : ses simulations et son programme sont là après la sync | navigateur, 2 contextes |
| AC-5 | Jeton de B révoqué côté serveur → la bascule demande le mot de passe de B, un champ, et réussit | test unitaire (setSession rejeté) + navigateur |
| AC-6 | « Oublier ce compte » supprime la base locale de ce compte seulement ; les autres bases sont intactes | test Dexie |
| AC-7 | `grantFounder.mjs <email>` → `my_plan()` renvoie `premium` pour ce compte ; le contenu Pro se charge | script + RLS test |
| AC-8 | Mode `public` : aucun changement de comportement (tests existants verts) | vitest, testRls |
| AC-9 | GitHub Pages `main` : page d'accueil rendue (plus de page vide) | URL publique |
| AC-10 | Basculer ne laisse aucune ligne `outbox` ou `progress_events` de A dans la base de B | test Dexie |

## 6. Tests

- Unitaires (vitest, jsdom, fake-indexeddb) : `accounts.ts` (ajout, bascule,
  rotation de jeton, oubli), résolution du nom de base, `FounderGate` (états).
- Intégration : `testRls.mjs` inchangé + cas `grantFounder`.
- Navigateur : `playwright-cli` headless, scénario AC-1 → AC-3 → AC-5 → AC-6,
  mesures depuis le DOM de l'app.

## 7. Hors périmètre

Gist GitHub, ligue, crédits, Stripe, lien magique en mode `founder`,
réinitialisation de mot de passe par e-mail (Supabase la fournit ; UI plus tard).

## 8. Risques

| Risque | Parade |
|---|---|
| Rotation des jetons : un jeton stocké devient invalide si le même compte est utilisé ailleurs entre-temps | AC-5 : repli mot de passe en un champ |
| Contenu re-synchronisé par compte à chaque nouvel appareil (~1 Mo) | acceptable ; delta ensuite |
| `db` est un singleton de module : le nom doit être connu avant tout import | résolu depuis `localStorage` en tête de `db.ts` ; bascule = reload (D5) |
| Mot de passe faible sur un compte partagé | minimum 8, pas de politique de plus pour les fondateurs |
