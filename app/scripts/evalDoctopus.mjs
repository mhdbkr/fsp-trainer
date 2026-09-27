// ============================================================================
// Évaluation de Doctopus (FB2-M4) — le prompt système se juge sur un jeu de
// référence, pas à l'œil. 20 questions (evals/doctopus.reference.json), une
// grille MÉCANIQUE par question (langue, longueur, article, « Sag es so »,
// registres, absence de Fachbegriff en reformulation patient, refus hors
// sujet, pas de disclaimer/d'introduction). Score = questions qui passent
// toutes leurs règles. Seuil : 16/20.
//
// Usage : OPENROUTER_API_KEY=sk-or-… node scripts/evalDoctopus.mjs [--model liquid/lfm-2.5-2.6b:free] [--dry]
//         GROQ_API_KEY=… GEMINI_API_KEY=… node scripts/evalDoctopus.mjs --chain groq:llama-3.3-70b-versatile
//   --dry : valide le jeu et la grille sans appel réseau (CI).
//   --chain <spec> : rejoue le jeu sur la chaîne serveur (_shared/aiChain.ts), même grille, seuil 16/20.
// La clé n'est jamais lue ailleurs que dans l'environnement.
// ============================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { build } from 'esbuild';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const model = args.includes('--model') ? args[args.indexOf('--model') + 1] : undefined;
const set = JSON.parse(readFileSync(join(root, 'evals', 'doctopus.reference.json'), 'utf8'));

