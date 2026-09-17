---
name: dept-experience
description: Standards du pôle Expérience (UX, mouvement, charte « instrument clinique », avocat de l'utilisateur) — à invoquer avant tout écran, animation ou audit UI Doctopus.
---

# Expérience — standards

## Charte (fsp-brand-identity)
Bricolage Grotesque (display), IBM Plex Sans (corps ET libellés d'interface : `.label`, `.eyebrow`, casse normale, jamais `uppercase` — ADR-0016), IBM Plex Mono réservé aux DONNÉES (chiffres, chronos, codes). Pétrole `brand` porteur ; coral `signal` réservé aux bascules, avec parcimonie. Verre : beaucoup de flou, peu d'opacité. Réutiliser `PhraseControls`, `SidePanel`, `TimeCapsule`, `Seg`, `.reveal`, `ease-fluid` avant de créer.

## Mouvement (`apple-design`, `emil-design-eng`, `animate`)
Fluide, interruptible, sans clignotement, sans effets spéciaux ; FLIP pour les repositionnements ; `prefers-reduced-motion` respecté ; jamais une propriété de disposition animée. « Apple-like » = physique, retenue, continuité.

## Critiquer et affiner (`impeccable`)
Sur tout écran EXISTANT touché : `impeccable` en mode critique/audit d'abord, puis
`distill` (Fachwissen chargé), `clarify` (guide « machinal »), `polish`, `animate`.
C'est l'étape 4 (après chaque tranche) et l'étape 5 (revue UI) de `/doctopus-feature`.
Repli pour un écran NEUF quand `impeccable` ne suffit pas : `bencium-controlled-ux-designer`
(demande avant chaque décision, respecte la charte). **Jamais** `bencium-innovative`
ni `bencium-impact` : ils poussent vers l'extrême (concept « aura » rejeté). `taste-skill`
est réservé au site (pôle Croissance), pas à l'app.

## Construire (`frontend-ui-engineering`, `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`)
Accessible (WCAG AA, cibles ≥ 44 px, clavier, focus), responsive 375 → 1280, thèmes clair/sombre (l'app pilote son thème). Composants définis HORS du composant parent (leçon `Seg`). `setState` en forme fonctionnelle.

## Vérifier (`playwright-cli`, `browser-testing-with-devtools`)
Headless ; deux onglets pour médecin + simulant ; mesurer `getBoundingClientRect`/`getComputedStyle` ; **lire l'état depuis le DOM de l'app, jamais depuis un module importé par la sonde** (`/src/…` ≠ `@/…`).

## Avocat de l'utilisateur (ADR-0008)
Protocole « journée d'usage » par persona ; chaque constat au format : *ce que la machine impose / ce que l'humain attendait / preuve*. Remonte au produit, pas à la QA.
