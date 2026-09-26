// app/scripts/registerLots.mjs
// Production du double registre par lots (F3 §3.2)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkEntry } from './checkTermRegister.mjs';

export function nextLot(fb, links, size = 100) {
  const count = new Map();
  const casesOf = new Map();

  for (const [caseId, ids] of Object.entries(links)) {
    for (const id of ids) {
      count.set(id, (count.get(id) ?? 0) + 1);
      if (!casesOf.has(id)) {
        casesOf.set(id, []);
      }
      casesOf.get(id).push(caseId);
    }
  }

  return fb
    .filter((e) => !e.r && count.has(e.id))
    .sort((a, b) => {
      const countDiff = count.get(b.id) - count.get(a.id);
      if (countDiff !== 0) return countDiff;
      return a.id < b.id ? -1 : 1;
    })
    .slice(0, size)
    .map((e) => ({
      id: e.id,
      t: e.t,
      s: e.s,
      def: e.def,
      sp: e.sp,
      cases: casesOf.get(e.id)
    }));
}

// Find sample from seed files (line-based read, never loads whole file)
function findSample(term, seedDir) {
  const seedFiles = ['seed.ts', 'seedCases.ts', 'seedAufklaerungen.ts', 'seedFachwissen.ts', 'seedGuides.ts', 'caseMuster.ts'];
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])(${escapedTerm})(e|en|n|s|es)?(?![\\p{L}\\p{N}])`, 'iu');

  for (const file of seedFiles) {
    const filePath = join(seedDir, file);
    try {
      const sample = findLineInFileSync(filePath, regex);
      if (sample) return sample;
    } catch (err) {
      // File may not exist or be readable, continue to next
    }
  }
  return null;
}

function findLineInFileSync(filePath, regex) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (regex.test(line)) {
        // Look for quoted strings in the line
        const stringMatches = line.match(/'([^']*)'|"([^"]*)"/g);
        if (stringMatches) {
          for (const match of stringMatches) {
            const quoted = match.slice(1, -1); // Remove quotes
            if (regex.test(quoted)) {
              return quoted.slice(0, 200); // Trim to 200 chars
            }
          }
        }
      }
    }
  } catch (err) {
    // Ignore read errors
  }
  return null;
}

export function serialize(fb) {
  return JSON.stringify(fb);
}

const currentFile = fileURLToPath(import.meta.url);
if (currentFile.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  const here = dirname(fileURLToPath(import.meta.url));
  const fbPath = join(here, '../src/data/fachbegriffe.json');
  const seedDir = join(here, '../src/data');

  const fb = JSON.parse(readFileSync(fbPath, 'utf8'));
  const [cmd, arg] = process.argv.slice(2);

  if (cmd === 'next') {
    const size = process.argv.includes('--size') ? Number(process.argv[process.argv.indexOf('--size') + 1]) : 100;
    const links = JSON.parse(readFileSync(join(here, '../src/data/caseTermLinks.json'), 'utf8'));
    const lot = nextLot(fb, links, size);

    // Add samples from seed files
    for (const entry of lot) {
      const sample = findSample(entry.t, seedDir);
      if (sample) {
        entry.sample = sample;
      }
    }

    mkdirSync(join(here, '../scratchpad'), { recursive: true });
    writeFileSync(join(here, '../scratchpad/register-lot.json'), JSON.stringify(lot, null, 2));

    const specialties = new Set(lot.map((e) => e.sp));
    const withSample = lot.filter((e) => e.sample).length;
    console.log(`lot : ${lot.length} termes → scratchpad/register-lot.json (${specialties.size} spécialités, ${withSample} avec sample)`);
  } else if (cmd === 'apply') {
    const patchPath = arg;
    const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
    const byId = new Map(fb.map((e) => [e.id, e]));

    let bad = 0;
    for (const [id, r] of Object.entries(patch)) {
      const e = byId.get(id);
      if (!e) {
        console.error(`✗ id inconnu ${id}`);
        bad++;
        continue;
      }

      const errs = checkEntry({ t: e.t, r });
      if (errs.length) {
        console.error(`✗ ${id} : ${errs.join(', ')}`);
        bad++;
        continue;
      }

      e.r = {
        pa: r.pa.trim(),
        vo: r.vo.trim(),
        an: r.an.trim()
      };
    }

    if (bad) {
      console.error(`❌ ${bad} entrée(s) refusée(s) — rien écrit`);
      process.exit(1);
    }

    writeFileSync(fbPath, serialize(fb));
    console.log(`✓ ${Object.keys(patch).length} registres appliqués`);
  } else {
    console.error('usage: registerLots.mjs next [--size N] | apply <patch.json>');
    process.exit(2);
  }
}
