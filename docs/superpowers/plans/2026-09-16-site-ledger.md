# Ledger — site (#8, epic #9) · étape 4

Plan : docs/superpowers/plans/2026-09-16-site-plan.md (35352b0) · spec 1e84950.
Arbitrages lead-site sur H1–H11 (2026-09-16) : H1 hero en script vanilla (pas d'îlot React) ; H2 schéma frequencies.json = contrat §5 ; H3 `priority` retirée de Premium (matrice d'entitlements = vérité) ; H6 `node --test` ; H7 front-matter YAML sur docs/legal/*.md ; autres hypothèses acceptées telles que formulées dans le plan. Contrat §3 et §5 inv. 7 à amender par arch-site.

| Tâche | Implémenteur | Commit(s) | Revue | Verdict | Fix |
|---|---|---|---|---|---|
| T0.1 | impl-t01b | 00cdd0c | review-t01 | APPROVED_WITH_MINORS (glass dark fallback → corrigé T0.3 ; darkMode media → T0.3) | — |
| T0.2 | impl-t02 | 9981252 | review-t02 | APPROVED_WITH_MINORS (« Erfolgsgarantie » → reformuler en T1.6 sans radical §6.1 ; strip-types → T3.4) | déjà résolu par T0.3 (5dfba82 a retiré `notice.languageTool` de de.json) — constaté T1.6, aucune chaîne « Erfolgsgarantie » restante hors docs/legal/disclaimer.md (négation whole-word, non bloquant) |
| T0.3 | impl-t03 | 5dfba82 | review-t03 | APPROVED_WITH_MINORS (mode sombre illisible header/footer/notice + border-ink-100 → fix en T2.2) | — |
| T0.4 | impl-t04 | 6d106e6, 489afe8 | review-t04 | APPROVED_WITH_MINORS (.prose manuel accepté) | — |
| T0.5 | impl-t05 | 1db9f1c | review-t05 | APPROVED_WITH_MINORS (I1 garde refresh, I2 validated_by) | lead-site 5cfc5bf |
| T1.1 | impl-t11 | e029412 | review-t11 | APPROVED_WITH_MINORS (10/10 pathologies fidèles, Σ=593 ; ** dans summary → T2.3) | — |
| T1.2 | impl-t12 | c000f8d | review-t12 | APPROVED_WITH_MINORS | — |
| T1.3 | impl-t13 | dce7bdf | review-t13 | APPROVED_WITH_MINORS (I1 omissions non détectées → fix en T1.5 ; M4 lexique « jederzeit kündbar » → T1.5) | c6704c6 |
| T1.4 | impl-t14 | 3b1a5bf | review-t14 | APPROVED_WITH_MINORS (I1 level C1/kammer non sourcés, I2 « grille interne » à afficher → brief T2.6) | — |
| T1.5 | impl-t15 | 1b9e440 | review-t15 | APPROVED_WITH_MINORS (I1 héritage includesPlan sans valeur → fix en T1.7) | aae0623 |
| T1.6 | impl-t16 | 99714a2 | review-t16 | APPROVED_WITH_MINORS (I1 « 100%» sans espace → fix en T1.8 ; I2 composés DE = limite du brief, proposition brand/arch ; « keine Erfolgsgarantie » = texte légal §7.3 négé, conforme) | a3912bd |
| T1.7 | impl-t17 | 18d871d, 1a06414 | review-t17 | APPROVED_WITH_MINORS (I1 visibilité CTA géométrique seulement → fix en T3.3) | — |
| T1.8 | impl-t18 | bffba5c | review-t18 | APPROVED_WITH_MINORS (I1 forcer color-scheme ; I2 --strict routes absentes → T3.3 ; a11y 94 = contraste footer sombre → T2.2) | 6173207 |
| T2.1 | impl-t21 | e38192c | review-t21 | APPROVED_WITH_MINORS (856 o gz ; I1 sous-titres sombre, I2 perspective, I3 alt placeholder → fix en T2.3 ; asset hero réel = issue avant G6) | 5692f0f |
| T2.2 | impl-t22 | 20c49e4 | review-t22 | CHANGES_REQUIRED (I1 filtre depression ment sur top 5 ; I2 « 60 Punkte / 60 % » non officiel ; I3 text-ink-900 mort) | fix-t22 a2b45aa |
| T2.3 | impl-t23 | 9d15e6f | review-t23b | APPROVED_WITH_MINORS (I1 « Quelle » interne, I2 sort in place, I3 « Bogen deiner Kammer » Hero/pricing.json → qualifier BW) | fix-t23-24 a116b20 |
| T2.4 | impl-t24b | 5c63f93, 507cada | review-t24 | CHANGES_REQUIRED (C-1 ids bruts core, I-1 liens sombre, I-2 C6 pédagogue > brief : libellé « Mit N kostenlosen Fällen starten ») | fix-t23-24 28aea73 |
| T2.5 | impl-t25 | b701b7e | review-t25 | APPROVED_WITH_MINORS | — |
| T2.6 | impl-t25 | f895eb7 | review-t25 | CHANGES_REQUIRED (I1 test de rendu « interne Übungsskala » ; I2 retirer « angelehnt an den Bogen deiner Kammer ») — incident : relecteur a fait stash/checkout dans le worktree partagé (état final intact) | fix-t27 b91de93 |
| T2.7 | impl-t27 | 8b04e3a | review-t27 | APPROVED_WITH_MINORS (I1 faq/credits.md présent → « bald » ; M9 Widerruf fragment ; M10 Hero « Bewertung der Prüfung » → fix en T2.9) ; fixes T2.3/T2.4/T2.6 APPROVED | — |
| T2.8 | impl-t28 | f149d2f | — | — | — |
