#!/usr/bin/env node
// ============================================================================
// Validateur mécanique des specs visuelles Fachwissen (contrat §5).
//
// POURQUOI : un système générique (sept composants) piloté par une spec
// typée par pathologie ne vaut que si chaque spec est réellement cohérente
// avec la fiche qu'elle décore — refs résolues, énumérations respectées,
// texte allemand affichable, `ergänzt` relu par un humain content-*. Le
// compilateur TypeScript vérifie la FORME des types ; il ne vérifie ni les
// bornes (2 à 8 lignes, profondeur ≤ 4…), ni la résolution contre les VRAIES
// données de `seedFachwissen.ts`, ni la liste blanche `reviewed.ts`. Ce script
// charge les vrais objets JavaScript (esbuild, même pattern que
// `loadCases.mjs`) et applique les 11 règles du contrat §5, dans l'ordre.
// ============================================================================
import { build } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const argDirIdx = process.argv.indexOf('--dir');
const specsDir =
  argDirIdx !== -1 && process.argv[argDirIdx + 1]
    ? join(process.cwd(), process.argv[argDirIdx + 1])
    : join(root, 'src/data/fachwissenVisuals');

/** Charge { seedFachwissen, VISUAL_SPECS, REVIEWED_ERGAENZT, resolveRef, refKey, ANATOMY_REGIONS }. */
async function loadVisuals() {
  const dir = mkdtempSync(join(tmpdir(), 'fsp-visuals-'));
  const entry = join(dir, 'entry.ts');
  writeFileSync(
    entry,
    `
    export { seedFachwissen } from ${JSON.stringify(join(root, 'src/data/seedFachwissen.ts'))};
    export { VISUAL_SPECS } from ${JSON.stringify(join(specsDir, 'index.ts'))};
    export { REVIEWED_ERGAENZT } from ${JSON.stringify(join(specsDir, 'reviewed.ts'))};
    export { resolveRef, refKey } from ${JSON.stringify(join(root, 'src/data/fachwissenVisuals/resolve.ts'))};
    export { ANATOMY_REGIONS } from ${JSON.stringify(join(root, 'src/data/fachwissenVisuals/types.ts'))};
  `,
  );
  const out = join(dir, 'bundle.mjs');
  await build({
    entryPoints: [entry],
    outfile: out,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    external: ['react', 'react-dom'],
    logLevel: 'silent',
    // `types.ts` importe `VisualKind` (registry.ts) et `Tone` (primitives.tsx)
    // depuis `@/components/visuals/...` — ce sont des `import type`, effacés
    // à la compilation, mais esbuild doit malgré tout RÉSOUDRE le chemin
    // (résolution avant élagage des types). Un stub casserait ces fichiers
    // s'ils étaient un jour importés en valeur ; on résout donc l'alias vers
    // `src/` comme le fait `vite.config.ts`, sans rien stubber.
    plugins: [
      {
        name: 'resolve-at-alias',
        setup(b) {
          b.onResolve({ filter: /^@\// }, (args) => ({
            path: join(root, 'src', args.path.slice(2)),
          }));
        },
      },
    ],
  });
  const mod = await import(pathToFileURL(out).href + '?t=' + Date.now());
  rmSync(dir, { recursive: true, force: true });
  return mod;
}

// ----------------------------------------------------------------------------
// Aides
// ----------------------------------------------------------------------------

const EMOJI_RE = /\p{Extended_Pictographic}/u;
const FRENCH_WORDS = ['le', 'la', 'les', 'avec', 'chez', 'et', 'pour', 'ou', 'des', 'une'];
function frenchWordRe(word) {
  return new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, 'iu');
}

/** Erreur mécanique : message préfixé `[visuals]`, sortie immédiate. */
class VisualsError extends Error {}
function fail(msg) {
  throw new VisualsError(`[visuals] ${msg}`);
}

function checkTextField(value, label, { maxLen } = {}) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`texte vide / non allemand / emoji: ${label} (vide)`);
  }
  if (maxLen && value.length > maxLen) {
    fail(`bloc invalide: ${label} dépasse ${maxLen} caractères`);
  }
  if (EMOJI_RE.test(value)) {
    fail(`texte vide / non allemand / emoji: ${label} contient un emoji`);
  }
  for (const w of FRENCH_WORDS) {
    if (frenchWordRe(w).test(value)) {
      fail(`texte vide / non allemand / emoji: ${label} contient le mot français "${w}"`);
    }
  }
}