// Le prompt système, chargé depuis la source (esbuild) — pas de copie.
const dir = mkdtempSync(join(tmpdir(), 'fsp-eval-'));
writeFileSync(join(dir, 'entry.ts'), `export { DOCTOPUS_SYSTEM } from ${JSON.stringify(join(root, 'src/lib/dictionary.ts'))};\nexport { PROVIDERS, OPENROUTER_FALLBACKS } from ${JSON.stringify(join(root, 'src/lib/aiModels.ts'))};\nexport { openStream, parseChain, sseDeltas } from ${JSON.stringify(join(root, 'supabase/functions/_shared/aiChain.ts'))};`);
await build({ entryPoints: [join(dir, 'entry.ts')], outfile: join(dir, 'b.mjs'), bundle: true, format: 'esm', platform: 'node', logLevel: 'silent',
  plugins: [{ name: 'alias', setup(b) { b.onResolve({ filter: /^@\// }, (a) => ({ path: join(root, 'src', a.path.slice(2)) + (a.path.endsWith('.ts') ? '' : '.ts') })); } }] });
const { DOCTOPUS_SYSTEM, PROVIDERS, OPENROUTER_FALLBACKS, openStream, parseChain, sseDeltas } = await import(pathToFileURL(join(dir, 'b.mjs')).href);
// Modèle et repli = ceux de l'app, sauf --model.
const appModel = PROVIDERS.find((p) => p.id === 'openrouter')?.model;
rmSync(dir, { recursive: true, force: true });

const INTRO = /^(gerne|gern|natürlich|klar|gute frage|sehr gerne|avec plaisir|bien sûr|volontiers)\b/i;
const DISCLAIMER = /kein arzt|keine medizinische beratung|konsultieren sie|wenden sie sich an|je ne suis pas médecin|consultez/i;
const ARTICLE = /\b(der|die|das)\s+[A-ZÄÖÜ][a-zäöüß-]+/i;
const tokensOf = (t) => new Set(t.toLowerCase().replace(/[^a-zäöüßàâçéèêëîïôûùüÿ ]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
function grade(item, text) {
  const e = item.expect; const fails = [];
  const lines = text.split('\n').filter((l) => l.trim()).length;
  if (e.maxLines && lines > e.maxLines) fails.push(`${lines} lignes > ${e.maxLines}`);
  // Le point 16 : pas plus long. Un mur de mots sur une ligne ne passe pas : ~22 mots par ligne autorisée.
  const words = text.split(/\s+/).length;
  if (e.maxLines && words > e.maxLines * 22) fails.push(`${words} mots pour ${e.maxLines} lignes`);
  if (INTRO.test(text.trim())) fails.push('introduction');
  if (DISCLAIMER.test(text)) fails.push('disclaimer');
  if (e.article && !ARTICLE.test(text)) fails.push('pas d’article');
  if (e.french === true && !/🇫🇷|\b(c’est|c'est|est|sont|dans|pour|avec|une|qui|que)\b.*\b(le|la|les|des|du)\b/.test(text)) fails.push('pas de français attendu');
  if (e.french === false && /🇫🇷/.test(text)) fails.push('🇫🇷 rituel sur question allemande');
  if (e.sagEsSo) {
    const m = text.match(/(?:sag es so|dis-le ainsi|so sagst du)[^«„"]*(?:«([^»]*)»|„([^“]*)“|"([^"]*)")/i);
    const said = (m && (m[1] ?? m[2] ?? m[3]))?.trim();
    if (!said) fails.push('pas de phrase prête à dire');
    else if (tokensOf(said).size && [...tokensOf(said)].every((w) => tokensOf(item.q).has(w))) fails.push('la phrase à dire recopie la question');
  }
  if (e.register && !/\[patient\]|\[arzt|patient(en)?sprache|fachsprache|für den patienten|für die jury|dem prüfer/i.test(text)) fails.push('registres non distingués');
  // La reformulation patient = la phrase citée après « Sag es so » (la nuance
  // qui suit a le droit de nommer le Fachbegriff pour l'expliquer).
  if (e.noFach) { const m = text.match(/(?:sag es so|dis-le ainsi)[^«„"]*(?:«([^»]*)»|„([^“]*)“|"([^"]*)")/i); const body = m ? (m[1] ?? m[2] ?? m[3]) : text; for (const w of e.noFach) if (body.includes(w)) fails.push(`Fachbegriff « ${w} » dans la reformulation patient`); }
  if (e.mustMatch && !new RegExp(e.mustMatch, 'i').test(text)) fails.push(`attendu « ${e.mustMatch} »`);
  if (e.mustNotMatch && new RegExp(e.mustNotMatch, 'i').test(text)) fails.push(`interdit « ${e.mustNotMatch} »`);
  if (e.hedge && !/unsicher|nachschlagen|nachlesen|fachinformation|nicht sicher|dosierungstabelle|kinderarzt|apotheke|je ne suis pas sûr|à vérifier/i.test(text)) fails.push('pas de réserve sur un point incertain');
  if (e.refuse && !/(nicht|kein|nur|hors|pas)\b.{0,60}(fsp|prüfung|medizin|thema|sujet)/i.test(text)) fails.push('hors sujet non refusé');
  return fails;
}

if (dry) {
  for (const it of set) if (!it.id || !it.q || !it.expect) { console.log('❌ entrée invalide', it); process.exit(1); }
  const sample = grade(set[3], 'Ödeme sind Wassereinlagerungen.\nSag es so: [Patient] « Ihre Beine sind geschwollen, weil sich Wasser im Gewebe sammelt. »\nNuance: « Ödem » sagt man dem Patienten nicht.');
  console.log(`✅ Jeu de référence valide — ${set.length} questions ; grille OK (échantillon : ${sample.length ? sample.join(', ') : 'passe'}). Prompt : ${DOCTOPUS_SYSTEM.length} caractères.`);
  process.exit(0);
}

const chainSpec = args.includes('--chain') ? args[args.indexOf('--chain') + 1] : undefined;
async function askChain(q) {
  const { entry, body } = await openStream(parseChain(chainSpec), [{ role: 'system', content: DOCTOPUS_SYSTEM }, { role: 'user', content: q }], 1200, process.env);
  const reader = body.getReader(); const dec = new TextDecoder(); let buf = '', text = '';
  for (;;) { const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); const r = sseDeltas(buf); buf = r.rest; text += r.deltas.join(''); }
  return { text: text.trim(), model: `${entry.provider}:${entry.model}` };
}
if (chainSpec) {
  let pass = 0;
  // --pace <ms> : espace les appels comme un usage réel (quotas gratuits par minute).
  const pace = args.includes('--pace') ? Number(args[args.indexOf('--pace') + 1]) : 0;
  for (const it of set) {
    if (pace && it !== set[0]) await new Promise((r) => setTimeout(r, pace));
    let r; try { r = await askChain(it.q); } catch (e) { console.log(`! ${it.id.padEnd(12)} ERREUR ${e.message}`); continue; }
    const fails = r.text ? grade(it, r.text) : ['réponse vide'];
    if (!fails.length) pass++;
    console.log(`${fails.length ? '✗' : '✓'} ${it.id.padEnd(12)} ${fails.join(' · ') || 'passe'}  [${r.model}]`);
    if (args.includes('--verbose')) console.log('   ' + r.text.replace(/\n/g, '\n   ') + '\n');
  }
  console.log(`\n${pass >= 16 ? '✅' : '❌'} ${pass}/${set.length} (seuil 16) — chaîne ${chainSpec}`);
  process.exit(pass >= 16 ? 0 : 1);
}

const key = process.env.OPENROUTER_API_KEY;
if (!key) { console.error('OPENROUTER_API_KEY requis (ou --dry).'); process.exit(2); }
let pass = 0; let empty = 0; const rows = [];
const primary = model ?? appModel;
const FALLBACKS = OPENROUTER_FALLBACKS;
for (const it of set) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    // Même liste de repli que l'app (models[]) : si le modèle gratuit est saturé, OpenRouter bascule.
    // Comme l'app : raisonnement coupé (question directe) — et EXCLU de la réponse, pour les modèles qui le déversent dans le contenu.
    body: JSON.stringify({ model: primary, models: [primary, ...FALLBACKS.filter((m) => m !== primary)], messages: [{ role: 'system', content: DOCTOPUS_SYSTEM }, { role: 'user', content: it.q }], temperature: 0.3, max_tokens: 900, reasoning: { effort: 'none', exclude: true } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    console.log(`! ${it.id.padEnd(12)} ERREUR API ${res.status} : ${data?.error?.message ?? JSON.stringify(data).slice(0, 160)}`);
    rows.push({ id: it.id, ok: false, fails: ['erreur API'] }); continue;
  }
  const msg = data?.choices?.[0]?.message ?? {};
  const text = (msg.content ?? '').trim();
  if (!text) {
    empty++;
    console.log(`! ${it.id.padEnd(12)} RÉPONSE VIDE (finish=${data?.choices?.[0]?.finish_reason ?? '?'}, modèle=${data?.model ?? '?'}, reasoning=${msg.reasoning ? 'oui' : 'non'})`);
    rows.push({ id: it.id, ok: false, fails: ['réponse vide'] }); continue;
  }
  const fails = grade(it, text);
  if (!fails.length) pass++;
  rows.push({ id: it.id, ok: !fails.length, fails, text });
  console.log(`${fails.length ? '✗' : '✓'} ${it.id.padEnd(12)} ${fails.join(' · ') || 'passe'}  [${data?.model ?? primary}]`);
  if (args.includes('--verbose')) console.log('   ' + text.replace(/\n/g, '\n   ') + '\n');
}
if (empty === set.length) console.log('\nToutes les réponses sont vides : ce n\'est pas le prompt qui est évalué. Vérifie la clé, le crédit, ou passe --model.');
console.log(`\n${pass >= 16 ? '✅' : '❌'} ${pass}/${set.length} (seuil 16) — modèle ${primary}`);
process.exit(pass >= 16 ? 0 : 1);
