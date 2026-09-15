// app/scripts/testRls.mjs — lance les tests d'intégration avec les clés du Supabase local
import { execSync } from 'node:child_process';
const status = execSync('npx supabase status -o env', { encoding: 'utf8' });
const env = Object.fromEntries(status.split('\n').filter((l) => l.includes('=')).map((l) => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; }));
process.env.SUPABASE_URL = env.API_URL;
process.env.SUPABASE_ANON_KEY = env.ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
execSync('npx vitest run --dir supabase/tests --environment node', { stdio: 'inherit', env: process.env });