// Préfixe court d'un id par kind (contrat §3 : « préfixé par le kind, ex. `tree-ap` »).
const KIND_PREFIX = {
  'decision-tree': 'tree',
  'compare-table': 'table',
  'therapy-toggles': 'toggles',
  'score-gauge': 'gauge',
  timeline: 'timeline',
  'syndrome-map': 'syndrome',
  'anatomy-map': 'anatomy',
};

const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ANCHORS = new Set([
  'klinik',
  'diagnostik',
  'therapie',
  'klassifikation',
  'differenzialdiagnosen',
  'redFlags',
  'risikofaktoren',
  'prognose',
  'aetiologie',
]);
const TONES = new Set(['neutral', 'accent', 'signal', 'warn']);
const AXES = new Set(['zeit', 'stadium', 'schritt']);
const FIGURES = new Set(['body', 'torso', 'abdomen']);
const REGIONS_BY_FIGURE = (regions) => {
  const abdomen = new Set([
    'epigastrium',
    'right-upper-quadrant',
    'left-upper-quadrant',
    'periumbilical',
    'right-lower-quadrant',
    'left-lower-quadrant',
    'flank-left',
    'flank-right',
  ]);
  const torsoExtra = new Set([
    'neck',
    'jaw',
    'chest',
    'retrosternal',
    'left-arm',
    'right-arm',
    'back',
    'lumbar',
    'pelvis',
  ]);
  const torso = new Set([...abdomen, ...torsoExtra]);
  const body = new Set(regions);
  return {
    abdomen: new Set([...abdomen, 'skin']),
    torso: new Set([...torso, 'skin']),
    body: new Set([...body, 'skin']),
  };
};

/** Collecte toutes les cibles de `tone`/`akut`/`axisTone` d'un bloc (règle 10). */
function countSignals(block) {
  let count = 0;
  const kind = block.kind;
  const data = block.data;
  if (kind === 'timeline') {
    if (data.axisTone === 'signal') count++;
    for (const p of data.points ?? []) {
      if (p.tone === 'signal') fail(`data invalide (timeline/${block.id}): un point ne peut pas porter tone signal`);
    }
    return count;
  }
  function walk(node) {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node;
    if (obj.tone === 'signal') count++;
    if (obj.akut === true) count++;
    for (const v of Object.values(obj)) walk(v);
  }
  walk(data);
  return count;
}

// ----------------------------------------------------------------------------
// Validation d'une spec
// ----------------------------------------------------------------------------

function validateSpec(spec, fileId, { seedFachwissen, REVIEWED_ERGAENZT, resolveRef, refKey, ANATOMY_REGIONS }) {
  // Règle 1 : fachwissenId = nom de fichier.
  if (spec.fachwissenId !== fileId) {
    fail(`index désynchronisé: ${fileId}`);
  }
  // Règle 2 : fiche existe.
  const fw = seedFachwissen.find((f) => f.id === spec.fachwissenId);
  if (!fw) {
    fail(`fiche inconnue: ${spec.fachwissenId}`);
  }
  // Règle 3 : version.
  if (spec.version !== 1) {
    fail(`version non supportée`);
  }
  // Règle 4 : nombre de blocs.
  if (!Array.isArray(spec.blocks) || spec.blocks.length < 1 || spec.blocks.length > 4) {
    fail(`bloc invalide: ${spec.fachwissenId} doit avoir 1 à 4 blocs`);
  }

  const seenIds = new Set();
  const collapsed = new Map(); // refKey -> blockId (règle 7)
  const orderByAnchor = new Map(); // anchor -> Set(order)

  for (const block of spec.blocks) {
    // Règle 4 : id unique, kebab-case, préfixé par le kind.
    if (typeof block.id !== 'string' || !KEBAB_RE.test(block.id)) {
      fail(`bloc invalide: id "${block.id}" n'est pas kebab-case`);
    }
    if (seenIds.has(block.id)) {
      fail(`bloc invalide: id dupliqué "${block.id}"`);
    }
    seenIds.add(block.id);
    const kindPrefix = KIND_PREFIX[block.kind];
    if (!kindPrefix || !block.id.startsWith(kindPrefix + '-')) {
      fail(`bloc invalide: id "${block.id}" n'est pas préfixé par le kind "${block.kind}"`);
    }
    checkTextField(block.title, `${block.id}.title`, { maxLen: 60 });
    if (block.merke !== undefined) checkTextField(block.merke, `${block.id}.merke`);

    // Règle 5 : enums.
    const KINDS = new Set([
      'anatomy-map',
      'decision-tree',
      'syndrome-map',
      'timeline',
      'compare-table',
      'therapy-toggles',
      'score-gauge',
    ]);
    if (!KINDS.has(block.kind)) fail(`enum invalide: kind=${block.kind}`);
    if (!ANCHORS.has(block.anchor)) fail(`enum invalide: anchor=${block.anchor}`);
    if (block.order !== undefined) {
      const set = orderByAnchor.get(block.anchor) ?? new Set();
      if (set.has(block.order)) fail(`enum invalide: order=${block.order} dupliqué sur anchor ${block.anchor}`);
      set.add(block.order);
      orderByAnchor.set(block.anchor, set);
    }

    // Règle 4/11 : replaces non vides check texte plus loin (résolution).
    if (!Array.isArray(block.replaces)) fail(`bloc invalide: replaces manquant sur ${block.id}`);

    // Règle 6 : refs résolues (replaces).
    for (const ref of block.replaces) {
      if (resolveRef(fw, ref) === null) {
        fail(`ref introuvable (${block.id}): ${refKey(ref)}`);
      }
    }
    // Règle 7 : unicité du repli.
    for (const ref of block.replaces) {
      const key = refKey(ref);
      if (collapsed.has(key)) {
        fail(`double repli: ${key} (${collapsed.get(key)}, ${block.id})`);
      }
      collapsed.set(key, block.id);
    }

    // Règle 6 : refs source/ref dans data (parcours générique + ergänzt §8).
    validateDataRefsAndErgaenzt(block, fw, spec.fachwissenId, resolveRef, refKey, REVIEWED_ERGAENZT);

    // Règle 9 : forme par kind.
    validateShape(block, ANATOMY_REGIONS);

    // Règle 10 : au plus un signal par bloc.
    if (countSignals(block) > 1) {
      fail(`signal multiple: ${block.id}`);
    }
  }

  return { fw, blockCount: spec.blocks.length };
}

