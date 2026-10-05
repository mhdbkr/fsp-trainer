// ============================================================================
// LA MESURE DE COHÉRENCE — lot K0 (ADR-0023, spec 2026-10-04 §2).
// Fonctions PURES (pas d'E/S) : `checkCoherence.mjs` leur passe les trames
// jouées des 130 cas et le lexique (`signes.ts`), `checkCoherence.test.mjs` des
// fixtures. Rien ici ne touche le montage.
//
// Avant K1 (sondes), K2 (profils) et K4 (questions du cas), presque rien n'est
// DÉCLARÉ : un signe se LIT dans le texte, un profil se PROPOSE depuis la fiche.
// C'est une boussole, pas une porte (précision relue : 74 % doublons, 70 %
// impertinences, 50 % manques). Elle devient exacte quand les déclarations
// remplacent la lecture — d'où `source` et `exactDes` de chaque compteur.
// ============================================================================

// ── 1. Lire les SIGNES dans le texte ─────────────────────────────────────────
// Dimensions de la plainte (ne se lisent que sur une question MÈRE de aktuell / fach).
export const DIM = {
  ort: /^ort —|\bwo (genau )?(spüren|tut|haben sie (die )?(schmerz|beschwerden)|sitz|überall)|einzeichnen|zeigen(, wo| sie mir, wo)/i,
  gelenke: /welche gelenke|gelenk zu gelenk|ein gelenk oder mehrere|wie viele gelenke|gelenk- oder muskelschmerz/i,
  beginn: /^beginn —|seit wann (haben|hat|bestehen|ist|sind|leiden|bemerken|merken) (sie |die |das |es )?(die |diese )?(schmerz|beschwerd|das|es|sie)/i,
  charakter: /^charakter —|wie fühlt sich (der|die|das) (schmerz|beschwerd)|wie würden sie (den|die) schmerz/i,
  intensitaet: /^intensität —|skala von|wie stark sind (die|ihre) (schmerz|beschwerd)/i,
  ausstrahlung: /ausstrahl|strahl(en|t) .{0,60}\baus\b|zieh(en|t) (der schmerz|die schmerzen) .{0,40}(bis|ins?)\b/i,
  verlauf: /^verlauf —|plötzlich und anfallsartig|langsam über wochen entwickelt|beschwerdefreie phasen|ununterbrochen seit|tage, an denen es normal|seitdem (besser|schlimmer)|sind (die schmerzen|die beschwerden) dauerhaft/i,
  ausloeser: /auslöser|ausgelöst/i,
  einfluss: /^einflussfaktoren —|(bessert|lindert) .{0,40}(verschlimmert|schlimmer)|was (hilft|lindert)|wird es besser|besser oder schlimmer (wenn|bei|durch)/i,
  frueher: /^frühere episoden —|schon früher (phasen|beschwerden|episoden)|solche (beschwerden|gelenkbeschwerden|schmerzen|anfälle|episoden|kopfschmerzen) schon (einmal|früher|mal)|schon einmal so (etwas|ähnliche)/i,
  begleit: /^begleitbeschwerden —/i,
};
// Signes que `symptomsInText` (TEXT_RE de symptoms.ts — la lecture du lexique, UNE seule) ne lit pas :
// les 3 concepts d'origine sans motif (kontakt, oedeme, polyurie) et les ajouts de K0. Les clés sont des ids de `Signe`.
// Les 34 autres signes d'origine ne sont lus que par `symptomsInText` (injecté) : un motif se corrige à un seul endroit.
export const SIG = {
  steifigkeit: /(?<!nacken)steif(igkeit|heit)?\b|morgensteif|eingerostet/i,
  gelenk_entzuendung: /(gelenk\w*).{0,50}(geschwollen|gerötet|überwärmt)|(geschwollen|gerötet|überwärmt).{0,50}gelenk/i,
  gicht: /\bgicht/i,
  stuhlfrequenz: /wie (oft|häufig|viele mal).{0,50}(stuhlgang|toilette|durchfall)|^häufigkeit —/i,
  stuhlaussehen: /wie sieht (ihr|der) stuhl|stuhl.{0,40}(farbe|aussehen|wässrig|breiig|schleim|blut)|(blut|schleim).{0,30}(im stuhl|beigemengt|aufgefallen)|teerstuhl|schwarz.{0,15}stuhl|^aussehen —/i,
  essen_expo: /\bgegessen\b|lebensmittel gegessen|eiswürfel|leitungswasser|rohe(s|n)? (milch|fleisch|salat|eier)/i,
  zecke: /zecke/i,
  erythem_ring: /ringförmig/i,
  meningismus: /nackensteif/i,
  fazialis: /gesichtslähmung/i,
  nitro: /nitro/i,
  kontakt: /kontakt zu (kranken|tieren|personen)|angesteckt|in ihrer umgebung .{0,30}krank/i,
  polyurie: /(häufiger|mehr|öfter) wasser lassen|große (urin)?mengen|wie oft .{0,30}wasser lassen/i,
  nykturie: /nachts .{0,25}(wasser lassen|toilette)|wasser lassen, auch nachts/i,
  inkontinenz: /einnässen|urin (ab|verloren)|inkontinen|wasser nicht halten/i,
  urin_aspekt: /(farbe|aussehen) (des|von) .{0,12}urin|urin .{0,30}(dunkel|rot|blut|schäum)|blut im (stuhl oder im )?urin/i,
  oedeme: /geschwollene (beine|knöchel|füße)|wasser in den beinen|ödem/i,
  konzentration: /konzentr(ation|ier)|wortfind|auf wörter zu kommen/i,
  familie_rheuma: /familie.{0,30}(rheuma|gicht)/i,
  nierensteine: /nierenstein/i,
};
/** Dimensions / signes dont l'objet est le motif : une question qui en lit un ne « cherche » pas les autres symptômes qu'elle nomme. */
const GARDES = ['steifigkeit', 'gelenk_entzuendung', 'stuhlfrequenz', 'stuhlaussehen'];
/** Chapitres où se mesure un doublon : le cœur de l'entretien. */
export const CHAPITRES_MESURES = new Set(['aktuell', 'fach', 'vegetativ']);

