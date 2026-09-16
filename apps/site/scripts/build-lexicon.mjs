#!/usr/bin/env node
// STUB — remplacé en T1.5 (génère scripts/no-promise.lexicon.json depuis docs/brand/voice.md §6).
// Reste vert en prebuild tant que T1.5 n'est pas fait ; --check échoue explicitement
// pour ne jamais faire croire à une génération qui n'existe pas encore.
if (process.argv.includes('--check')) {
  console.error('✗ not implemented (T1.5)');
  process.exit(1);
} else {
  process.exit(0);
}
