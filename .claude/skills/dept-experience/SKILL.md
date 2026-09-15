---
name: dept-experience
description: Standards du pôle Expérience (UX, mouvement, charte « instrument clinique », avocat de l'utilisateur) — à invoquer avant tout écran, animation ou audit UI Doctopus.
---

# Expérience — standards

## Charte (fsp-brand-identity)
Bricolage Grotesque (display), IBM Plex Sans (corps), IBM Plex Mono (données, libellés en capitales espacées). Pétrole `brand` porteur ; coral `signal` réservé aux bascules, avec parcimonie. Verre : beaucoup de flou, peu d'opacité. Réutiliser `PhraseControls`, `SidePanel`, `TimeCapsule`, `Seg`, `.reveal`, `ease-fluid` avant de créer.

## Mouvement (`apple-design`, `emil-design-eng`, `animate`)
Fluide, interruptible, sans clignotement, sans effets spéciaux ; FLIP pour les repositionnements ; `prefers-reduced-motion` respecté ; jamais une propriété de disposition animée. « Apple-like » = physique, retenue, continuité.

## Construire (`frontend-ui-engineering`, `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines`)
Accessible (WCAG AA, cibles ≥ 44 px, clavier, focus), responsive 375 → 1280, thèmes clair/sombre (l'app pilote son thème). Composants définis HORS du composant parent (leçon `Seg`). `setState` en forme fonctionnelle.

## Vérifier (`playwright-cli`, `browser-testing-with-devtools`)
Headless ; deux onglets pour médecin + simulant ; mesurer `getBoundingClientRect`/`getComputedStyle` ; **lire l'état depuis le DOM de l'app, jamais depuis un module importé par la sonde** (`/src/…` ≠ `@/…`).

## Avocat de l'utilisateur (ADR-0008)
Protocole « journée d'usage » par persona ; chaque constat au format : *ce que la machine impose / ce que l'humain attendait / preuve*. Remonte au produit, pas à la QA.
