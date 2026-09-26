import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findViolations } from '../scripts/check-voice.mjs';

const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '../scripts/check-voice.mjs');
const rules = (v) => v.map((x) => x.rule);

// ————————————————————————————————————————————————————————————————————————
// Règles de base (le lexique attrape ce qu'il prétend attraper)
// ————————————————————————————————————————————————————————————————————————

test('attrape le vouvoiement', () => {
  const v = findViolations('a.html', '<p>Sie können hier üben.</p>');
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'vouvoiement');
});

test('attrape le verbe scolaire', () => {
  const v = findViolations('a.html', '<h1>Medizinisches Deutsch lernen</h1>');
  assert.deepEqual(rules(v), ['scolaire']);
});

test('attrape la métaphore explicitée', () => {
  const v = findViolations('a.html', '<p>Wie ein Oktopus im Ozean.</p>');
  assert.ok(v.some((x) => x.rule === 'metaphore_explicitee'));
});

test('attrape le point d\'exclamation', () => {
  const v = findViolations('a.html', '<p>Jetzt starten!</p>');
  assert.deepEqual(rules(v), ['exclamation']);
});

test('ignore ce qui est dans une balise script ou style', () => {
  const v = findViolations('a.html', '<script>const lernen = 1;</script><style>.x{}</style>');
  assert.deepEqual(v, []);
});

test('ignore les attributs techniques : href et data-* ne sont pas de la copie', () => {
  const v = findViolations('a.html', '<a href="/de/kurs/" data-x="lernen">Training</a>');
  assert.deepEqual(v, []);
});

test('laisse passer une page propre', () => {
  const v = findViolations('a.html', '<h1>Dein Trainingsraum für die Sprache der Medizin.</h1><p>Du sprichst. Wir kennen die Tiefe.</p>');
  assert.deepEqual(v, []);
});

// Remplace l'ancien test « Doctopus » (qui prouvait une tautologie : la sous-chaîne
// « oktopus » n'existe pas dans « doctopus »). Le test qui mérite sa place met les DEUX
// dans la même page : le nom de la marque ne doit pas déclencher, la métaphore doit.
test('le nom de la marque ne déclenche pas, la métaphore dans la même page déclenche', () => {
  const html = '<h1>Doctopus</h1><p>Doctopus hilft dir. Ein Oktopus hat acht Arme.</p>';
  const v = findViolations('a.html', html);
  assert.deepEqual(rules(v), ['metaphore_explicitee']);
  assert.equal(v[0].match, 'oktopus');
  // Sans la métaphore, la même page passe : c'est bien « Oktopus » qui déclenche, pas « Doctopus ».
  assert.deepEqual(findViolations('a.html', '<h1>Doctopus</h1><p>Doctopus hilft dir bei der Fachsprachprüfung.</p>'), []);
});

// ————————————————————————————————————————————————————————————————————————
// Point 1 — entités HTML décodées (nommées, décimales, hexadécimales)
// ————————————————————————————————————————————————————————————————————————

test('point 1 — une entité d\'umlaut nommée ne contourne plus la règle', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Pr&uuml;fungsfragen im Angebot.</p>')), ['fuite']);
});

test('point 1 — entité numérique décimale et hexadécimale', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Pr&#252;fungsfragen im Angebot.</p>')), ['fuite']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Pr&#xFC;fungsfragen im Angebot.</p>')), ['fuite']);
});

test('point 1 — le point d\'exclamation en entité (&excl; &#33; &#x21;)', () => {
  for (const e of ['&excl;', '&#33;', '&#x21;']) {
    assert.deepEqual(rules(findViolations('a.html', `<p>Jetzt starten${e}</p>`)), ['exclamation'], e);
  }
});

// ————————————————————————————————————————————————————————————————————————
// Point 2 — césure conditionnelle et largeurs nulles
// ————————————————————————————————————————————————————————————————————————

test('point 2 — le trait d\'union conditionnel (&shy; et U+00AD) ne contourne plus', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Pr&shy;üfungs&shy;fragen im Angebot.</p>')), ['fuite']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Pr­üfungs­fragen im Angebot.</p>')), ['fuite']);
});

test('point 2 — la largeur nulle (U+200B) ne contourne plus', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Prüfungs​fragen im Angebot.</p>')), ['fuite']);
});

