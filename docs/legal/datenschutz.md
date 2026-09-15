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
- **Hébergement du site** : présumé Vercel par le brief de handoff — à
  confirmer par `arch-site` / `lead-site` ; si confirmé, transfert de
  données hors UE (États-Unis) à documenter avec les garanties (clauses
  contractuelles types, Data Privacy Framework le cas échéant).
- **Cookies/analytics** : aucune décision produit lue n'impose un traceur ;
  recommandation de ce brouillon : **aucun cookie non essentiel au
  lancement**, pour éviter tout bandeau de consentement et simplifier la
  conformité. À confirmer par la direction (marketing autonome, ADR §7,
  pourrait vouloir des pixels publicitaires plus tard — dans ce cas un
  bandeau de consentement CMP devient nécessaire).

---

## Datenschutzerklärung

### 1. Verantwortlicher

{{RAISON_SOCIALE}}
{{ADRESSE_COMPLETE}}
{{KONTAKT_EMAIL}}

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

{{ANBIETER_NAME_UND_SITZ}} — {{"placeholder: fournisseur IA/voix non
encore choisi au moment de ce brouillon (voir note FR ci-dessus)"}}

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Erfüllung der gebuchten
Funktion). Bei Übermittlung in Drittländer (z. B. USA) werden geeignete
Garantien (Standardvertragsklauseln) eingesetzt — {{"à confirmer une fois
le fournisseur choisi"}}.

### 7. Hosting

**Plattform (Backend, Datenbank, Authentifizierung)**: Supabase, EU-Region
(Frankfurt). Die Daten werden innerhalb der Europäischen Union gespeichert
und verarbeitet.

**Website (Frontend)**: {{HOSTING_ANBIETER}} — {{"si Vercel confirmé :
Vercel Inc., siège aux États-Unis ; noter le transfert de données hors UE
et les garanties (clauses contractuelles types / Data Privacy Framework) —
à faire vérifier et compléter par un juriste dès confirmation du choix
d'hébergement"}}.

### 8. Cookies und Analyse-Tools

Wir setzen derzeit **keine nicht notwendigen Cookies** und keine
Analyse-/Tracking-Tools ein. Sollte sich dies ändern (z. B. durch
Marketing-Pixel), werden wir vorab eine Einwilligung über ein
Consent-Management-Tool einholen und diese Erklärung aktualisieren.
{{"Décision produit à confirmer par la direction — voir note FR."}}

### 9. Speicherdauer

- Kontodaten: bis zur Löschung des Kontos durch die Nutzerin/den Nutzer.
- Zahlungsbezogene Daten: gemäß gesetzlicher Aufbewahrungsfristen
  ({{AUFBEWAHRUNGSFRIST_STEUERRECHT}}, i. d. R. 10 Jahre für
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
E-Mail an {{KONTAKT_EMAIL}}.

### 11. Kontakt Datenschutz

{{DATENSCHUTZ_KONTAKT_EMAIL}} {{"si pas de DPO désigné (probable pour une
micro-entreprise), indiquer le contact général"}}
