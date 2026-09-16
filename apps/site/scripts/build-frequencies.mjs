#!/usr/bin/env node
// STUB — remplacé en T1.1 (génère src/data/frequencies.json depuis ANALYSE.md §3).
// Reste vert en prebuild tant que T1.1 n'est pas fait ; --check échoue explicitement
// pour ne jamais faire croire à une génération qui n'existe pas encore.
if (process.argv.includes('--check')) {
  console.error('✗ not implemented (T1.1)');
  process.exit(1);
} else {
  process.exit(0);
}
