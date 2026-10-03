# Pont IA externe — faits établis à la source (C3, série 3)

> `lead-s3-ia`, 30 sept. 2026, relevés entre 21:30 et 22:45 UTC.
> Cibles retenues par la direction : **ChatGPT** et **Gemini**, seulement.
> Règle : un fait sans source reste **non établi**, et le code le traite comme
> `null`. Aucune ligne de code de C3 n'a été écrite avant ce document.

Légende : **ÉTABLI** (source primaire ou officielle citée) · **INDIRECT** (source
secondaire concordante, pas l'éditeur) · **NON ÉTABLI** (on ne sait pas).

---

## 1. Pré-remplissage web par paramètre d'URL

### ChatGPT — `https://chatgpt.com/?q=…`

| Fait | Statut | Source |
|---|---|---|
| Le paramètre `q` sur la racine est une **forme de lien reconnue par OpenAI** | **ÉTABLI** | Fichier d'association iOS servi par OpenAI, `https://chatgpt.com/.well-known/apple-app-site-association` (relevé 2026-09-30, sha256 `7f55dcdf…a1e`) : composant `{"/": "/", "?": {"q": "?*"}}`, commentaire « Matches query links if they have a value for the q parameter ». Même règle pour `prompt`. |
| Le texte de `q` est **placé dans le champ de saisie** | **INDIRECT** | Tenable, TRA-2025-22 (15 juil. 2025) : « automatically inserted into the chat input and submitted ». Forum OpenAI, fil 1027747 (nov. 2024 → 2026) : pré-remplit, envoi non constant. Aucune page de documentation OpenAI ne décrit ce paramètre. |
| Le texte est-il **envoyé** automatiquement ? | **NON ÉTABLI pour notre cas** | Tenable (même avis) : OpenAI a déployé en avril 2025 des « auto-submit protections based on the sec-fetch-site header ». Un lien ouvert depuis Doctopus est une navigation **inter-sites** : l'envoi automatique y est vraisemblablement bloqué, mais ce n'est écrit nulle part. |
| **Longueur maximale effective** de `q` | **NON ÉTABLI** | Aucune source de l'éditeur. Un générateur tiers (u2l.ai) *recommande* 2 000 caractères sans mesure. Tentative de mesure le 2026-09-30 : `chatgpt.com` répond 403 à `curl` et présente une page de vérification Cloudflare (« Nur einen Moment… ») à un navigateur sans tête. On ne contourne pas ce contrôle : la mesure n'a **pas** été faite. |

**Conséquence contrat (C3).** `prefillParam` est connu, `maxPrefillChars` ne
l'est pas. C3 interdit de pré-remplir sans limite connue : ChatGPT reste au
**niveau 2** (copie + ouverture), le libellé ne promet aucun pré-remplissage.
Protocole pour le passer au niveau 1 : §6.

### Gemini — `https://gemini.google.com/app`

| Fait | Statut | Source |
|---|---|---|
| Aucun paramètre de pré-remplissage natif (`q`, `prompt`) | **INDIRECT** | Hacker News, item 46761567 (≈ janv. 2026) : « gemini.google.com still doesn't support query parameters like q= or prompt= », sans démenti de Google. prefillprompt (GitHub ThatGuySam) : « Gemini does not publish a dependable third-party prompt-link contract ». Les extensions Chrome qui l'ajoutent injectent le texte elles-mêmes. |
| Aucun paramètre de texte dans les liens universels | **ÉTABLI** | `https://gemini.google.com/.well-known/apple-app-site-association` (relevé 2026-09-30, sha256 `f6514c72…27e`) : seuls `/app/*` avec `target=agent|spark`, `/app?target=daily_brief`, `/import-chats`, pages de téléchargement. Aucune clé de texte. |

**Conséquence.** `prefillParam: null`. Niveau 2 uniquement.

---

## 2. Ouvrir l'application native (iOS, Android)

### iOS — liens universels (fichiers servis par les éditeurs, relevés le 2026-09-30)

| Cible | URL qui **ouvre l'app** si elle est installée | Texte initial accepté ? |
|---|---|---|
| ChatGPT (`2DC432GLL2.com.openai.chat`) | `https://chatgpt.com/#native` — commentaire OpenAI : « Matches ChatGPT home. This will start a new conversation in-app. » Aussi `/?q=…`, `/?prompt=…`, `/voice` (« Enters voice mode directly on the app »). La racine nue `https://chatgpt.com/` **n'est pas** un lien universel : elle reste dans le navigateur. | `q` est routé vers l'app (**ÉTABLI**) ; que l'app le place dans le champ n'est **PAS ÉTABLI** (non documenté, non observé). |
| Gemini (`EQHXZ8M8AV.com.google.gemini`) | **Aucune** URL de conversation. `https://gemini.google.com/app` nu **n'est pas** listé : il s'ouvre dans le navigateur. | Non. |

Réserve iOS, **NON ÉTABLIE** : un lien universel ouvert par `window.open` depuis
une page web (et non par un tap sur `<a>`) n'est pas garanti d'ouvrir l'app ;
Apple ne documente que le tap utilisateur. Le lanceur ouvre donc par un vrai
lien `<a href target="_blank">` activé par le doigt.

Aucun **schéma d'URL propriétaire** (`chatgpt://`, `googlegemini://`) n'est
documenté par l'un ou l'autre éditeur : **NON ÉTABLI**, non utilisé.

### Android — App Links

| Cible | Fait | Statut |
|---|---|---|
| ChatGPT | `https://chatgpt.com/.well-known/assetlinks.json` délègue `handle_all_urls` à `com.openai.chatgpt`. | **ÉTABLI** (l'app est autorisée) |
| Gemini | `https://gemini.google.com/.well-known/assetlinks.json` délègue `handle_all_urls` à `com.google.android.apps.bard` et à l'app Google. | **ÉTABLI** (l'app est autorisée) |
| Quels chemins chaque app intercepte, et si elle lit un texte initial | Décidé par le manifeste de l'app, non publié. | **NON ÉTABLI** |

---

## 3. Collage d'un texte long

| Cible | Comportement | Statut | Source |
|---|---|---|---|
| ChatGPT | Au-delà de **10 000 caractères**, le collage devient une **pièce jointe** au lieu d'aller dans le champ (bouton « Show in text field » pour revenir). Tous les plans depuis le 22 juin 2026 ; 5 000 caractères pour Plus/Pro/Business depuis le 25 mars 2026, relevé à 10 000. | **ÉTABLI** (notes de version OpenAI) | Notes de version ChatGPT, entrées du 25 mars et du 22 juin 2026 : « If you paste more than 10k characters into the composer, ChatGPT will automatically convert the content into an attachment ». `help.openai.com` répond 403 aux outils ; texte lu sur le miroir reconn-ai.com, qui cite la page officielle. |
| Gemini | Seuil de conversion ou troncature | **NON ÉTABLI** | Aucune source Google trouvée. |

**Conséquence de conception.** Le prompt collé en un seul message doit rester
**sous 10 000 caractères** pour arriver dans le champ de ChatGPT, et non en
pièce jointe. C'est plus strict que la borne O3 du contrat (12 000) ; on vise
10 000 pour les deux modes. Le prompt actuel (médiane 31 906) est toujours
converti en pièce jointe.

---

## 4. Marques et logos

### OpenAI (ChatGPT) — autorisé sous conditions

Page de marque OpenAI, `https://openai.com/brand/` (403 aux outils ; lue dans la
Wayback Machine, capture du 21 sept. 2026) :
- « By using our logos, you agree to our Marks usage terms » ; logos
  téléchargeables sur la page.
- Conditions : ne pas altérer ni recolorer le Blossom ; « Do not feature our
  Marks more prominently than your own company's name or marks » ; ne pas
  suggérer de partenariat.
- Les demandes d'autorisation de logo passent par `partnercomms@openai.com`.

Statut : **usage conditionnel autorisé par les conditions publiées**, mais la
même page renvoie les demandes de logo à une adresse de contact. Lecture
prudente : autorisé en monochrome, inchangé, plus petit que la marque Doctopus.

### Google (Gemini) — non autorisé sans demande

`about.google/brand-resource-center/brand-elements/`, section « Product icons »
(relevé 2026-09-30) : « To use a Google product icon in your work, create a
Partner Marketing Hub account […] and request permission through our approval
form. » La page `guidance/` range « Product icons » sous **Ask first** ; l'usage
libre (« Go for it ») couvre le **nom en texte simple** dans un contexte
informatif.

Statut : icône Gemini **NON AUTORISÉE** sans demande. Seule la direction peut
la faire.

### Décision appliquée

**Noms seuls, pour les deux cibles.** Afficher le logo de ChatGPT à côté du
simple mot « Gemini » ferait paraître l'un plus officiel que l'autre et
avantagerait une marque tierce dans notre interface. `icons.tsx` ne reçoit
aucun glyphe de marque. Si la direction obtient l'accord de Google, les deux
logos entrent ensemble (tâche d'une heure : deux glyphes pleins, sans autre
changement du lanceur).

---

## 5. Ce que le code en tire

| Cible | `prefillParam` | `maxPrefillChars` | URL ouverte | Barreau atteint |
|---|---|---|---|---|
| ChatGPT | `null` (paramètre connu, limite inconnue ⇒ C3 ; `autoSubmits: true` par prudence) | `null` | `https://chatgpt.com/#native` (ouvre l'app iOS, conversation neuve ; page d'accueil ailleurs) | 2 — copie + ouverture + confirmation visible |
| Gemini | `null` | `null` | `https://gemini.google.com/app` | 2 — copie + ouverture + confirmation visible |

Le commentaire « Vérifié 2026-09-17 » de `targets.ts` disparaît (C4). Chaque
enregistrement porte `verifiedAt: '2026-09-30'` et `evidence` pointant vers ce
document ; il expire le 29 déc. 2026 (C2).

---

## 6. Ce qu'il reste à mesurer — 5 minutes, par la direction

Le seul barreau qui manque pour « l'app s'ouvre avec le prompt déjà en place »
sur ChatGPT est **une mesure de longueur**, faisable seulement dans un vrai
navigateur connecté (Cloudflare bloque les outils automatiques) :

1. Dans Doctopus, copier le prompt du cas le plus long (`maxPromptCase` dans le
   rapport).
2. Ouvrir `https://chatgpt.com/?q=` suivi du texte encodé (sur ordinateur, puis
   sur iPhone avec l'app installée).
3. Noter : le champ contient-il **tout** le texte ?
4. Noter : le message **part-il seul** ? Attendre 5 secondes sans toucher à
   rien. S'il part, l'IA parle avant que le candidat ait salué : le niveau 1
   reste exclu.

Il faut **les deux** relevés pour passer au niveau 1 : texte entier ET aucun
envoi automatique, sur ordinateur et sur iPhone. Renseigner alors
`prefillParam: 'q'`, `maxPrefillChars` = longueur encodée testée,
`autoSubmits: false`, `evidence` = date + appareils. Tant que `autoSubmits`
reste à `true` (valeur livrée, par prudence), `capabilityProblems` refuse le
niveau 1 même si la limite est renseignée. Le libellé passe ensuite de
lui-même au niveau 1 (fonction pure, testée).

## Sources

- Fichiers d'association lus le 2026-09-30 : `chatgpt.com/.well-known/apple-app-site-association`, `chatgpt.com/.well-known/assetlinks.json`, `gemini.google.com/.well-known/apple-app-site-association`, `gemini.google.com/.well-known/assetlinks.json`
- Tenable, avis de recherche TRA-2025-22, 15 juil. 2025 — https://www.tenable.com/security/research/tra-2025-22
- Forum développeurs OpenAI, « Query parameters in chatgpt » — https://community.openai.com/t/query-parameters-in-chatgpt/1027747
- Hacker News 46761567 — https://news.ycombinator.com/item?id=46761567
- prefillprompt — https://github.com/ThatGuySam/prefillprompt
- Notes de version ChatGPT (miroirs du 25 mars et du 22 juin 2026) — https://reconn-ai.com/chatgpt-march-25-2026-large-pastes-are-now-handled-as-attachments · https://reconn-ai.com/chatgpt-june-22-2026-large-pastes-are-now-handled-as-attachments-for-more-plans (source : https://help.openai.com/en/articles/6825453-chatgpt-release-notes)
- OpenAI, page de marque (capture du 21 sept. 2026) — https://web.archive.org/web/20260921094430/https://openai.com/brand/
- Google Brand Resource Center — https://about.google/brand-resource-center/brand-elements/ · https://about.google/brand-resource-center/guidance/
