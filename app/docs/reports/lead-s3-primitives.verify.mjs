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

const BASE = process.env.BASE ?? 'http://localhost:4317';
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
    // Les requêtes que la sonde coupe ELLE-MÊME (fonte rsms.me) remontent en
    // console « net::ERR_FAILED » sans URL : on les compte pour les décompter,
    // plutôt que de lire un faux KO à chaque passage.
    let selfAborted = 0;
    page.on('requestfailed', (r) => { if (/rsms\.me/.test(r.url())) selfAborted++; else errs.push(`FAILED ${r.url()} ${r.failure()?.errorText}`); });

    const tag = `${theme}-${vp.name}`;
    report.measures[tag] = {};
    // Le build emploie un routeur a HASH (mesure : les <Link> rendent
    // href="#/fachbegriffe"). Un  profond casse les assets en base
    // relative, et un pushState ne dit rien a ce routeur : on change le hash.
    const go = (p) => page.evaluate((path) => { location.hash = '#' + path; }, p);

    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    // Premier chargement a froid : Dexie s'amorce. On attend le CONTENU, pas
    // un delai — sinon la premiere combinaison mesure une page vide.
    // Le Supabase local (partagé, propriété de `main`) renvoie par moments un
    // 503 au premier `content?since=0` : l'app affiche alors sa carte « besoin
    // d'une connexion » — qui est une `.card`, donc attendre `.card` ne suffit
    // pas. On attend la NAVIGATION, et on use du bouton « Réessayer » de l'app.
    for (let i = 0; i < 4; i++) {
      await page.waitForSelector('a[href$="#/fachbegriffe"], button:has-text("Réessayer")', { timeout: 60000 }).catch(() => {});
      const retry = page.locator('button:has-text("Réessayer")');
      if (!(await retry.count())) break;
      await page.waitForTimeout(1500);
      await retry.first().click().catch(() => {});
    }
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

    // ── FLOU RENDU, mesuré en PIXELS (fix-s3 B1) ─────────────────────────────
    // `getComputedStyle().backdropFilter` dit `blur(16px)` même quand rien ne
    // floute : un ancêtre portant `view-transition-name` devient une « backdrop
    // root » et la carte n'échantillonne plus le fond du body. Seul le rendu
    // tranche. On vide la carte de son contenu (visibility, pas display : la
    // boîte ne bouge pas), on capture un recadrage intérieur, et on mesure
    // l'écart-type de luminance : la grille du body y passe NETTE sans flou,
    // lissée avec. Témoin : le même recadrage avec le nom forcé sur l'ancêtre.
    const lumStd = async (sel) => {
      const box = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        el.classList.add('probe-hollow');
        const r = el.getBoundingClientRect();
        const m = 14; // hors bordure, hors rayon
        return { x: r.left + m, y: r.top + m, width: Math.min(r.width - 2 * m, 320), height: Math.min(r.height - 2 * m, 160) };
      }, sel);
      if (!box || box.width < 20 || box.height < 20) return null;
      await page.waitForTimeout(120);
      const b64 = (await page.screenshot({ clip: box })).toString('base64');
      return page.evaluate(async (data) => {
        const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + data)).blob());
        const c = new OffscreenCanvas(img.width, img.height);
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, img.width, img.height).data;
        const w = img.width, h = img.height;
        const L = new Float64Array(w * h);
        let sum = 0, sq = 0;
        for (let i = 0; i < w * h; i++) {
          const l = 0.2126 * px[4 * i] + 0.7152 * px[4 * i + 1] + 0.0722 * px[4 * i + 2];
          L[i] = l; sum += l; sq += l * l;
        }
        const mean = sum / (w * h);
        // Énergie de gradient : moyenne des |Δ| entre voisins. Un flou tue
        // d'abord les hautes fréquences (les lignes de la grille) ; l'écart-type
        // seul garde aussi la pente lente des radiaux, qui survit au flou.
        let gs = 0, gn = 0;
        for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
          const i = y * w + x;
          gs += Math.abs(L[i + 1] - L[i]) + Math.abs(L[i + w] - L[i]); gn += 2;
        }
        return { std: Math.sqrt(Math.max(0, sq / (w * h) - mean * mean)), grad: gs / gn };
      }, b64);
    };
    await page.addStyleTag({ content: '.probe-hollow > * { visibility: hidden !important; }' });
    // `expect` : 'blur' → au repos le flou doit lisser la grille nettement
    // mieux que le témoin ; 'same' → le nom ne doit RIEN changer au rendu.
    const blurCheck = async (where, sel, holder, name, expect = 'blur') => {
      // Une carte dont la boîte coupe le bord du viewport ne se capture pas entière.
      await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center', behavior: 'instant' }), sel);
      await page.waitForTimeout(200);
      const atRest = await lumStd(sel);
      await page.evaluate(([h, n]) => { const el = document.querySelector(h); if (el) el.style.viewTransitionName = n; }, [holder, name]);
      const forced = await lumStd(sel);
      await page.evaluate(([h, s]) => { const el = document.querySelector(h); if (el) el.style.viewTransitionName = ''; document.querySelector(s)?.classList.remove('probe-hollow'); }, [holder, sel]);
      report.measures[tag][`blur ${where}`] = { atRest, forced };
      if (atRest == null || forced == null) { fail(`${tag} ${where} : recadrage impossible (${sel})`); return; }
      const ratio = atRest.grad / forced.grad;
      const msg = `${tag} ${where} : gradient de luminance ${atRest.grad.toFixed(3)} au repos contre ${forced.grad.toFixed(3)} avec \`view-transition-name: ${name}\` sur ${holder} (ratio ${ratio.toFixed(2)}) · écart-type ${atRest.std.toFixed(3)} contre ${forced.std.toFixed(3)}`;
      if (expect === 'same') {
        if (Math.abs(ratio - 1) < 0.1) pass(msg + ' — le nom est sans effet sur ce flou');
        else fail(msg + ' — le nom change le rendu de ce verre');
      } else if (ratio < 0.7) pass(msg);
      else fail(msg + ' — la surface ne floute pas le fond');
    };
    await blurCheck('.card (accueil)', '.card', '.vt-page', 'page');

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

    // ── Le drill : `.seg` + le retournement. On y va par un VRAI lien du
    //    routeur (`viewTransition`), pas par le hash : c'est la seule façon de
    //    prouver que la transition de page s'anime encore depuis que le nom
    //    n'est posé que pendant elle (fix-s3 B1).
    const vt = await page.evaluate(async () => {
      const a = [...document.querySelectorAll('a[href$="#/fachbegriffe"], a[href$="/fachbegriffe"]')][0];
      if (!a) return { err: 'aucun lien /fachbegriffe' };
      const named = new Set();
      a.click();
      const t0 = performance.now();
      while (performance.now() - t0 < 400) {
        await new Promise((r) => requestAnimationFrame(r));
        for (const an of document.getAnimations()) if (an.effect?.pseudoElement) named.add(an.effect.pseudoElement + ':' + an.animationName);
        if (document.documentElement.matches(':active-view-transition')) named.add('html:active-view-transition');
      }
      // Le nom doit disparaître avec la transition — sinon on a déplacé le
      // défaut au lieu de le corriger. On attend la fin réelle.
      const t1 = performance.now();
      while (document.documentElement.matches(':active-view-transition') && performance.now() - t1 < 3000) {
        await new Promise((r) => requestAnimationFrame(r));
      }
      const after = getComputedStyle(document.querySelector('.vt-page')).viewTransitionName;
      return { named: [...named], after };
    });
    report.measures[tag].pageTransition = vt;
    if (vt.err) fail(`${tag} transition de page : ${vt.err}`);
    else if (vt.named.some((x) => /view-transition-new\(page\):vt-page-in/.test(x)) && vt.named.some((x) => /view-transition-old\(page\):vt-page-out/.test(x)))
      pass(`${tag} transition de page : vt-page-out + vt-page-in joués sur ::view-transition-*(page) ; nom au repos après coup « ${vt.after} »`);
    else fail(`${tag} transition de page : animations vues ${JSON.stringify(vt.named)}`);
    if (vt.after && vt.after !== 'none') fail(`${tag} : le nom « ${vt.after} » reste posé après la transition`);
    await go('/fachbegriffe/drill');
    await page.waitForSelector('.seg', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    // La barre du haut est elle-même du verre et porte `app-chrome` en permanence.
    // Elle garde son nom en permanence : la sonde prouve que, sur SON flou à
    // elle, ce nom ne change rien (une backdrop root borne ses DESCENDANTS).
    await blurCheck('.glass (barre du haut, drill)', '.glass.sticky', '.glass.sticky', 'none', 'same');
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
    let skip = selfAborted;
    const jsErrs = errs.filter((e) => !/^HTTP/.test(e)).filter((e) => !(/net::ERR_FAILED/.test(e) && !/^FAILED/.test(e) && skip-- > 0));
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
