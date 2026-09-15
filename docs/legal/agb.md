> **ENTWURF — Von einem Juristen zu prüfen, nicht veröffentlichen.**
> Datum: 2026-09-16 · Autor: compliance-checker (pôle Fondations) · Statut : brouillon non validé.

---

**FR — note pour la direction**

Structure retenue (source : `app/docs/PRODUCT-VISION.md` §4, ADR-0005,
ADR-0006) : trois plans Free / Pro / Premium ; cœur pédagogique illimité
dans l'abonnement ; Doctopus Credits pour les fonctions coûteuses (patient
IA vocal, correction Arztbrief, Oberarzt IA) avec quota mensuel inclus et
recharges possibles ; les crédits sont aussi une monnaie communautaire
(récompense de protocole soumis, de ligue gagnée). **Les prix ne sont pas
fixés** (décision direction, non tranchée dans les contrats lus) — laissés
en placeholder. Le contenu numérique + les crédits soulèvent une question
de renonciation au droit de rétractation (voir `widerruf.md`) qui doit être
cohérente avec cet AGB (case à cocher de renonciation expresse au moment de
l'achat).

---

## Allgemeine Geschäftsbedingungen (AGB)

### § 1 Geltungsbereich

Diese AGB gelten für alle Verträge zwischen {{RAISON_SOCIALE}}
("Doctopus", "wir") und Nutzerinnen und Nutzern ("Sie") über die Nutzung
der Lernplattform Doctopus (Website und zugehörige Anwendung).

### § 2 Leistungsbeschreibung

Doctopus ist ein digitales Sprachlern-Werkzeug zur Vorbereitung auf die
Fachsprachprüfung Medizin. Es handelt sich um **kein Medizinprodukt** und
**keine klinische Entscheidungshilfe** (siehe `disclaimer.md`).

Es gibt drei Abonnementstufen:

- **Free** — vollständiges Muster (u. a. 12 Fälle mit Merkblättern,
  Aufklärungsbögen, allgemeinen Fachbegriffen), begrenzte Demo-Credits.
- **Pro** — {{BESCHREIBUNG_PRO}}, monatliches Credit-Kontingent
  ({{ANZAHL_CREDITS_PRO}}).
- **Premium** — {{BESCHREIBUNG_PREMIUM}}, größeres Credit-Kontingent
  ({{ANZAHL_CREDITS_PREMIUM}}).

Die Kernfunktionen (Fälle, lokale und Online-Simulationen, Fachbegriffe,
Fachwissen, Lernprogramm) sind im Abonnement **unbegrenzt** nutzbar. Kosten-
intensive KI-Funktionen (KI-Patient per Sprache, KI-Korrektur des
Arztbriefs, KI-Oberarzt) werden über "Doctopus Credits" abgerechnet, die im
Abo enthalten sind, aufgeladen werden können oder durch Teilnahme an der
Community (eingereichtes Protokoll, gewonnene Liga) erworben werden können.

### § 3 Preise und Zahlung

Die jeweils gültigen Preise werden auf der Preisseite ausgewiesen.
{{PREISE_PLATZHALTER}}. Die Zahlung erfolgt über unseren Zahlungs-
dienstleister Stripe. Abonnements verlängern sich automatisch um die
gebuchte Laufzeit, sofern nicht rechtzeitig gekündigt wird (siehe § 5).

### § 4 Vertragsschluss

Der Vertrag kommt durch Ihre Bestellung (Klick auf "kostenpflichtig
bestellen" o. ä.) und unsere Bestätigung (Zugangsfreischaltung bzw.
Bestätigungs-E-Mail) zustande.

### § 5 Laufzeit und Kündigung

{{LAUFZEIT_UND_KUENDIGUNGSFRIST}} — {{"à préciser par la direction :
mensuel sans engagement / annuel ? Kündigungsfrist à définir."}} Die
Kündigung kann über das Kundenkonto (Stripe Customer Portal) oder per
E-Mail erfolgen.

### § 6 Doctopus Credits

Credits sind eine plattforminterne Verrechnungseinheit ohne Bargeldwert
außerhalb der Plattform, nicht übertragbar auf Dritte, {{VERFALLSREGEL}}
{{"à préciser: les crédits expirent-ils ? à la fin du mois, de
l'abonnement, jamais ? — point produit non tranché dans les contrats lus"}}.
Nicht verbrauchte Credits werden bei Kündigung {{RUECKERSTATTUNGSREGEL}}
{{"à préciser: remboursés au prorata ou perdus ?"}}.

### § 7 Digitale Inhalte — besondere Hinweise

Bei Abschluss eines Abonnements bzw. beim Erwerb von Credits handelt es
sich um digitale Inhalte, die nicht auf einem körperlichen Datenträger
bereitgestellt werden. Siehe `widerruf.md` für die
Widerrufsbelehrung und die Bedingungen eines vorzeitigen Erlöschens des
Widerrufsrechts.

### § 8 Nutzungsrechte

Wir räumen Ihnen ein einfaches, nicht übertragbares Recht zur Nutzung der
Inhalte im Rahmen Ihres Abonnements zu persönlichen Lernzwecken ein. Eine
Weitergabe von Zugangsdaten oder Inhalten an Dritte ist nicht gestattet.

### § 9 Verfügbarkeit und Änderungen

Wir sind bestrebt, eine hohe Verfügbarkeit sicherzustellen, garantieren
jedoch keine ununterbrochene Erreichbarkeit. Inhalte und Funktionsumfang
können weiterentwickelt werden.

### § 10 Haftung

Es gelten die Hinweise in `disclaimer.md`. Im Übrigen haften wir nach den
gesetzlichen Bestimmungen, {{HAFTUNGSBESCHRAENKUNG_KLAUSEL}} {{"clause de
limitation de responsabilité standard à rédiger/valider par un juriste
selon le droit applicable (probablement droit allemand pour les
consommateurs allemands, art. 6 Rom I)"}}.

### § 11 Anwendbares Recht und Gerichtsstand

{{ANWENDBARES_RECHT}} {{"à trancher par un juriste: le choix du droit
français comme droit du prestataire ne prive pas le consommateur allemand
de la protection impérative de son droit national (Rom I, art. 6) — la
clause doit être rédigée en conséquence, pas devinée ici."}}

### § 12 Schlussbestimmungen

Sollte eine Bestimmung dieser AGB unwirksam sein, bleibt die Wirksamkeit
der übrigen Bestimmungen unberührt.

---

**À valider par un juriste**

1. Modalités précises Pro/Premium (prix, quotas de crédits, règle de
   péremption des crédits, remboursement au prorata) — décisions produit
   à faire trancher par la direction avant rédaction juridique finale.
2. Clause de droit applicable / juridiction compétente pour un
   prestataire français servant des consommateurs allemands (protection
   impérative du droit du consommateur, art. 6 Rom I).
3. Cohérence entre § 6/§ 7 et `widerruf.md` (renonciation expresse au
   droit de rétractation pour le contenu numérique consommé immédiatement).
