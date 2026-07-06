# Mettre FSP-Cockpit en ligne (GitHub Pages)

Objectif : héberger l'app gratuitement pour que la **fiche du simulant s'ouvre sur n'importe quel téléphone** via le QR code, sans serveur local ni même Wi-Fi.

Tout est déjà préparé côté code :
- ✅ Workflow de déploiement automatique : `.github/workflows/deploy.yml`
- ✅ App compatible sous-chemin (hash routing + `base: './'`), QR corrigé pour l'URL en ligne
- ✅ `.gitignore` qui **exclut les sources privées/sous copyright** (livre PDF, protocoles, deck Anki) d'un dépôt public

## Étapes manuelles (une seule fois, ~5 min)

1. **Crée un dépôt GitHub** (par ex. `fsp-cockpit`).
   - Public = Pages gratuit. (Les fichiers privés sont déjà ignorés par `.gitignore`.)

2. **Pousse le projet** depuis ce dossier :
   ```bash
   cd "/Users/MehdiBoukari/Downloads/FSP VB/Claude FSP"
   git init
   git add .
   git commit -m "FSP-Cockpit"
   git branch -M main
   git remote add origin https://github.com/<TON_USER>/fsp-cockpit.git
   git push -u origin main
   ```

3. **Active GitHub Pages** : dépôt → **Settings → Pages → Source : “GitHub Actions”**.

4. C'est tout. À chaque `git push`, le workflow build l'app et la publie. L'URL apparaît dans l'onglet **Actions** (ex. `https://<ton_user>.github.io/fsp-cockpit/`).

## Ensuite
- Ouvre l'app à cette URL. Le **QR de la fiche simulant** pointera automatiquement vers la version en ligne → scannable depuis n'importe quel téléphone.
- Les données restent 100 % locales sur chaque appareil (IndexedDB) ; rien n'est envoyé sur le web.

> Besoin d'un dépôt privé ? GitHub Pages sur dépôt privé nécessite un compte **GitHub Pro**. Sinon, garde le dépôt public : les sources sensibles sont déjà exclues par `.gitignore`.