function walkSourceAndRef(data, visit) {
  const seen = new Set();
  function walk(node) {
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const obj = node;
    if ('source' in obj && obj.source !== undefined) visit(obj.source, obj);
    if ('ref' in obj && obj.ref !== undefined && typeof obj.ref === 'object' && obj.ref && 'section' in obj.ref) {
      visit(obj.ref, obj);
    }
    for (const v of Object.values(obj)) {
      if (v !== obj.source) walk(v);
    }
  }
  walk(data);
}

function validateDataRefsAndErgaenzt(block, fw, fachwissenId, resolveRef, refKey, REVIEWED_ERGAENZT) {
  walkSourceAndRef(block.data, (ref, owner) => {
    if (ref === 'ergänzt') {
      const text = owner.label ?? owner.answer ?? owner.criterion ?? owner.text ?? undefined;
      if (typeof text !== 'string' || text.trim() === '') {
        fail(`ergänzt non relu: ${block.id} texte introuvable pour la ligne 'ergänzt'`);
      }
      const found = REVIEWED_ERGAENZT.some(
        (r) => r.fachwissenId === fachwissenId && r.blockId === block.id && r.text === text,
      );
      if (!found) {
        fail(`ergänzt non relu: ${block.id} "${text}"`);
      }
      return;
    }
    if (resolveRef(fw, ref) === null) {
      fail(`ref introuvable (${block.id}): ${refKey(ref)}`);
    }
  });
}