// LIMITE CONNUE, pinée ici pour qu'elle reste un choix et non une surprise : un mot coupé
// par une balise inline devient deux mots et échappe. Recoller les fragments souderait
// « Wort</p><p>Wort ». La sanction d'une coupure volontaire est le mécanisme d'exception.
test('point 2 — limite documentée : un mot coupé par une balise inline échappe', () => {
  assert.deepEqual(findViolations('a.html', '<p><strong>lern</strong>en</p>'), []);
});

// ————————————————————————————————————————————————————————————————————————
// Point 3 — variantes Unicode du point d'exclamation
// ————————————————————————————————————————————————————————————————————————

test('point 3 — le point d\'exclamation pleine largeur et ses parents déclenchent', () => {
  for (const c of ['！', '﹗', 'ǃ', '‼', '⁉']) {
    assert.deepEqual(rules(findViolations('a.html', `<p>Jetzt starten${c}</p>`)), ['exclamation'], JSON.stringify(c));
  }
  // ❗ est à la fois un point d'exclamation et un émoji : les deux règles portent.
  assert.deepEqual(rules(findViolations('a.html', '<p>Jetzt starten❗</p>')), ['exclamation', 'emoji']);
});

// ————————————————————————————————————————————————————————————————————————
// Point 4 — la copie que Google affiche et que le lecteur d'écran lit
// ————————————————————————————————————————————————————————————————————————

test('point 4 — meta description', () => {
  const html = '<head><meta name="description" content="Erfolgsquote 98 %. Prüfungsfragen garantiert"></head><body><p>Hallo.</p></body>';
  assert.deepEqual(rules(findViolations('a.html', html)).sort(), ['fuite', 'promesse']);
});

test('point 4 — title, og:description, alt, aria-label', () => {
  assert.deepEqual(rules(findViolations('a.html', '<title>Prüfungsfragen</title><p>Hallo.</p>')), ['fuite']);
  assert.deepEqual(rules(findViolations('a.html', '<meta property="og:description" content="Erfolgsquote 98 %"><p>Hallo.</p>')), ['promesse']);
  assert.deepEqual(rules(findViolations('a.html', '<img src="x.png" alt="Prüfungsfragen"><p>Hallo.</p>')), ['fuite']);
  assert.deepEqual(rules(findViolations('a.html', '<button aria-label="Jetzt lernen">Los</button>')), ['scolaire']);
  assert.deepEqual(rules(findViolations('a.html', '<span title="Deine Liga">x</span>')), ['jeu']);
});

test('point 4 — les blocs application/ld+json sont scannés (FAQ, blog)', () => {
  const html = '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"acceptedAnswer":{"text":"Die Erfolgsquote liegt hoch."}}]}</script><p>Hallo.</p>';
  assert.deepEqual(rules(findViolations('a.html', html)), ['promesse']);
});

test('point 4 — un ld+json illisible est scanné en texte brut plutôt qu\'ignoré', () => {
  const html = '<script type="application/ld+json">{ pas du json : Erfolgsquote }</script><p>Hallo.</p>';
  assert.deepEqual(rules(findViolations('a.html', html)), ['promesse']);
});

// ————————————————————————————————————————————————————————————————————————
// Point 5 — bornes Unicode (plus de correspondance au milieu d'un composé)
// ————————————————————————————————————————————————————————————————————————

test('point 5 — « Bürette » ne déclenche plus sauvetage, « Kursübersicht » plus scolaire', () => {
  assert.deepEqual(findViolations('a.html', '<p>Die Bürette steht im Labor.</p>'), []);
  assert.deepEqual(findViolations('a.html', '<p>Die Kursübersicht ist offen.</p>'), []);
});

test('point 5 — les mêmes radicaux déclenchent toujours quand ils sont des mots', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Wir retten dich.</p>')), ['sauvetage']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Der Kurs beginnt.</p>')), ['scolaire']);
});

// ————————————————————————————————————————————————————————————————————————
// Point 6 — normalisation NFC (sans dépouiller les diacritiques)
// ————————————————————————————————————————————————————————————————————————

test('point 6 — un texte en NFD ne contourne plus les motifs à umlaut', () => {
  const nfd = '<p>Prüfungsfragen im Angebot.</p>'; // u + tréma combinant
  assert.deepEqual(rules(findViolations('a.html', nfd)), ['fuite']);
});