const stripLabel = (t) => t.replace(/^[A-ZÄÖÜa-zäöüß ]{3,30} — /, '');
// Les exemples d'un Auslöser/Einfluss (« — ein Essen, eine Reise… ») illustrent la réponse : ils ne sont pas demandés.
const demande = (t) => {
  const body = stripLabel(t);
  return /^(ist ihnen ein auslöser|gibt es etwas, das|gibt es einen auslöser|ist ihnen etwas aufgefallen, das)/i.test(body) ? body.split(' — ')[0] : body;
};

/** Les signes qu'un texte CHERCHE (D1 : une énumération cherche chaque signe qu'elle nomme).
 *  `lire` = `symptomsInText` du lexique (injecté : ce module reste pur, sans import du bundle). */
export function signesDe(text, { mother, ch }, lire = () => []) {
  const out = new Set();
  const t = text.trim();
  if (mother && (ch === 'aktuell' || ch === 'fach')) for (const [k, re] of Object.entries(DIM)) if (re.test(t)) out.add(k);
  const a = demande(t);
  for (const k of lire(a)) out.add(k);
  for (const [k, re] of Object.entries(SIG)) if (re.test(a)) out.add(k);
  // Une dimension (Beginn, Verlauf…) porte SUR le motif : le symptôme nommé est son objet (« Seit wann haben Sie Fieber ? »).
  if ([...out].some((k) => DIM[k] && k !== 'begleit')) for (const k of [...out]) if (!DIM[k] && !GARDES.includes(k)) out.delete(k);
  if (out.has('ausloeser')) out.delete('essen_expo');
  if (out.has('gelenk_entzuendung')) out.delete('steifigkeit');
  return out;
}

