# F4a — « Le patient dit » : des phrases, plus des fragments

Retour direction n°3 : 197 lignes `pa` (148 de termes liés à un cas, 49 visibles de A à Z) étaient des fragments (« die weißen Blutkörperchen in meinem Blut »), affichés entre guillemets comme une parole.

- Règle mécanique ajoutée à `scripts/checkTermRegister.mjs` : `pa` commence par une majuscule et finit par `.`, `!` ou `?` — la CI refuse désormais un fragment.
- Réécriture (`content-case-author`) puis relectures en parallèle : `fsp-language-reviewer` (5 corrections : Perfekt à l'oral au lieu du prétérit) et `fsp-clinical-reviewer` (5 corrections de sens — Fieber ≠ « mir war heiß », Lymphom = cancer primitif, benigne ≠ « sans danger », Index = rapport de pressions, Antibiotika sans Penicillin dans un cas allergique ; 3 contradictions avec le cas levées : Basis, allergisch, proximal).
- Résultat : `checkTermRegister --require-all` exit 0 sur 1 355 termes renseignés, aucun lié sans registre.

Tableau complet avant/après : `.superpowers/sdd/pa-fragments.md` (non versionné).
