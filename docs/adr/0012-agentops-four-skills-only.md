# ADR-0012 — AgentOps : quatre skills aux gates, pas le système

**Statut** : accepté · **Date** : 2026-09-16

## Contexte

Le plugin agentops (67 skills) porte une thèse que ce projet a déjà prouvée :
avant qu'un changement compte comme fait, quelque chose qui ne l'a pas écrit
doit le vérifier. Mais c'est un système d'exploitation complet qui suppose son
propre écosystème — CLI `ao`, tracker local `beads` (`br`/`bd`/`bv`), swarms
tmux `ntm`, archéologie `cass`, builds distants `rch`, garde-fou `dcg` — et ses
boucles centrales (`rpi`, `crank`, `converge`, `evolve`, `swarm`) tournent sur
cette pile. L'adopter comme pilote installerait un second système de
coordination (tracker local en doublon de GitHub, ledger en doublon du nôtre)
et une dette d'outillage pour un fondateur seul. Le recouvrement avec la chaîne
existante (revue, tests, sécurité, plan, handoff, domaine) est massif.

Notre chaîne vérifiait le **code** (revue par tâche, revue de branche) mais ne
stressait ni le **plan** ni le **spec** avant exécution, et n'avait pas de
rituel d'apprentissage en fin de sous-projet. Sur les Fondations, la
troncature PostgREST et la publication Realtime absente ont été trouvées par
la revue finale — après l'implémentation.

## Décision

Adopter **quatre** skills agentops, autonomes (sans `ao`/`beads`), branchés
aux gates de la méthode :

| Skill | Gate | Rôle |
|---|---|---|
| `agentops:red-team` | Étape 1, spec avant relecture direction | hypothèses non dites, trous |
| `agentops:pre-mortem` | Étape 3, plan avant le premier dispatch | modes d'échec → parades |
| `agentops:council` | toute décision irréversible / ADR | juges indépendants |
| `agentops:post-mortem` | fin de sous-projet, après merge | apprentissages → `CLAUDE.md` / `dept-*` |

**Hors périmètre par décision** : `rpi`, `crank`, `converge`, `evolve`,
`swarm`, `beads-br`, `beads-bv`, `ntm`, `cass`, `rch`, `dcg`, `using-atm`,
`agent-mail`, `account-rotation`, `bootstrap`, `compile`, `flywheel`. Ne pas
rediscuter sans un fait nouveau (par exemple : abandon de GitHub Issues).

## Conséquences

- Coût nul en outillage ; les quatre skills s'exécutent avec nos agents.
- La méthode gagne une vérification avant exécution et une boucle
  d'apprentissage ; `DOCTOPUS-AGENTIC-ORG.md` §2, `dept-coordination` et
  `/doctopus-feature` sont mis à jour en conséquence.