// ── 2. Proposer le PROFIL d'un cas (lecture de la fiche, négation comprise) ──
const neg = (txt, re) => { // vrai si TOUTES les mentions sont niées (« ohne Gelenkschwellung », « nicht auf ein Gelenk »)
  const ms = [...txt.matchAll(new RegExp(re.source, 'gi'))];
  if (!ms.length) return true;
  return ms.every((m) => /\b(nicht|ohne|kein\w*|keine?)\b[^.;,|]{0,35}$/i.test(txt.slice(Math.max(0, m.index - 40), m.index)));
};
const has = (txt, re) => !neg(txt, re);

/** Les indices de la fiche, puis les tags de profil qu'ils PROPOSENT. `c` = { specialty, schmerz, leit, begleit, veg, verdacht, name, pathology, ddx }. */
export function profilPropose(c) {
  const s = c.schmerz ?? {};
  const complaint = [...(c.leit ?? []), ...(c.begleit ?? []), s.ort, s.charakter, s.verlauf, s.beginn].filter(Boolean).join(' | ');
  const main = [...(c.leit ?? []), s.ort].filter(Boolean).join(' | ');
  const all = [complaint, ...(c.veg ?? []), c.verdacht, c.name, c.pathology].filter(Boolean).join(' | ');
  const withDD = all + ' | ' + (c.ddx ?? []).join(' | ');
  const joint = has(complaint, /gelenk|arthr|gicht|synovi|podagra|großzeh|knie|hüfte|sprunggelenk|handgelenk|fingergelenk|grundgelenk/);
  const f = {
    schmerz: has((c.leit ?? [])[0] ?? '', /schmerz(?!los|frei)|krampfartig|kolik|weh\b/),   // D2 : le PREMIER symptôme du motif
    gelenk: joint,
    arthritis: has(main + ' ' + c.verdacht, /arthrit|gelenkschwell|gelenkschmerz|gicht|synovi|podagra/),
    generalisiert: /generalisiert|ganzen körper|am ganzen/i.test([s.ort, s.ausstrahlung].filter(Boolean).join(' ')),
    steifigkeit: joint || has(complaint, /steif|polymyalg|bechterew|spondyl/) || (/rheumatologie/i.test(c.specialty) && has(all, /steif/)),
    diarrhoe: has(main, /durchf|diarrh/),
    reise: has(complaint + ' ' + c.verdacht, /reise|urlaub|ausland|rückkehr|tropen/),
    fieber: has([...(c.leit ?? []), ...(c.begleit ?? []), ...(c.veg ?? [])].join(' | '), /fieber/),
    dysphagie: has(main, /schluck|dysphag/),
    hals: has(withDD, /schluck|dysphag|ösophag|speiseröhre|achalas|struma|schilddrüs|sodbrenn|reflux|magenkarz|hals|tonsill|angina|pharyng|globus|schlaganfall|parkinson|myasth/) || /neurologie/i.test(c.specialty),
    lyme: has(withDD, /borreli|lyme|zecke|fsme|erythema|fazialis/),
    meningitis: has(withDD, /mening|enzephal|subarach|borreli|lyme|fsme|nacken/),
    dyspnoe: has(complaint, /atemnot|luftnot|kurzatmig|dyspno/),
    husten: has(complaint, /husten/),
    gewichtsverlust: has(complaint + (c.veg ?? []).join(' '), /gewichtsverlust|abgenommen|kg (verloren|abgenommen)/),
    gicht: has(withDD, /gicht|harnsäure|podagra|nierenstein/),
    stein: /urologie|nephrologie/i.test(c.specialty) || has(withDD, /gicht|harnsäure|nierenstein|stein|kolik|lithias|flanke/),
  };
  return { tags: Object.keys(f).filter((k) => f[k]), complaint };
}

/** Profil effectif (§10.3) : tags dérivés (nature, `hoden`) ∪ tags proposés ; exige / exclut par la table du lexique. */
export function profilEffectif(c, kategorie, lex) {
  const propose = profilPropose(c);
  const derives = [kategorie, ...(/hoden|skrot/i.test(c.schmerz?.ort ?? '') ? ['hoden'] : [])];
  const tags = [...new Set([...derives, ...propose.tags])];
  const exige = new Map(); // signe → tag qui l'exige
  for (const t of tags) for (const s of lex.PROFIL_EXIGE[t] ?? []) if (!exige.has(s)) exige.set(s, t);
  const exclut = new Map();
  for (const t of tags) for (const s of lex.PROFIL_EXCLUT[t] ?? []) if (!exclut.has(s)) exclut.set(s, t);
  return { tags, derives, propose: propose.tags, exige, exclut };
}

