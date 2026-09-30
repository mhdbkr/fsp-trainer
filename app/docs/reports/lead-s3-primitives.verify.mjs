// Vérification navigateur du chantier s3-primitives, mesurée DEPUIS LE DOM DE L'APP.
// Aucun `import("/src/…")` : tout vient de getComputedStyle sur les vrais noeuds rendus.
//
// Deux contraintes d'environnement, résolues plutôt que contournées :
//  · le build est en base relative (Pages) — un `goto` profond casse les assets.
//    On charge `/` une fois, puis on navigue PAR LE ROUTEUR DE L'APP
//    (pushState + popstate, ce que React Router écoute).
//  · le playwright livré avec playwright-cli attend la révision 1237 ; la
//    machine a la 1243. On pointe l'exécutable installé.
import pw from '/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.js';
const { chromium } = pw;
import fs from 'node:fs';

const BASE = 'http://localhost:4317';
const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: '390', width: 390, height: 844, mobile: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false },
];
const THEMES = ['light', 'dark'];

/** Couches d'un box-shadow, découpées hors parenthèses. */
const layers = (v) => {
  const out = []; let d = 0, cur = '';
  for (const c of v) {
    if (c === '(') d++; if (c === ')') d--;
    if (c === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((l) => l && l !== 'none');
};

/**
 * Une couche est-elle une OMBRE PORTÉE au sens de la charte ?
 * Non si `inset` (filet interne). Non si transparente — Tailwind pose deux
 * couches vides `rgba(0,0,0,0) 0 0 0 0` pour ses variables `--tw-shadow` et
 * `--tw-ring-shadow`, elles ne peignent rien. Non si décalage ET flou sont
 * nuls : un `ring-*` est un BORD dessiné en spread, pas une ombre.
 */
const isDrop = (l) => {
  if (/\binset\b/.test(l)) return false;
  const alpha = l.startsWith('rgba(') ? parseFloat(l.slice(5).split(',')[3]) : 1;
  if (!alpha) return false;
  // parseFloat, pas Number : « 0px » donne NaN avec Number, et NaN !== 0
  // ferait passer pour une ombre les deux couches vides de Tailwind.
  const nums = (l.match(/-?[\d.]+px/g) || []).map(parseFloat);
  const [ox = 0, oy = 0, blur = 0] = nums;
  return ox !== 0 || oy !== 0 || blur !== 0;
};

const report = { gates: [], measures: {}, shots: [] };
const fail = (m) => { report.gates.push({ ok: false, m }); console.error('✗ ' + m); };
const pass = (m) => { report.gates.push({ ok: true, m }); console.log('✓ ' + m); };

const browser = await chromium.launch({ executablePath: '/Users/MehdiBoukari/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell' });

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.mobile, hasTouch: vp.mobile,
      deviceScaleFactor: 2, reducedMotion: 'no-preference',
    });
    await ctx.addInitScript((t) => { localStorage.setItem('fsp-theme', t); }, theme);
    // Le Supabase local est de nouveau debout (main, 30 sept.) : le contenu
    // vient du VRAI endpoint. Seule la fonte distante est coupee, pour que la
    // sonde ne depende pas du reseau public.
    await ctx.route('**rsms.me**', (r) => r.abort());
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });

    const tag = `${theme}-${vp.name}`;
    report.measures[tag] = {};
    // Le build emploie un routeur a HASH (mesure : les <Link> rendent
    // href="#/fachbegriffe"). Un  profond casse les assets en base
    // relative, et un pushState ne dit rien a ce routeur : on change le hash.
    const go = (p) => page.evaluate((path) => { location.hash = '#' + path; }, p);

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    // Premier chargement a froid : Dexie s'amorce. On attend le CONTENU, pas
    // un delai — sinon la premiere combinaison mesure une page vide.
    await page.waitForSelector('.card', { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(800);

    const shoot = async (sel, name) => {
      const el = page.locator(sel).first();
      if (!(await el.count())) { fail(`${tag} : ${sel} absent, pas de capture ${name}`); return; }
      await el.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(150);
      const f = `${OUT}/${name}-${tag}.png`;
      await el.screenshot({ path: f }).catch(async () => { await page.screenshot({ path: f }); });
      report.shots.push(f);
    };

    const pick = (sel) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const cs = getComputedStyle(el);
      return { sel: s, bg: cs.backgroundColor, backdrop: cs.backdropFilter || cs.webkitBackdropFilter,
        borderTop: cs.borderTopColor, borderBottom: cs.borderBottomColor,
        radius: cs.borderTopLeftRadius, shadow: cs.boxShadow };
    }, sel);

    const scanShadows = async (where) => {
      const all = await page.evaluate(() => {
        const bad = [];
        for (const el of document.querySelectorAll('*')) {
          const cs = getComputedStyle(el);
          const cls = String(el.className?.baseVal ?? el.className ?? '').slice(0, 70);
          if (cs.boxShadow && cs.boxShadow !== 'none') bad.push({ sel: el.tagName.toLowerCase() + '.' + cls, v: cs.boxShadow, kind: 'box-shadow' });
          if (cs.filter && /drop-shadow/.test(cs.filter)) bad.push({ sel: el.tagName.toLowerCase() + '.' + cls, v: cs.filter, kind: 'filter' });
        }
        return bad;
      });
      const drops = all.filter((s) => (s.kind === 'filter' ? true : layers(s.v).some(isDrop)));
      if (drops.length) fail(`${tag} ${where} : ${drops.length} ombre(s) portée(s) — ` + JSON.stringify(drops.slice(0, 4)));
      else pass(`${tag} ${where} : 0 ombre portée (${all.length} box-shadow rendus, tous internes ou bords)`);
      return drops;
    };

    await scanShadows('accueil');

    const alpha = (c) => (c.startsWith('rgba(') ? parseFloat(c.slice(5).split(',')[3]) : 1);
    for (const n of ['glass', 'card']) {
      const m = await pick('.' + n);
      report.measures[tag][n] = m;
      if (!m) { fail(`${tag} : aucun \`.${n}\` rendu sur /`); continue; }
      if (alpha(m.borderTop) > alpha(m.borderBottom)) pass(`${tag} .${n} : filet supérieur plus clair (${m.borderTop} > ${m.borderBottom})`);
      else fail(`${tag} .${n} : filet supérieur pas plus clair (${m.borderTop} vs ${m.borderBottom})`);
      if (/blur/.test(m.backdrop || '')) pass(`${tag} .${n} : flou rendu — ${m.backdrop}`);
      else fail(`${tag} .${n} : pas de flou rendu (${m.backdrop})`);
      await shoot('.' + n, n);
    }

    // ── `.panel` ne vit pas sur l'accueil. On ouvre le tiroir Doctopus, qui en
    //    empile plusieurs (suggestions, historique) et porte `.input`.
    const fab = page.locator('button[aria-label="Ouvrir Doctopus"]');
    if (await fab.count()) {
      //  ne s'arrete jamais : Playwright ne verra jamais ce
      // bouton « stable ». C'est le mouvement qui est correct, pas la sonde.
      await fab.click({ force: true });
      await page.waitForTimeout(800);
      const m = await pick('.panel');
      report.measures[tag].panel = m;
      if (!m) fail(`${tag} : aucun \`.panel\` rendu dans le tiroir Doctopus`);
      else {
        pass(`${tag} .panel : fond ${m.bg}, rayon ${m.radius}, ombre « ${m.shadow} »`);
        if (/blur/.test(m.backdrop || '')) fail(`${tag} .panel : FLOU rendu (${m.backdrop}) — un aplat ne floute pas`);
        else pass(`${tag} .panel : aucun flou (règle « pas de verre dans du verre »)`);
        if (layers(m.shadow).some(isDrop)) fail(`${tag} .panel : ombre portée (${m.shadow})`);
      }
      await shoot('.panel', 'panel');
      const inp = await pick('.input');
      report.measures[tag].input = inp;
      if (inp) pass(`${tag} .input : fond ${inp.bg}, flou ${inp.backdrop}`);
      else fail(`${tag} : aucun \`.input\` dans le tiroir Doctopus`);
      await scanShadows('tiroir Doctopus');
      await shoot('.input', 'input');
      await page.locator('button[aria-label="Fermer Doctopus"]').click({ force: true });
      await page.waitForTimeout(600);
      if (await page.locator('button[aria-label="Fermer Doctopus"]').count()) fail(`${tag} : le tiroir Doctopus ne se ferme pas`);
      else pass(`${tag} : le tiroir Doctopus se ferme par son bouton nomme`);
    } else fail(`${tag} : bouton Doctopus introuvable`);

    // ── `.btn-glass` n'a AUCUN appelant dans l'app (mesuré : 0 occurrence en
    //    .tsx). Pour le voir rendu, on greffe un bouton dans le DOM VIVANT :
    //    cascade, jetons et thème sont ceux de l'app, seul le noeud est ajouté.
    await page.evaluate(() => {
      const host = document.createElement('div');
      host.id = 'probe-btn-glass';
      host.style.cssText = 'position:fixed;left:16px;top:140px;z-index:9999;display:flex;gap:8px;padding:10px';
      for (const [txt, on] of [['Entrer dans un Teil', false], ['Teil 1', true]]) {
        const b = document.createElement('button');
        b.className = 'btn-glass';
        b.textContent = txt;
        if (on) b.setAttribute('aria-pressed', 'true');
        host.appendChild(b);
      }
      document.body.appendChild(host);
    });
    await page.waitForTimeout(150);
    const bg = await pick('#probe-btn-glass .btn-glass');
    report.measures[tag].btnGlass = bg;
    if (layers(bg.shadow).some(isDrop)) fail(`${tag} .btn-glass : ombre portée (${bg.shadow})`);
    else pass(`${tag} .btn-glass : « ${bg.shadow} » interne, filet haut ${bg.borderTop} > bord ${bg.borderBottom}, flou ${bg.backdrop}`);
    if (!(alpha(bg.borderTop) > alpha(bg.borderBottom))) fail(`${tag} .btn-glass : filet supérieur pas plus clair`);
    await shoot('#probe-btn-glass', 'btn-glass');
    await page.evaluate(() => document.getElementById('probe-btn-glass')?.remove());

    // ── Le drill : `.seg` + le retournement.
    await go('/fachbegriffe/drill');
    await page.waitForSelector('.seg', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    const seg = await page.evaluate(() => {
      const el = document.querySelector('.seg');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        bg: cs.backgroundColor, radius: cs.borderTopLeftRadius,
        btns: [...el.querySelectorAll('button')].map((b) => {
          const s = getComputedStyle(b);
          const r = b.getBoundingClientRect();
          return { txt: b.textContent.trim().slice(0, 24), pressed: b.getAttribute('aria-pressed'),
            bg: s.backgroundColor, color: s.color, shadow: s.boxShadow,
            h: Math.round(r.height), w: Math.round(r.width) };
        }),
      };
    });
    report.measures[tag].seg = seg;
    if (!seg) fail(`${tag} : aucun \`.seg\` sur /fachbegriffe/drill`);
    else {
      const on = seg.btns.find((b) => b.pressed === 'true');
      if (!on) fail(`${tag} .seg : aucun bouton aria-pressed="true"`);
      else if (layers(on.shadow).some(isDrop)) fail(`${tag} .seg actif : ombre portée (${on.shadow})`);
      else pass(`${tag} .seg : cran actif « ${on.txt} », fond ${on.bg}, ombre « ${on.shadow} » (interne)`);
      const small = seg.btns.filter((b) => b.h < 44);
      if (small.length) fail(`${tag} .seg : cible tactile < 44 px (${small.map((b) => b.h).join(', ')})`);
      else pass(`${tag} .seg : cibles ${seg.btns.map((b) => `${b.w}×${b.h}`).join(' / ')} px`);
      await shoot('.seg', 'seg');
      const other = page.locator('.seg > button[aria-pressed="false"]').first();
      if (await other.count()) {
        await other.evaluate((el) => el.click()); // clic DOM : pas de test de cible
        await page.waitForTimeout(90);
        await page.locator('.seg').first().screenshot({ path: `${OUT}/seg-transition-${tag}.png` });
        report.shots.push(`${OUT}/seg-transition-${tag}.png`);
        await page.waitForTimeout(400);
        const after = await page.evaluate(() => [...document.querySelectorAll('.seg > button')].map((b) => b.getAttribute('aria-pressed')));
        if (after.filter((a) => a === 'true').length === 1) pass(`${tag} .seg : la bascule laisse exactement un cran pressé (${after.join(',')})`);
        else fail(`${tag} .seg : après bascule, aria-pressed = ${after.join(',')}`);
      }
    }
    await scanShadows('drill');
    await shoot('main', 'drill');

    const httpErrs = errs.filter((e) => /^HTTP/.test(e));
    const jsErrs = errs.filter((e) => !/^HTTP/.test(e));
    if (jsErrs.length) fail(`${tag} : ${jsErrs.length} erreur(s) JS — ${jsErrs.slice(0, 2).join(' || ')}`);
    else pass(`${tag} : aucune erreur JS`);
    if (httpErrs.length) fail(`${tag} : ${httpErrs.length} requête(s) en échec — ${httpErrs.slice(0, 2).join(' || ')}`);
    else pass(`${tag} : aucune requête en échec`);

    await ctx.close();
  }
}
await browser.close();

fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
const bad = report.gates.filter((g) => !g.ok);
console.log(`\n${report.gates.length - bad.length} OK / ${bad.length} KO · ${report.shots.length} captures → ${OUT}`);
process.exit(bad.length ? 1 : 0);