// ————————————————————————————————————————————————————————————————————————
// Point 7 — exception explicite, l'heuristique de négation a disparu
// ————————————————————————————————————————————————————————————————————————

test('point 7 — l\'heuristique n\'avale plus les vraies fautes qu\'elle avalait', () => {
  // Une promesse de réussite, que « ohne » suffisait à faire passer.
  assert.deepEqual(rules(findViolations('a.html', '<p>Du bestehst, ohne im ersten Versuch zu scheitern.</p>')), ['promesse']);
  // Du jargon de jeu en façade, que « Kein » suffisait à faire passer.
  assert.deepEqual(rules(findViolations('a.html', '<p>Kein Streak geht verloren, sammle weiter.</p>')), ['jeu']);
});

test('point 7 — un adjectif intercalé ne tenait pas en échec l\'exception explicite', () => {
  const phrase = '<p>Doctopus zählt keine Häkchen: keine strafende Streak, kein Angst-Zähler.</p>';
  assert.deepEqual(rules(findViolations('a.html', phrase)), ['jeu']);
  assert.deepEqual(findViolations('a.html', `<!-- voice:allow "Streak" -->${phrase}`), []);
});

test('point 7 — l\'exception est bornée au texte exact qu\'elle nomme', () => {
  const html = '<!-- voice:allow "Streak" --><p>Keine strafende Streak. Sammle XP.</p>';
  assert.deepEqual(rules(findViolations('a.html', html)), ['jeu']);
  assert.equal(findViolations('a.html', html)[0].match, 'xp');
});

// ————————————————————————————————————————————————————————————————————————
// Point 8 — les puces du guide qui n'avaient aucune règle
// ————————————————————————————————————————————————————————————————————————

test('point 8 — urgence fabriquée, comparaison nommée, émoji, Level, intelligent', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Nur heute verfügbar.</p>')), ['urgence']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Letzte Chance zum Einstieg.</p>')), ['urgence']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Besser als jede Schule.</p>')), ['comparaison']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Dein Level steigt.</p>')), ['jeu']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Eine intelligente Korrektur.</p>')), ['hype']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Du bist der Endgegner.</p>')), ['jeu']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Willkommen 🐙</p>')), ['emoji']);
});

test('point 8 — le © du pied de page n\'est pas un émoji', () => {
  assert.deepEqual(findViolations('a.html', '<footer>© 2026 Doctopus — Impressum</footer>'), []);
});

// ————————————————————————————————————————————————————————————————————————
// Point 9 — formes fléchies et composés (plafond de couverture en allemand)
// ————————————————————————————————————————————————————————————————————————

test('point 9 — les formes qui passaient toutes déclenchent', () => {
  const cas = [
    ['<p>Der garantierte Erfolg.</p>', 'promesse'],
    ['<p>Unsere Erfolgsquoten sprechen.</p>', 'promesse'],
    ['<p>Dein Lernplan steht.</p>', 'scolaire'],
    ['<p>Ein Sprachkurs für Ärzte.</p>', 'scolaire'],
    ['<p>Zwei Streaks in Folge.</p>', 'jeu'],
    ['<p>Eine Prüfungsfrage pro Tag.</p>', 'fuite'],
    ['<p>Du brauchst sechzig Prozent.</p>', 'bareme'],
    ['<p>Du brauchst 60&#8239;%.</p>', 'bareme'],
    ['<p>KI-gestützte Korrektur.</p>', 'hype'],
  ];
  for (const [html, rule] of cas) assert.deepEqual(rules(findViolations('a.html', html)), [rule], html);
});

// ————————————————————————————————————————————————————————————————————————
// Point 12 — un `>` dans une valeur d'attribut ne casse plus le dépouillement
// ————————————————————————————————————————————————————————————————————————

test('point 12 — `data-x="a > lernen b"` ne déclenche plus à tort', () => {
  assert.deepEqual(findViolations('a.html', '<p data-x="a > lernen b">Training</p>'), []);
});

// ————————————————————————————————————————————————————————————————————————
// Point 13 — la règle bareme est bornée
// ————————————————————————————————————————————————————————————————————————

test('point 13 — « 160 % » et « 260 Punkte » ne déclenchent plus bareme', () => {
  assert.deepEqual(findViolations('a.html', '<p>160 % Auslastung, 260 Punkte im Test.</p>'), []);
});