// ── 3. Mesurer un cas ────────────────────────────────────────────────────────
// « im Urlaub » n'est pas une anaphore : la question nomme son propre contexte (« Wird es im Urlaub besser ? »).
const ANAPHOR = [[/\bdort\b|\bdorthin\b|auf der reise|nach der rückkehr|von der reise/i, 'reise']];
const ECARTE = new Set(['eroeffnung', 'personalia', 'abschluss']);

/** Une unité = question mère + ses relances. `rows` = la trame jouée ({ ch, text, probes, cs, sucht, fu }). */
export function unitesDe(rows, lire = () => [], connu = () => true) {
  const units = [];
  let rank = 0;
  for (const r of rows) {
    if (ECARTE.has(r.ch)) continue;
    rank++;
    const ms = signesDe(r.text, { mother: true, ch: r.ch }, lire);
    for (const s of r.sucht ?? []) if (connu(s)) ms.add(s);
    const fus = (r.fu ?? []).map((f) => ({ text: f, signs: signesDe(f.replace(/^Falls [^:]{2,40}:\s*/, ''), { mother: false, ch: r.ch }, lire), cond: /^Falls /.test(f) }));
    const all = new Set([...ms, ...fus.flatMap((f) => [...f.signs])]);
    units.push({ rank, ch: r.ch, cs: r.cs, probe: r.probes.join(',') || (r.cs ? 'CAS' : '-'), text: r.text, declared: !!r.sucht?.length, ms, fus, all });
  }
  return units;
}

/**
 * @param c    { id, kategorie, antworten, rows, ... } (la fiche + la trame jouée)
 * @param lex  { PROFIL_EXIGE, PROFIL_EXCLUT, SIGNE_DEF, symptomsInText } — `sucht` déclaré : tout signe du lexique compte
 * @param qo   constats du détecteur d'ordre Q0 pour ce cas (chaînes)
 */
