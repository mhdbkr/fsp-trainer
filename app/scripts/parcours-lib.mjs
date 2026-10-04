// ============================================================================
// Infrastructure du candidat synthétique (C6) — rien de métier ici.
//   · trouver Playwright, servir un BUILD (jamais le dev server de main),
//   · refuser tout Supabase qui ne soit pas local,
//   · chauffer l'Edge Function de contenu,
//   · les sondes qui lisent l'app DEPUIS SON DOM et sa base IndexedDB.
//
// Règle de mesure (CLAUDE.md) : aucune sonde ne fait `import('/src/…')` — ce
// serait une SECONDE instance de module, qui recalcule sa propre réponse au
// lieu d'observer celle de l'app. On lit le DOM rendu, et les object stores que
// l'app a remplis, par l'API IndexedDB native.
// ============================================================================
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

/** Playwright : `PLAYWRIGHT_CORE` (chemin du paquet), sinon le paquet du projet. */
export async function loadChromium(appDir) {
  const tries = [];
  if (process.env.PLAYWRIGHT_CORE) tries.push(path.join(process.env.PLAYWRIGHT_CORE, 'index.mjs'));
  const req = createRequire(path.join(appDir, 'package.json'));
  for (const name of ['playwright-core', 'playwright']) {
    try { tries.push(req.resolve(name)); } catch { /* absent */ }
  }
  for (const t of tries) {
    try { return (await import(pathToFileURL(t).href)).chromium; } catch { /* suivant */ }
  }
  throw new Error(
    'Playwright introuvable. Passe PLAYWRIGHT_CORE=<dossier de playwright-core> (ex. celui du cache npx), '
    + 'ou installe-le HORS du dépôt : npm i --no-save playwright-core && npx playwright install chromium.',
  );
}

/** « Jamais la prod » : l'URL Supabase du build doit être locale. */
export function assertLocalSupabase(url) {
  let h;
  try { h = new URL(url).hostname; } catch { throw new Error(`VITE_SUPABASE_URL illisible : « ${url} »`); }
  if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(h) && !h.endsWith('.localhost')) {
    throw new Error(`REFUS : VITE_SUPABASE_URL (${h}) n'est pas local. Le candidat synthétique ne joue jamais contre la prod.`);
  }
}