test('point 13 — « 60 % » et « 60 Punkte » restent signalés (barème non sourcé)', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Du brauchst 60 %.</p>')), ['bareme']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Du brauchst 60 Punkte.</p>')), ['bareme']);
});

// ————————————————————————————————————————————————————————————————————————
// Correction 2 — la famille `garantie` est de retour, exception de portée composant
// (Footer.astro), seconde phrase légitime de ueber.astro levée.
// ————————————————————————————————————————————————————————————————————————

test('correction 2 — la famille garantie déclenche hors exception et sans négation', () => {
  assert.deepEqual(rules(findViolations('a.html', '<p>Wir bieten dir eine echte Erfolgsgarantie.</p>')), ['promesse']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Eine Bestehensgarantie inklusive.</p>')), ['promesse']);
  assert.deepEqual(rules(findViolations('a.html', '<p>Wir garantieren dir den Erfolg.</p>')), ['promesse']);
});

test('correction 2 — l\'exception du pied de page lève « Erfolgsgarantie » exact, rien d\'autre', () => {
  const html = '<!-- voice:allow "Erfolgsgarantie" --><p>… keine Erfolgsgarantie.</p>';
  assert.deepEqual(findViolations('a.html', html), []);
  // Un autre texte de la même règle, mot différent, sur la même page : pas levé — la portée
  // est le texte exact nommé, pas la règle entière.
  assert.deepEqual(rules(findViolations('a.html', `${html} <p>Wir garantieren dir den Erfolg.</p>`)), ['promesse']);
});

test('correction 2 — l\'exception posée dans Footer.astro vaut sur chaque page où le composant est rendu', () => {
  // Reproduit ce qu'Astro construit : le même commentaire, dans le HTML de deux pages
  // distinctes, parce que le composant Footer est inclus dans les deux — pas une exception
  // par page, une exception par composant.
  const footer = '<!-- voice:allow "Erfolgsgarantie" --><p>… keine Erfolgsgarantie.</p>';
  withDist({
    'de/index.html': `<html><body>${footer}</body></html>`,
    'de/preise/index.html': `<html><body>${footer}</body></html>`,
  }, (r) => {
    assert.equal(r.status, 0, r.out);
  });
});

// Limite connue (réserve 5 du rapport de tâche 4, non retouchée ici) : l'exemption compare le
// TEXTE EXACT du match (« erfolgsgarantie »), pas une position dans la page. Si une AUTRE
// source, sur la MÊME page, porte elle aussi le mot exact « Erfolgsgarantie », l'exception du
// pied de page (rendu sur cette page) la lève aussi, par construction — vérifié sur le site
// réel : dist/de/faq/index.html porte « keine Erfolgsgarantie » depuis
// apps/site/src/content/faq/bestehen.md, hors du pied de page, et n'est plus signalé une fois
// le pied de page construit dans la même page (seul « garantieren » y reste signalé, un motif
// différent de la même règle). Pinée pour que ce soit un choix documenté, pas une découverte
// en prod.
test('correction 2 — limite documentée : l\'exception du pied de page peut lever une autre occurrence du même mot sur la même page', () => {
  const body = '<p>Wir bieten eine echte Erfolgsgarantie.</p>';
  assert.deepEqual(rules(findViolations('a.html', body)), ['promesse']);
  assert.deepEqual(findViolations('a.html', `<!-- voice:allow "Erfolgsgarantie" -->${body}`), []);
});

// ————————————————————————————————————————————————————————————————————————
// Point 14 — un motif capable de matcher le vide ne bloque pas la CI
// ————————————————————————————————————————————————————————————————————————

test('point 14 — un motif matchant le vide, mais pas exempté, ne devient pas une fausse alerte', () => {
  const v = findViolations('a.html', '<p>- x</p>', { probe: ['a*'] });
  assert.deepEqual(v, []);
});

// Le piège réel n'est pas « un match vide existe » (ci-dessus : un match vide qui n'est PAS
// dans `allow` devient aussitôt le résultat et casse la boucle, sans le garde-fou). Le piège
// réel est un match vide QUI EST dans `allow` : sans le garde-fou, `!allowed.has('')` est faux,
// la boucle ne casse pas ET `re.lastIndex` ne bouge pas puisque le match fait 0 caractère —
// `exec()` retrouve indéfiniment la même correspondance vide au même endroit. C'est un blocage
// SYNCHRONE : aucun timeout de test ne peut l'interrompre dans le même processus (la boucle
// d'événements ne tourne jamais pendant une boucle JS synchrone). D'où le sous-processus avec
// timeout dur — la même méthode que la preuve manuelle du rapport de tâche 4, désormais dans
// la suite plutôt qu'à côté (troisième paramètre `lexicon` de `findViolations`, déjà ouvert
// pour rendre ce chemin testable).
test('point 14 — un motif vide ET exempté ne fait pas tourner exec() à l\'infini (sous-processus, timeout dur)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'voice-loop-'));
  try {
    const probe = join(dir, 'probe.mjs');
    writeFileSync(probe, [
      `import { findViolations } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};`,
      `findViolations('a.html', '<!-- voice:allow "" --><p>- x</p>', { probe: ['a*'] });`,
      `process.stdout.write('ok');`,
    ].join('\n'));
    const r = spawnSync(process.execPath, [probe], { encoding: 'utf8', timeout: 3000 });
    // Un garde-fou absent boucle indéfiniment : spawnSync tue le sous-processus (SIGTERM) au
    // bout de 3 s au lieu de bloquer toute la suite. `signal` non nul = boucle infinie.
    assert.equal(r.signal, null, `sous-processus tué après timeout — boucle infinie probable : ${r.stderr}`);
    assert.equal(r.stdout, 'ok', r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ————————————————————————————————————————————————————————————————————————
// Points 10 et 11 — la moitié exécutable : parcours, forme du chemin, code de sortie
// ————————————————————————————————————————————————————————————————————————

function withDist(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'voice-dist-'));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const abs = join(dir, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, body);
    }
    const r = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
    return fn({ ...r, out: `${r.stdout}${r.stderr}`, dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('moitié exécutable — code de sortie 0 sur un corpus propre', () => {
  withDist({ 'de/index.html': '<p>Du sprichst. Wir hören zu.</p>' }, (r) => {
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /✓ check-voice/);
  });
});

test('moitié exécutable — code de sortie 1 et chemin relatif à dist/ (pas absolu)', () => {
  withDist({ 'de/ueber/index.html': '<p>Sie können hier üben.</p>' }, (r) => {
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /vouvoiement/);
    // La forme du chemin rapporté est `dist/de/ueber/index.html` : c'est elle dont dépendent
    // les exemptions. Un refactor passant le chemin absolu resterait invisible sans ceci.
    assert.match(r.out, /— dist\/de\/ueber\/index\.html/);
    assert.ok(!r.out.includes(r.dir), `le chemin absolu du corpus a fuité : ${r.out}`);
  });
});

test('point 11 — l\'exemption de vouvoiement porte sur les 4 chemins EXACTS', () => {
  withDist({
    'de/agb/index.html': '<p>Sie können Ihr Abonnement jederzeit kündigen.</p>',
    'de/agb/anhang/index.html': '<p>Sie können Ihr Abonnement jederzeit kündigen.</p>',
  }, (r) => {
    assert.equal(r.status, 1, r.out);
    // /de/agb/ est exempté, /de/agb/anhang/ n'hérite pas de l'exemption.
    assert.match(r.out, /vouvoiement.*dist\/de\/agb\/anhang\/index\.html/);
    assert.ok(!/vouvoiement.*dist\/de\/agb\/index\.html/.test(r.out), r.out);
  });
});

test('point 10 — un dist/ présent mais sans HTML échoue au lieu de réussir à vide', () => {
  withDist({ 'robots.txt': 'User-agent: *' }, (r) => {
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /corpus vide/);
  });
});

// L'exemption reste bornée à `vouvoiement` : une promesse dans les AGB reste une faute.
test('une règle non exemptée déclenche toujours sur une page légale', () => {
  const v = findViolations('/de/agb/index.html', '<p>Der Erfolg ist garantiert.</p>');
  assert.ok(v.some((x) => x.rule === 'promesse'));
});

test('la règle vouvoiement reste active hors des pages légales', () => {
  const v = findViolations('/de/ueber/index.html', '<p>Sie können Ihr Abonnement jederzeit kündigen.</p>');
  assert.deepEqual(rules(v), ['vouvoiement']);
});