export function mesurerCas(c, lex, qo = []) {
  const profil = profilEffectif(c, c.kategorie, lex);
  const units = unitesDe(c.rows, lex.symptomsInText, (s) => s in lex.SIGNE_DEF);
  const tagsTxt = profil.tags.join(', ');
  // (a) doublons : un signe cherché par ≥ 2 unités (aktuell / fach / vegetativ).
  const bySign = new Map();
  for (const u of units) if (CHAPITRES_MESURES.has(u.ch)) for (const s of u.all) (bySign.get(s) ?? bySign.set(s, []).get(s)).push(u);
  const dup = [], dupCas = [];
  for (const [s, all] of bySign) {
    // Les parties d'une question réduite par `parts` sont UNE sonde, pas des unités concurrentes.
    const us = all.filter((u, i) => u.cs || u.probe === '-' || all.findIndex((v) => v.probe === u.probe && !v.cs) === i);
    if (us.length < 2) continue;
    const at = us.map((u) => `#${u.rank} ${u.ch}:${u.probe}`);
    dup.push({ s, at, why: `« ${s} » est cherché par ${us.length} unités ; r2 n'en garderait qu'une (question du cas > Fach > aktuell > vegetativ)` });
    if (us.filter((u) => u.cs).length >= 2) dupCas.push({ s, at: us.filter((u) => u.cs).map((u) => `#${u.rank} ${u.ch}:${u.probe}`) });
  }
  // (b) hors profil : pertinence du signe ∩ tags du profil, ou signe exclu.
  const imp = [];
  for (const u of units) for (const s of u.all) {
    const d = lex.SIGNE_DEF[s];
    if (!d) continue;
    const at = `#${u.rank} ${u.ch}:${u.probe}`;
    if (profil.exclut.has(s)) imp.push({ s, at, why: `« ${s} » est exclu par le tag « ${profil.exclut.get(s)} » du profil` });
    else if (d.pertinence !== 'screening' && !d.pertinence.some((t) => profil.tags.includes(t))) imp.push({ s, at, why: `« ${s} » n'est pertinent que pour [${d.pertinence.join(', ')}] ; profil proposé : [${tagsTxt}]` });
  }
  // (c) exigés et absents : aucune unité de la trame (hors ouverture, personalia, clôture) ne cherche le signe.
  const present = new Set(units.flatMap((u) => [...u.all]));
  const miss = [], ajoutSansReponse = [];
  for (const [s, tag] of profil.exige) {
    if (present.has(s) || profil.exclut.has(s)) continue;
    const bank = lex.SIGNE_DEF[s]?.bank;
    miss.push({ s, tag, bank, why: `le tag « ${tag} » exige « ${s} » ; aucune unité ne le cherche` });
    if (bank && !c.antworten?.[bank]) ajoutSansReponse.push({ s, bank, why: `r3 ajouterait « ${bank} » pour « ${s} » : la fiche n'a pas d'antworten[${bank}]` });
  }
  // (d) relances hors signe de leur mère (famille sous une question personnelle, antécédent nommé).
  const fu = [], fuCond = []; let fuLarge = 0;
  for (const u of units) for (const f of u.fus) {
    const foreign = [...f.signs].filter((s) => !u.ms.has(s) && !DIM[s]);
    const drift = /\b(familie|eltern|geschwister|mutter|vater)\b/i.test(f.text) && u.ch !== 'familie-sozial' && !/familie|eltern/i.test(u.text);
    const hist = /schon (einmal|mal) (einen|eine|ein) [A-ZÄÖÜ]\w+/.test(f.text) && foreign.length > 0;
    if (drift || hist) fu.push({ at: `#${u.rank} ${u.ch}:${u.probe}`, mother: u.text.slice(0, 70), fu: f.text, cond: f.cond, why: drift ? 'la relance change de chapitre (famille)' : `antécédent « ${foreign.join(', ')} » hors du signe de sa mère${f.cond ? ' (relance conditionnelle : anomalie r4a)' : ', sans condition (détachable par r4a)'}` });
    else if (foreign.length && !f.cond) fuLarge++;
    else if (foreign.length && f.cond) fuCond.push({ at: `#${u.rank} ${u.ch}:${u.probe}`, mother: u.text.slice(0, 70), fu: f.text, cond: true, why: `relance conditionnelle qui lit « ${foreign.join(', ')} » (lecture large, NON comptée : les exemples d'une réaction allergique ou d'une précision y sont lus comme des signes)` });
  }
  // (e) ordre : une anaphore sans antécédent + le détecteur Q0.
  const ord = [];
  units.forEach((u, i) => {
    for (const [re, need] of ANAPHOR) {
      if (!re.test(u.text) || /[a-zäöüß] [A-ZÄÖÜ](?!ie\b|hnen\b|hr)[a-zäöüß]{2,}[^?]*\bdort\b/.test(stripLabel(u.text)) || u.ms.has(need)) continue;
      if (units.slice(0, i).some((v) => v.ms.has(need) && !/^(ist ihnen ein auslöser|auslöser)/i.test(stripLabel(v.text)))) continue;
      ord.push({ at: `#${u.rank} ${u.ch}:${u.probe}`, why: `« ${u.text.match(re)[0]} » avant toute question sur « ${need} » (aucun \`braucht\` déclaré avant K4)` });
    }
  });
  for (const h of qo) ord.push({ at: 'Q0', why: `détecteur de présupposition : ${h}` });
  const muettes = units.filter((u) => u.cs && !u.declared).length;
  return {
    id: c.id, specialty: c.specialty, kat: c.kategorie, n: units.length, profil, units,
    dup, dupCas, imp, miss, ajoutSansReponse, fu, fuCond, fuLarge, ord, muettes, casTotal: units.filter((u) => u.cs).length,
    score: dup.length + imp.length + miss.length + fu.length + ord.length,
  };
}