function validateShape(block, ANATOMY_REGIONS) {
  const kind = block.kind;
  const data = block.data;
  const label = `${kind}/${block.id}`;

  if (kind === 'anatomy-map') {
    if (!FIGURES.has(data.figure)) fail(`enum invalide: figure=${data.figure}`);
    if (!Array.isArray(data.hotspots) || data.hotspots.length < 2) {
      fail(`data invalide (${label}): anatomy-map nécessite ≥ 2 hotspots`);
    }
    const byFigure = REGIONS_BY_FIGURE(ANATOMY_REGIONS)[data.figure];
    const seenRegions = new Set();
    for (const h of data.hotspots) {
      if (!byFigure.has(h.region)) fail(`enum invalide: region=${h.region} hors figure ${data.figure}`);
      if (seenRegions.has(h.region)) fail(`data invalide (${label}): région dupliquée ${h.region}`);
      seenRegions.add(h.region);
      checkTextField(h.label, `${block.id}.hotspot.label`);
      if (h.tone !== undefined && !TONES.has(h.tone)) fail(`enum invalide: tone=${h.tone}`);
    }
  } else if (kind === 'decision-tree') {
    let nodeCount = 0;
    let maxDepth = 0;
    function walk(node, depth) {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);
      if ('question' in node) {
        checkTextField(node.question, `${block.id}.question`);
        if (!Array.isArray(node.branches) || node.branches.length < 2) {
          fail(`data invalide (${label}): question nécessite ≥ 2 branches`);
        }
        for (const b of node.branches) {
          checkTextField(b.label, `${block.id}.branch.label`);
          walk(b.child, depth + 1);
        }
      } else if ('answer' in node) {
        checkTextField(node.answer, `${block.id}.answer`);
        if (node.tone !== undefined && !TONES.has(node.tone)) fail(`enum invalide: tone=${node.tone}`);
      } else {
        fail(`data invalide (${label}): nœud sans question ni answer`);
      }
    }
    walk(data.root, 1);
    if (maxDepth > 4) fail(`data invalide (${label}): profondeur ${maxDepth} > 4`);
    if (nodeCount > 12) fail(`data invalide (${label}): ${nodeCount} nœuds > 12`);
  } else if (kind === 'syndrome-map') {
    checkTextField(data.center, `${block.id}.center`);
    if (!Array.isArray(data.spokes) || data.spokes.length < 3 || data.spokes.length > 6) {
      fail(`data invalide (${label}): syndrome-map nécessite 3 à 6 rayons`);
    }
    for (const s of data.spokes) {
      checkTextField(s.label, `${block.id}.spoke.label`);
      if (s.tone !== undefined && !TONES.has(s.tone)) fail(`enum invalide: tone=${s.tone}`);
      if (!Array.isArray(s.items) || s.items.length < 1 || s.items.length > 5) {
        fail(`data invalide (${label}): rayon nécessite 1 à 5 items`);
      }
      for (const it of s.items) checkTextField(it.text, `${block.id}.item.text`);
    }
  } else if (kind === 'timeline') {
    if (!AXES.has(data.axis)) fail(`enum invalide: axis=${data.axis}`);
    if (data.axisTone !== undefined && !['neutral', 'signal'].includes(data.axisTone)) {
      fail(`enum invalide: axisTone=${data.axisTone}`);
    }
    if (!Array.isArray(data.points) || data.points.length < 3 || data.points.length > 8) {
      fail(`data invalide (${label}): timeline nécessite 3 à 8 points`);
    }
    for (const p of data.points) {
      checkTextField(p.at, `${block.id}.point.at`);
      checkTextField(p.label, `${block.id}.point.label`);
      if (p.detail !== undefined) checkTextField(p.detail, `${block.id}.point.detail`);
      if (p.tone === 'signal') fail(`data invalide (${label}): un point ne peut pas porter tone signal`);
      if (p.tone !== undefined && !TONES.has(p.tone)) fail(`enum invalide: tone=${p.tone}`);
    }
  } else if (kind === 'compare-table') {
    if (!Array.isArray(data.columns) || data.columns.length < 2 || data.columns.length > 3) {
      fail(`data invalide (${label}): compare-table nécessite 2 à 3 colonnes`);
    }
    for (const c of data.columns) checkTextField(c, `${block.id}.column`);
    if (!Array.isArray(data.rows) || data.rows.length < 2 || data.rows.length > 8) {
      fail(`data invalide (${label}): compare-table nécessite 2 à 8 lignes`);
    }
    for (const r of data.rows) {
      checkTextField(r.criterion, `${block.id}.row.criterion`);
      if (!Array.isArray(r.cells) || r.cells.length !== data.columns.length) {
        fail(`data invalide (${label}): cells.length !== columns.length pour "${r.criterion}"`);
      }
      for (const cell of r.cells) checkTextField(cell, `${block.id}.row.cell`);
      if (r.emphasis !== undefined && (r.emphasis < 0 || r.emphasis >= data.columns.length)) {
        fail(`data invalide (${label}): emphasis hors bornes pour "${r.criterion}"`);
      }
    }
  } else if (kind === 'therapy-toggles') {
    if (!Array.isArray(data.options) || data.options.length < 2 || data.options.length > 5) {
      fail(`data invalide (${label}): therapy-toggles nécessite 2 à 5 options`);
    }
    let akutCount = 0;
    for (const o of data.options) {
      checkTextField(o.label, `${block.id}.option.label`);
      if (o.akut) akutCount++;
    }
    if (akutCount > 1) fail(`signal multiple: ${block.id}`);
    if (typeof data.default !== 'number' || data.default < 0 || data.default >= data.options.length) {
      fail(`data invalide (${label}): default hors bornes`);
    }
  } else if (kind === 'score-gauge') {
    checkTextField(data.score?.name, `${block.id}.score.name`);
    if (!Array.isArray(data.criteria)) fail(`data invalide (${label}): criteria manquant`);
    for (const c of data.criteria) {
      checkTextField(c.label, `${block.id}.criterion.label`);
      if (!Array.isArray(c.points) || c.points.length === 0) {
        fail(`data invalide (${label}): points manquant pour "${c.label}"`);
      }
      for (let i = 1; i < c.points.length; i++) {
        if (c.points[i] <= c.points[i - 1]) fail(`data invalide (${label}): points non croissants pour "${c.label}"`);
      }
      if (c.choices !== undefined && c.choices.length !== c.points.length) {
        fail(`data invalide (${label}): choices.length !== points.length pour "${c.label}"`);
      }
    }
    if (!Array.isArray(data.bands) || data.bands.length === 0) {
      fail(`data invalide (${label}): bands manquant`);
    }
    const sorted = [...data.bands].sort((a, b) => a.min - b.min);
    const sumMin = data.criteria.reduce((acc, c) => acc + c.points[0], 0);
    const sumMax = data.criteria.reduce((acc, c) => acc + c.points[c.points.length - 1], 0);
    if (data.criteria.length > 0) {
      if (sorted[0].min !== sumMin) fail(`data invalide (${label}): bandes ne couvrent pas ${sumMin} (Σmin)`);
      if (sorted[sorted.length - 1].max !== sumMax) {
        fail(`data invalide (${label}): bandes ne couvrent pas ${sumMax} (Σmax)`);
      }
    }
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].min !== sorted[i - 1].max + 1) {
        fail(`data invalide (${label}): bandes non contiguës entre "${sorted[i - 1].label}" et "${sorted[i].label}"`);
      }
    }
    for (const b of sorted) {
      checkTextField(b.label, `${block.id}.band.label`);
      if (!TONES.has(b.tone)) fail(`enum invalide: tone=${b.tone}`);
    }
  }
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  const files = readdirSync(specsDir).filter((f) => /^fw-.*\.ts$/.test(f));
  const fileIds = new Set(files.map((f) => basename(f, '.ts')));

  const mod = await loadVisuals();
  const { VISUAL_SPECS, REVIEWED_ERGAENZT, resolveRef, refKey, ANATOMY_REGIONS } = mod;
  // `seedFachwissen` est une fonction (seedFachwissen.ts) : on la matérialise une fois.
  const seedFachwissen = mod.seedFachwissen();

  // Règle 1 : fichiers ↔ index.
  const indexIds = new Set(Object.keys(VISUAL_SPECS));
  for (const id of fileIds) {
    if (!indexIds.has(id)) fail(`index désynchronisé: ${id}`);
  }
  for (const id of indexIds) {
    if (!fileIds.has(id)) fail(`index désynchronisé: ${id}`);
  }

  let blockTotal = 0;
  let ergaenztTotal = 0;

  for (const fileId of fileIds) {
    const spec = VISUAL_SPECS[fileId];
    const { blockCount } = validateSpec(spec, fileId, {
      seedFachwissen,
      REVIEWED_ERGAENZT,
      resolveRef,
      refKey,
      ANATOMY_REGIONS,
    });
    blockTotal += blockCount;
  }

  // Règle 8 (liste morte) : chaque ligne de REVIEWED_ERGAENZT correspond à un
  // champ réel 'ergänzt' effectivement rencontré ci-dessus.
  const usedEntries = new Set();
  for (const fileId of fileIds) {
    const spec = VISUAL_SPECS[fileId];
    for (const block of spec.blocks) {
      walkSourceAndRef(block.data, (ref, owner) => {
        if (ref === 'ergänzt') {
          const text = owner.label ?? owner.answer ?? owner.criterion ?? owner.text;
          usedEntries.add(`${spec.fachwissenId}\u0000${block.id}\u0000${text}`);
        }
      });
    }
  }
  for (const entry of REVIEWED_ERGAENZT) {
    const key = `${entry.fachwissenId}\u0000${entry.blockId}\u0000${entry.text}`;
    if (!usedEntries.has(key)) {
      fail(`ergänzt non relu: ligne morte dans reviewed.ts (${entry.fachwissenId}/${entry.blockId} "${entry.text}")`);
    }
  }
  ergaenztTotal = usedEntries.size;

  console.log(`OK ${fileIds.size} specs / ${blockTotal} blocs / ${ergaenztTotal} ergänzt relus`);
  process.exit(0);
}

main().catch((err) => {
  if (err instanceof VisualsError) {
    console.error(err.message);
  } else {
    console.error('[visuals] erreur de chargement:', err.message ?? err);
  }
  process.exit(1);
});