/** Charge un fichier .env minimal (KEY=VALUE) SANS l'afficher ni l'écrire. */
export function readEnvFile(file) {
  const out = {};
  for (const l of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

export function buildApp(appDir, env) {
  const r = spawnSync('npm', ['run', 'build'], { cwd: appDir, env: { ...process.env, ...env }, encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`npm run build → ${r.status}\n${(r.stdout ?? '').slice(-1500)}${(r.stderr ?? '').slice(-1500)}`);
}

/**
 * `vite preview` sur le build. Un 200 ne dit PAS que le serveur sert CE dist : avec `--strictPort`, si le port est
 * déjà pris, NOTRE serveur meurt et le `fetch` tombe sur celui d'un autre (un dev server, un autre worktree, un
 * build contre la prod). Trois gardes : notre processus doit être vivant, l'`index.html` servi doit être
 * identique à `dist/index.html`, et aucun `dist/assets/*.js` ne contient d'hôte `*.supabase.co` (build prod).
 */
export async function startPreview(appDir, port) {
  const child = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { cwd: appDir, stdio: 'ignore', detached: true });
  const base = `http://127.0.0.1:${port}`;
  const stop = () => { try { process.kill(-child.pid); } catch { /* déjà mort */ } };
  const dist = path.join(appDir, 'dist');
  let sorti = null;
  child.on('exit', (code) => { sorti = code ?? -1; });
  try {
    if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html absent : lance sans --no-build');
    const assets = fs.existsSync(path.join(dist, 'assets')) ? fs.readdirSync(path.join(dist, 'assets')).filter((f) => f.endsWith('.js')) : [];
    for (const f of assets) {
      if (/[a-z0-9-]+\.supabase\.(co|in)\b/i.test(fs.readFileSync(path.join(dist, 'assets', f), 'utf8'))) {
        throw new Error(`REFUS : dist/assets/${f} contient un hôte *.supabase.co — ce build vise la PROD. Reconstruis contre le Supabase local.`);
      }
    }
    for (let i = 0; i < 60; i++) {
      if (sorti !== null) throw new Error(`vite preview s'est arrêté (code ${sorti}) : le port ${port} est pris par un autre serveur`);
      try {
        const r = await fetch(base, { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
          if (sorti !== null) throw new Error(`le port ${port} est servi par un AUTRE processus (vite preview est mort)`);
          if ((await r.text()) !== fs.readFileSync(path.join(dist, 'index.html'), 'utf8')) throw new Error(`REFUS : ${base} ne sert pas ce dist (index.html différent)`);
          return { base, stop };
        }
      } catch (e) { if (/REFUS|AUTRE processus|arrêté/.test(e.message)) throw e; }
      await sleep(500);
    }
    throw new Error(`vite preview injoignable sur ${base}`);
  } catch (e) { stop(); throw e; }
}

/** L'Edge Function de contenu boote à froid (546/502 au premier appel) : on la chauffe. */
export async function warmContent(supabaseUrl, anonKey) {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/content?since=0`, { headers: { Authorization: `Bearer ${anonKey}` }, signal: AbortSignal.timeout(15000) });
      if (r.ok) return;
    } catch { /* froid */ }
    await sleep(1500);
  }
  throw new Error('Supabase local injoignable ou fonction « content » froide (supabase functions serve ?). Rien n\'a été lancé ni arrêté.');
}

// --- sondes ------------------------------------------------------------------

/** Lit un object store de la base QUE L'APP OUVRE (compte actif, db.ts), par l'API native. */
export function idb(page, store) {
  return page.evaluate(async (s) => {
    const uid = localStorage.getItem('fsp.activeUserId');
    const name = uid ? `fsp-cockpit-${uid}` : 'fsp-cockpit';
    return await new Promise((res, rej) => {
      const rq = indexedDB.open(name);
      rq.onerror = () => rej(rq.error);
      rq.onsuccess = () => {
        const d = rq.result;
        if (!d.objectStoreNames.contains(s)) { d.close(); return res([]); }
        const g = d.transaction(s, 'readonly').objectStore(s).getAll();
        g.onsuccess = () => { res(g.result); d.close(); };
        g.onerror = () => { d.close(); rej(g.error); };
      };
    });
  }, store);
}

export const meta = async (page, key) => (await idb(page, 'meta')).find((m) => m.key === key)?.value;

/** Lignes de tâche RENDUES, dans l'ordre du DOM (Programme ou Accueil). */
export const rows = (page) => page.evaluate(() => [...document.querySelectorAll('div.rounded-xl.border.transition-colors')].map((r) => ({
  label: (r.querySelector('.font-medium')?.textContent ?? '').trim(),
  fait: !r.querySelector('[title="Marquer faite"]'),
  cta: (r.querySelector('a.btn-primary')?.textContent ?? '').trim(),
  min: Number((r.querySelector('.mono-tag')?.textContent ?? '').replace(/\D/g, '')) || 0,
  pourquoi: (r.querySelector('[title].truncate')?.getAttribute('title') ?? ''),
})));

/** « 3/7 faits · 119 min prévues » tel qu'il est RENDU. */
export const barre = (page) => page.evaluate(() => {
  const m = document.body.innerText.match(/(\d+)\/(\d+) faits? · (\d+) min prévues/);
  return m ? { done: +m[1], total: +m[2], min: +m[3] } : null;
});

/** Le titre du hero « Session du jour » (Accueil). */
export const hero = (page) => page.evaluate(() => {
  const e = [...document.querySelectorAll('div')].find((x) => x.children.length <= 1 && (x.textContent || '').trim().startsWith('Session du jour'));
  const h2 = e?.parentElement?.querySelector('h2');
  return h2 ? h2.textContent.trim() : null;
});

export const texte = (page) => page.evaluate(() => (document.querySelector('main') ?? document.body).innerText);

/** Attend qu'une condition évaluée DANS la page soit vraie. */
export async function until(page, fn, label, ms = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await page.evaluate(fn).catch(() => null);
    if (v) return v;
    await sleep(150);
  }
  throw new Error(`timeout : ${label}`);
}