// ── 3 bis. PROPOSER la déclaration d'une question non déclarée (K1, `--propose`) ──
/** Pour une unité du CAS sans `sucht` : les signes que son texte nomme et, par relance, ceux qu'elle nomme hors de sa mère
 *  (une relance sans signe propre est une précision : elle hérite). Une AIDE à l'annotation (K2, K4) — précision relue de la
 *  lecture : 50 à 74 % — qui n'écrit rien : la déclaration fait foi, un relecteur la pose. */
export function proposer(unit) {
  const sucht = [...unit.ms];
  const relances = unit.fus.map((f, i) => {
    const propres = [...f.signs].filter((s) => !unit.ms.has(s) && !DIM[s]);
    return { i, text: f.text, cond: f.cond, sucht: propres, horsSigne: propres.length > 0, alerte: f.cond && propres.length > 0 };
  });
  return { sucht, relances };
}

// ── 4. Les compteurs du contrat (§10.6) ──────────────────────────────────────
export const COMPTEURS = [
  // [clé, libellé, quel(le) mesure, exact dès]
  ['doublons', 'signes cherchés par ≥ 2 unités', 'lecture du texte + sucht déclarés (précision ≈ 74 %)', 'K1 (sondes) / K4 (questions du cas)'],
  ['doublonsCas', 'dont par ≥ 2 questions du cas', 'lecture du texte', 'K4'],
  ['horsProfil', 'signes hors profil encore cherchés', 'profil PROPOSÉ depuis la fiche (précision ≈ 70 %)', 'K2 (profil déclaré)'],
  ['exigeAbsent', 'signes exigés par le profil, cherchés par personne', 'profil PROPOSÉ depuis la fiche (précision ≈ 50 %)', 'K2 (profil déclaré)'],
  ['relancesOrphelines', 'relances CONDITIONNELLES hors signe (anomalies r4a)', 'lecture stricte : famille / antécédent nommé (la lecture large est du bruit)', 'K1 (sondes) / K5 (cas)'],
  ['brauchtViole', 'questions placées avant le fait qu\'elles présupposent', 'anaphore + détecteur Q0 (précision ≈ 55 %)', 'K4 (`braucht` déclaré)'],
  ['ajouteSansReponse', 'banques que r3 ajouterait sans réponse dans la fiche', 'projection : exigeAbsent × antworten[banque]', 'K3 (mesuré sur le montage)'],
];
export const RESIDU = [
  ['questionsMuettes', 'questions du cas jouées sans `sucht`', 'K5 (requis au type)'],
  ['sondesMuettes', 'sondes de la banque sans entrée dans PROBE_SUCHT', 'K1 (PROBE_SUCHT total)'],
  ['nonReduit', 'questions à réduire, sans `parts`', 'K3 (cohere)'],
  ['casRetiresParR1', 'questions du cas retirées par r1', 'K3 (cohere) — erreur de source'],
];

/** Totaux sur l'ensemble des cas. `null` = non mesurable avant K3 (il n'y a pas de `cohere`). */
export function totaux(results, { sondesMuettes }) {
  const sum = (f) => results.reduce((a, r) => a + f(r), 0);
  const brut = {
    doublons: sum((r) => r.dup.length),
    doublonsCas: sum((r) => r.dupCas.length),
    horsProfil: sum((r) => r.imp.length),
    exigeAbsent: sum((r) => r.miss.length),
    relancesOrphelines: sum((r) => r.fu.filter((x) => x.cond).length),
    brauchtViole: sum((r) => r.ord.length),
    ajouteSansReponse: sum((r) => r.ajoutSansReponse.length),
  };
  const residu = { questionsMuettes: sum((r) => r.muettes), sondesMuettes, nonReduit: null, casRetiresParR1: null };
  const spec = {
    a: brut.doublons, b: brut.horsProfil, c: brut.exigeAbsent,
    d: sum((r) => r.fu.length), dDetachables: sum((r) => r.fu.filter((x) => !x.cond).length), dCondLarge: sum((r) => r.fuCond.length), dLarge: sum((r) => r.fuLarge), e: brut.brauchtViole,
  };
  return { brut, residu, spec };
}
