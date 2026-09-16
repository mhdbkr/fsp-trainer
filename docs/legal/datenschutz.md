---
title: Datenschutzerklärung
slug: datenschutz
validated_by: ""
validated_at: ""
placeholders: ["LEGAL_NAME", "LEGAL_ADDRESS_STREET", "LEGAL_ADDRESS_CITY", "LEGAL_EMAIL", "LEGAL_PRIVACY_EMAIL", "ANALYTICS_PROVIDER", "LEGAL_AI_PROVIDER_NAME_AND_SEAT", "LEGAL_TAX_RETENTION_PERIOD"]
---
> **ENTWURF — Von einem Juristen zu prüfen, nicht veröffentlichen.**
> Datum: 2026-09-16 · Autor: compliance-checker (pôle Fondations) · Statut : brouillon non validé.

---

**FR — note pour la direction**

Traitements identifiés (source : `docs/contracts/schema.sql`, ADR-0003,
ADR-0005, ADR-0011, `app/docs/PRODUCT-VISION.md` §4–5) :

- **Compte** : e-mail, mot de passe (Supabase Auth), `display_name`.
- **Profil de procédure** (`profiles`) : pays d'examen visé (`target_land`),
  date d'examen, niveau de langue, étape de procédure, spécialité d'origine,
  pays du diplôme, intention KP — données sensibles au sens large (liées à
  un parcours de reconnaissance professionnelle et de santé, pas des données
  de santé au sens de l'art. 9 RGPD mais à traiter avec prudence).
- **Progression** (`progress_events`, `credit_ledger`) : simulations
  terminées, révisions SRS, plans, paliers de cas atteints, crédits
  consommés/attribués (raison, référence).
- **Paiement** : Stripe (Checkout, Customer Portal, webhooks) — Doctopus ne
  stocke pas les données de carte, Stripe agit comme sous-traitant.
- **IA / voix** : consommation de crédits pour Arztbrief (correction IA) et
  patient IA vocal — implique un ou plusieurs sous-traitants IA/voix. **Le
  fournisseur exact n'est pas encore arrêté dans les contrats lus**
  (ADR-0011 mentionne une démo statique pré-générée sans LLM en temps réel
  pour l'instant ; le chantier #13 patient IA vocal temps réel n'est pas
  livré). Placeholder à compléter dès que le fournisseur est choisi.
- **Hébergement du site** : **Vercel, confirmé par la direction le
  2026-09-16** (root `apps/site`, previews en `noindex`). Transfert de
  données hors UE (Vercel Inc., États-Unis) à documenter avec les garanties
  (clauses contractuelles types / Data Privacy Framework) — reste à faire
  valider par un juriste, mais le choix du fournisseur n'est plus ouvert.
- **Analytics** : décision direction — Plausible ou Umami, **hébergé UE,
  sans cookie, sans donnée personnelle**. Fournisseur exact en placeholder
  `{{ANALYTICS_PROVIDER}}` (le nom définitif entre Plausible et Umami n'est
  pas encore arrêté). Pas de bandeau de consentement nécessaire tant que
  l'outil ne dépose aucun cookie et ne traite aucune donnée à caractère
  personnel — **à faire confirmer par un juriste** sur la base de la
  configuration réellement déployée (ce brouillon ne peut pas vérifier la
  configuration technique).
- **Cookies** : recommandation maintenue — **aucun cookie non essentiel au
  lancement**. Si le marketing autonome (ADR §7 de `PRODUCT-VISION.md`)
  introduit des pixels publicitaires plus tard, un bandeau de consentement
  CMP redevient nécessaire et cette section devra être réécrite.

---

## Datenschutzerklärung

### 1. Verantwortlicher

{{LEGAL_NAME}}
{{LEGAL_ADDRESS_STREET}}, {{LEGAL_ADDRESS_CITY}}
{{LEGAL_EMAIL}}

(siehe Impressum für vollständige Angaben)

### 2. Übersicht der Verarbeitungen

Wir verarbeiten personenbezogene Daten, wenn Sie unsere Website besuchen,
ein Konto anlegen, unsere Lernplattform nutzen oder ein Abonnement
abschließen.

### 3. Kontodaten

Bei der Registrierung erheben wir E-Mail-Adresse, Passwort (verschlüsselt
gespeichert) und optional einen Anzeigenamen. Rechtsgrundlage: Art. 6 Abs.
1 lit. b DSGVO (Vertragserfüllung).

### 4. Profil- und Fortschrittsdaten

Zur Personalisierung Ihres Lernprogramms erheben wir: Zielland der
Prüfung, Prüfungsdatum, Sprachniveau, Stand des Anerkennungsverfahrens,
Herkunftsfachrichtung, Herkunftsland des Diploms sowie — falls angegeben —
Ihre Absicht bezüglich der Kenntnisprüfung. Wir speichern zudem Ihren
Lernfortschritt (abgeschlossene Simulationen, Wiederholungen, erreichte
Fallstufen) und Ihr Guthaben an Doctopus Credits. Rechtsgrundlage: Art. 6
Abs. 1 lit. b DSGVO (Vertragserfüllung); für aggregierte, aufbereitete
Auswertungen ("was in der Prüfung wirklich drankommt") ggf. Art. 6 Abs. 1
lit. a DSGVO (Einwilligung) — {{"à confirmer selon si l'agrégation est
anonymisée ou seulement pseudonymisée"}}.

### 5. Zahlungsdaten

Zahlungen werden über unseren Zahlungsdienstleister Stripe, Inc. / Stripe
Payments Europe, Ltd. abgewickelt. Wir selbst speichern keine
Kreditkartendaten. Es gelten die Datenschutzbestimmungen von Stripe:
https://stripe.com/de/privacy. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.

### 6. KI-gestützte Funktionen (Arztbrief-Korrektur, KI-Patient)

Für bestimmte Funktionen (Korrektur des Arztbriefs durch KI, gesprächsbasierter
KI-Patient) werden Ihre Eingaben an einen KI-Dienstleister übermittelt.

{{LEGAL_AI_PROVIDER_NAME_AND_SEAT}} — {{"placeholder: fournisseur IA/voix
non encore choisi au moment de ce brouillon (voir note FR ci-dessus)"}}

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Erfüllung der gebuchten
Funktion). Bei Übermittlung in Drittländer (z. B. USA) werden geeignete
Garantien (Standardvertragsklauseln) eingesetzt — {{"à confirmer une fois
le fournisseur choisi"}}.

### 7. Hosting

**Plattform (Backend, Datenbank, Authentifizierung)**: Supabase, EU-Region
(Frankfurt). Die Daten werden innerhalb der Europäischen Union gespeichert
und verarbeitet.

**Website (Frontend)**: Vercel Inc., mit Sitz in den USA. Die
Auslieferung der Website (nicht der Nutzerdaten aus der Anwendung, die bei
Supabase in der EU verbleiben) kann eine Übermittlung technischer Daten
(z. B. IP-Adresse, Server-Logs) in die USA einschließen. Es gelten
geeignete Garantien (Standardvertragsklauseln / Data Privacy Framework,
sofern anwendbar) — {{"formulation exacte et référence au mécanisme de
transfert retenu à compléter et faire valider par un juriste"}}. Vorschau-
Umgebungen (Preview-Deployments) sind per `noindex` von der Indexierung
durch Suchmaschinen ausgeschlossen.

### 8. Analyse-Tools und Cookies

Wir setzen ein datenschutzfreundliches, in der EU gehostetes Analyse-Tool
ein ({{ANALYTICS_PROVIDER}} — Plausible oder Umami, endgültige Wahl noch
offen), das **ohne Cookies** arbeitet und **keine personenbezogenen Daten**
verarbeitet (keine IP-Speicherung, keine Wiedererkennung einzelner
Nutzer:innen über Sitzungen hinweg). Rechtsgrundlage, sofern personenbezogene
Daten überhaupt betroffen sind: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
Interesse an anonymer Reichweitenmessung) — {{"à confirmer par un juriste
sur la base de la configuration technique réellement déployée ; si l'outil
s'avère traiter des données personnelles, un bandeau de consentement
devient nécessaire"}}.

Darüber hinaus setzen wir **keine nicht notwendigen Cookies** und keine
Tracking-Tools ein. Sollte sich dies ändern (z. B. durch Marketing-Pixel,
`PRODUCT-VISION.md` §7), werden wir vorab eine Einwilligung über ein
Consent-Management-Tool einholen und diese Erklärung aktualisieren.

### 9. Speicherdauer

- Kontodaten: bis zur Löschung des Kontos durch die Nutzerin/den Nutzer.
- Zahlungsbezogene Daten: gemäß gesetzlicher Aufbewahrungsfristen
  ({{LEGAL_TAX_RETENTION_PERIOD}}, i. d. R. 10 Jahre für
  steuerrelevante Unterlagen — je nach anwendbarem Recht FR/DE).
- Fortschritts- und Profildaten: bis zur Löschung des Kontos oder auf
  Widerspruch, soweit keine gesetzliche Pflicht zur längeren Speicherung
  besteht.

### 10. Ihre Rechte

Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) sowie das Recht,
eine erteilte Einwilligung jederzeit zu widerrufen. Sie können sich zudem
bei einer Datenschutzaufsichtsbehörde beschweren.

**Ausübung Ihrer Rechte in der Anwendung**: {{"lien vers export/suppression
de compte dans les paramètres — à confirmer branché, voir
docs/legal/README.md, case « export/suppression »"}}. Andernfalls per
E-Mail an {{LEGAL_EMAIL}}.

### 11. Kontakt Datenschutz

{{LEGAL_PRIVACY_EMAIL}} {{"si pas de DPO désigné (probable pour une
micro-entreprise), indiquer le contact général"}}
