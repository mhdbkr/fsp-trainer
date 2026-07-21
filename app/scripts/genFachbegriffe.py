#!/usr/bin/env python3
# Génère app/src/data/fachbegriffe.json à partir de Fachbegriffe_FSP.csv (2249),
# enrichi par anki_FSP.txt (défs allemandes) et FUSIONNÉ avec les tags curatés
# des entrées démo existantes (non-régressif). ids stables dérivés du terme.
import csv, re, json, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
APPDATA = os.path.join(ROOT, 'app', 'src', 'data')

SPEC = {'Gastro': 'Gastroenterologie', 'Cardio': 'Kardiologie', 'Ortho': 'Orthopädie',
        'Pneumo': 'Pneumologie', 'Infectio': 'Infektiologie', 'Uro': 'Urologie',
        'Neuro': 'Neurologie', 'Hémato': 'Hämatologie', 'Endocrino': 'Endokrinologie',
        'Psy': 'Psychiatrie', 'Anatomie': 'Anatomie', 'Général': 'Allgemein'}
CITIES = {'Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'}

def slug(t):
    s = t.lower().replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s or 'x'

def centers(raw):
    parts = [p.strip() for p in (raw or '').split(',')]
    c = [p for p in parts if p in CITIES]
    return c or ['Complément']

# 1) anki : term -> définition allemande nettoyée
anki = {}
for line in open(os.path.join(ROOT, 'anki_FSP.txt'), encoding='utf-8'):
    if line.startswith('#'):
        continue
    f = line.rstrip('\n').split('\t')
    if len(f) < 7:
        continue
    term = re.split(r'<br', f[0])[0].strip()
    d = re.sub(r'<[^>]+>', '', f[6])
    d = d.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&quot;', '"')
    # garder uniquement le premier sens [1] … (jusqu'au marqueur [2] éventuel)
    sense = re.search(r'\[1\]\s*(.*?)(?:\[\d+\]|$)', d, re.S)
    d = (sense.group(1) if sense else d)
    d = re.sub(r'^\[\d+\]\s*', '', d).strip().strip('"').strip()
    d = re.sub(r'\s+', ' ', d)
    if term and d and len(d) > 3:
        anki.setdefault(term, d)

# 2) démo existante : term -> {s, sp, p, tags, c, def} (pour préserver les tags)
demo = {}
demo_src = open(os.path.join(APPDATA, 'seedFachbegriffe.ts'), encoding='utf-8').read()
for m in re.finditer(r"\{\s*t:\s*'((?:[^'\\]|\\.)*)'(.*?)\},?\n", demo_src):
    t = m.group(1); rest = m.group(2)
    def g(k):
        mm = re.search(k + r":\s*'((?:[^'\\]|\\.)*)'", rest)
        return mm.group(1) if mm else None
    tags = re.search(r"tags:\s*\[([^\]]*)\]", rest)
    tagl = [x.strip().strip("'") for x in tags.group(1).split(',') if x.strip()] if tags else []
    cc = re.search(r"c:\s*\[([^\]]*)\]", rest)
    ccl = [x.strip().strip("'") for x in cc.group(1).split(',') if x.strip()] if cc else []
    spm = re.search(r"sp:\s*'([^']*)'", rest)
    demo[t] = {'s': g('s'), 'sp': spm.group(1) if spm else None, 'p': g('p'),
               'tags': tagl, 'c': ccl, 'def': g('def')}

# 3) CSV -> entrées, fusion démo + anki
out = []
seen_terms = set()
for r in csv.DictReader(open(os.path.join(ROOT, 'Fachbegriffe_FSP.csv'), encoding='utf-8')):
    t = r['Terme'].strip()
    if not t or t in seen_terms:
        continue
    seen_terms.add(t)
    d = demo.get(t, {})
    e = {'t': t,
         's': r['Traduction'].strip() or d.get('s') or t,
         'sp': SPEC.get(r['Spécialité'].strip(), 'Allgemein'),
         'c': centers(r['Centres'])}
    p = r['Prononciation'].strip() or d.get('p')
    if p:
        e['p'] = p
    de = anki.get(t) or d.get('def')
    if de:
        e['def'] = de
    if d.get('tags'):
        e['tags'] = d['tags']
    out.append(e)

# 4) entrées démo curatées ABSENTES du CSV -> préservées
kept_demo = 0
for t, d in demo.items():
    if t in seen_terms:
        continue
    seen_terms.add(t)
    e = {'t': t, 's': d.get('s') or t, 'sp': d.get('sp') or 'Allgemein', 'c': d.get('c') or ['Complément']}
    if d.get('p'):
        e['p'] = d['p']
    if d.get('def'):
        e['def'] = d['def']
    if d.get('tags'):
        e['tags'] = d['tags']
    out.append(e)
    kept_demo += 1

# 5) ids stables dérivés du terme (dédup collisions)
used = {}
for e in out:
    base = 'fb-' + slug(e['t'])
    i = used.get(base, 0)
    used[base] = i + 1
    e_id = base if i == 0 else f'{base}-{i+1}'
    # place id en tête
    e_ordered = {'id': e_id}
    e_ordered.update(e)
    e.clear(); e.update(e_ordered)

json.dump(out, open(os.path.join(APPDATA, 'fachbegriffe.json'), 'w', encoding='utf-8'), ensure_ascii=False)

# rapport
with_def = sum(1 for e in out if e.get('def'))
with_tags = sum(1 for e in out if e.get('tags'))
with_pron = sum(1 for e in out if e.get('p'))
from collections import Counter
sp = Counter(e['sp'] for e in out)
print(f'total: {len(out)} | démo préservés hors CSV: {kept_demo}')
print(f'avec def: {with_def} | avec tags: {with_tags} | avec pron: {with_pron}')
print('spécialités:', dict(sp))
# vérifie termes d'examen clés
for t in ['Verdachtsdiagnose', 'Anamnese', 'Differenzialdiagnose', 'Noxen']:
    print(f'  {t}:', 'OK' if t in seen_terms else 'MANQUANT')
