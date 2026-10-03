// Bac à sable des tests de MUTATION (revue série 3, M2) : une copie de
// travail de `app/src` et `app/scripts`, `node_modules` lié. Une mutation
// n'écrit jamais dans le dépôt — un SIGKILL au milieu d'un test laisse un
// dossier temporaire sale, jamais `seedCases.ts` muté.
import { cpSync, mkdtempSync, rmSync, symlinkSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const app = join(dirname(fileURLToPath(import.meta.url)), '..');

export function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'fsp-mut-'));
  cpSync(join(app, 'src'), join(root, 'src'), { recursive: true });
  cpSync(join(app, 'scripts'), join(root, 'scripts'), { recursive: true });
  symlinkSync(join(app, 'node_modules'), join(root, 'node_modules'));
  const path = (rel) => join(root, rel);
  return {
    path,
    run: (script, ...args) => spawnSync(process.execPath, [path(`scripts/${script}`), ...args], { encoding: 'utf8' }),
    /** Applique `from → to` à `rel` le temps de `fn`, puis restaure. */
    mutate(rel, from, to, fn) {
      const file = path(rel);
      const before = readFileSync(file, 'utf8');
      assert.ok(before.includes(from), `ancre introuvable dans ${rel} : ${from}`);
      try { writeFileSync(file, before.replace(from, to)); return fn(); } finally { writeFileSync(file, before); }
    },
    read: (rel) => readFileSync(path(rel), 'utf8'),
    dispose: () => rmSync(root, { recursive: true, force: true }),
  };
}
