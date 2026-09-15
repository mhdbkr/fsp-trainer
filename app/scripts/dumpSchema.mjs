// docs/contracts/schema.sql est GÉNÉRÉ depuis les migrations — ne pas éditer à la main.
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
const sql = execSync('npx supabase db dump --local --schema public', { encoding: 'utf8', maxBuffer: 64e6 });
mkdirSync('../docs/contracts', { recursive: true });
writeFileSync('../docs/contracts/schema.sql', `-- GÉNÉRÉ par app/scripts/dumpSchema.mjs (supabase db dump --local --schema public) — ne pas éditer\n${sql}`);
console.log('docs/contracts/schema.sql écrit');
