// ============================================================================
// Chargeur de cas — transpile le TS à la volée (esbuild) et rend les VRAIS
// objets JavaScript.
//
// POURQUOI : jusqu'ici les validateurs relisaient seedCases.ts comme du TEXTE
// et ne pouvaient donc contrôler qu'une poignée de motifs sur les cas déjà
// intégrés. En chargeant réellement les données, tout contrôle structurel
// devient possible sur l'ensemble du corpus, et pas seulement sur les bundles
// d'un lot en cours.
// ============================================================================
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Charge { cases, fachwissen, muster } depuis les sources TS. */
export async function loadAll() {
  const dir = mkdtempSync(join(tmpdir(), 'fsp-load-'));
  const entry = join(dir, 'entry.ts');
  writeFileSync(entry, `
    export { seedCases } from ${JSON.stringify(join(root, 'src/data/seedCases.ts'))};
    export { seedFachwissen } from ${JSON.stringify(join(root, 'src/data/seedFachwissen.ts'))};
    export { CASE_MUSTER } from ${JSON.stringify(join(root, 'src/data/caseMuster.ts'))};
  `);
  const out = join(dir, 'bundle.mjs');
  await build({
    entryPoints: [entry], outfile: out, bundle: true, format: 'esm', platform: 'node',
    logLevel: 'silent',
    // Les fichiers de données n'importent que des TYPES depuis @/db/types ;
    // on neutralise l'alias pour ne pas embarquer toute l'app.
    plugins: [{
      name: 'stub-alias',
      setup(b) {
        b.onResolve({ filter: /^@\// }, () => ({ path: 'stub', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export default {};', loader: 'js' }));
      },
    }],
  });
  const mod = await import(pathToFileURL(out).href + '?t=' + Date.now());
  rmSync(dir, { recursive: true, force: true });
  const cases = mod.seedCases();
  const fachwissen = mod.seedFachwissen();
  const muster = mod.CASE_MUSTER;
  // Rattache les Muster au cas, comme le fait le seed.
  for (const c of cases) if (muster[c.id]) c.musterSaetze = muster[c.id];
  return { cases, fachwissen, muster };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cases, fachwissen } = await loadAll();
  console.log(`${cases.length} cas, ${fachwissen.length} fiches Fachwissen chargés.`);
  console.log('exemple :', cases[0].id, '—', cases[0].name);
}
