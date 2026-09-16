# Ledger — site (#8, epic #9) · étape 4

Plan : docs/superpowers/plans/2026-09-16-site-plan.md (35352b0) · spec 1e84950.
Arbitrages lead-site sur H1–H11 (2026-09-16) : H1 hero en script vanilla (pas d'îlot React) ; H2 schéma frequencies.json = contrat §5 ; H3 `priority` retirée de Premium (matrice d'entitlements = vérité) ; H6 `node --test` ; H7 front-matter YAML sur docs/legal/*.md ; autres hypothèses acceptées telles que formulées dans le plan. Contrat §3 et §5 inv. 7 à amender par arch-site.

| Tâche | Implémenteur | Commit(s) | Revue | Verdict | Fix |
|---|---|---|---|---|---|
| T0.1 | impl-t01b | 00cdd0c | review-t01 | APPROVED_WITH_MINORS (glass dark fallback → corrigé T0.3 ; darkMode media → T0.3) | — |
| T0.2 | impl-t02 | 9981252 | review-t02 | APPROVED_WITH_MINORS (« Erfolgsgarantie » → reformuler en T1.6 sans radical §6.1 ; strip-types → T3.4) | — |
| T0.3 | impl-t03 | 5dfba82 | review-t03 | APPROVED_WITH_MINORS (mode sombre illisible header/footer/notice + border-ink-100 → fix en T2.2) | — |
| T0.4 | impl-t04 | 6d106e6, 489afe8 | review-t04 | APPROVED_WITH_MINORS (.prose manuel accepté) | — |
| T0.5 | impl-t05 | 1db9f1c | review-t05 | APPROVED_WITH_MINORS (I1 garde refresh, I2 validated_by) | lead-site 5cfc5bf |
| T1.1 | impl-t11 | e029412 | review-t11 | APPROVED_WITH_MINORS (10/10 pathologies fidèles, Σ=593 ; ** dans summary → T2.3) | — |
| T1.2 | impl-t12 | c000f8d | review-t12 | APPROVED_WITH_MINORS | — |
| T1.3 | impl-t13 | dce7bdf | review-t13 | APPROVED_WITH_MINORS (I1 omissions non détectées → fix en T1.5 ; M4 lexique « jederzeit kündbar » → T1.5) | c6704c6 |
| T1.4 | impl-t14 | 3b1a5bf | review-t14 | APPROVED_WITH_MINORS (I1 level C1/kammer non sourcés, I2 « grille interne » à afficher → brief T2.6) | — |
| T1.5 | impl-t15 | 1b9e440 | — | — | — |
