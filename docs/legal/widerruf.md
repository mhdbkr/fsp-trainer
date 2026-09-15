> **ENTWURF — Von einem Juristen zu prüfen, nicht veröffentlichen.**
> Datum: 2026-09-16 · Autor: compliance-checker (pôle Fondations) · Statut : brouillon non validé.

---

**FR — note pour la direction**

Point sensible : les abonnements Doctopus et l'achat de crédits sont du
« contenu numérique non fourni sur un support matériel ». Le droit de
rétractation de 14 jours peut s'éteindre par avance si le consommateur (a)
consent expressément à l'exécution avant la fin du délai et (b) reconnaît
perdre son droit de rétractation de ce fait (§ 356 Abs. 5 BGB). **Ceci doit
être branché dans le produit** : une case à cocher explicite au moment du
paiement, distincte de l'acceptation des AGB — non vérifiable par ce
brouillon (voir `README.md`, case « branché »). Sans cette case, le
consommateur garde son droit de rétractation même après consommation, ce
qui expose à des remboursements a posteriori.

Décision direction (2026-09-16, via `lead-site`) : le checkout est réel,
via Stripe. La case de renonciation expresse (§ 356 Abs. 5 BGB) doit donc
être intégrée dans le flux Stripe Checkout (ou juste avant, côté site,
avant redirection) — **hors périmètre d'écriture de ce brouillon**, à
vérifier « branché » par `site-implementer`. Placeholders d'identité
harmonisés sous `{{LEGAL_*}}`.

---

## Widerrufsbelehrung

### Widerrufsrecht

Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen
Vertrag zu widerrufen.

Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.

Um Ihr Widerrufsrecht auszuüben, müssen Sie uns

{{LEGAL_NAME}}
{{LEGAL_ADDRESS_STREET}}, {{LEGAL_ADDRESS_CITY}}
{{LEGAL_EMAIL}}

mittels einer eindeutigen Erklärung (z. B. per Post oder E-Mail) über Ihren
Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das
beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht
vorgeschrieben ist.

Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über
die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.

### Folgen des Widerrufs

Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir
von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen
ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses
Vertrags bei uns eingegangen ist. {{"clause de déduction proportionnelle
si l'exécution a déjà commencé avec accord exprès — cohérence à vérifier
avec la clause d'extinction anticipée ci-dessous"}}

### Vorzeitiges Erlöschen des Widerrufsrechts bei digitalen Inhalten

Ihr Widerrufsrecht erlischt vorzeitig, wenn wir mit der Ausführung des
Vertrags begonnen haben, nachdem Sie

1. ausdrücklich zugestimmt haben, dass wir mit der Ausführung des Vertrags
   vor Ablauf der Widerrufsfrist beginnen, und
2. Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit
   Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren
   (§ 356 Abs. 5 BGB).

**Produktseitig erforderlich**: eine gesonderte Checkbox beim Kauf-/
Abo-Abschluss, die diese beiden Punkte ausdrücklich abfragt — getrennt von
der Zustimmung zu den AGB. Ohne diese Checkbox bleibt das Widerrufsrecht
bestehen. Status: **nicht als branché bestätigt**, siehe `README.md`.

---

## Muster-Widerrufsformular

(Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular
aus und senden Sie es zurück.)

An:

{{LEGAL_NAME}}
{{LEGAL_ADDRESS_STREET}}, {{LEGAL_ADDRESS_CITY}}
{{LEGAL_EMAIL}}

— Hiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über
die Erbringung der folgenden Dienstleistung: Doctopus-Abonnement / Credits
{{"biffer selon le cas"}}

— Bestellt am: __________
— Name des/der Verbraucher(s): __________
— Anschrift des/der Verbraucher(s): __________
— Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):
  __________
— Datum: __________

---

**À valider par un juriste**

1. La formulation exacte et l'emplacement de la case de renonciation
   expresse (§ 356 Abs. 5 BGB) — condition de validité de l'extinction
   anticipée du droit de rétractation.
2. Le calcul du remboursement proportionnel en cas de rétractation après
   consommation partielle (crédits déjà utilisés).
3. Articulation avec un for/droit potentiellement français (voir `agb.md`
   § 11) — le droit de rétractation allemand est d'ordre public pour un
   consommateur allemand quel que soit le droit du contrat (Rom I, art. 6).
