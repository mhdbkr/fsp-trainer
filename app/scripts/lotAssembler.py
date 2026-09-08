#!/usr/bin/env python3
# Assembleur déterministe Lot-1 : lit les JSON produits par le workflow,
# normalise (whitelist stricte des champs → TS valide), câble les liens, et
# insère dans seedCases.ts / caseMuster.ts / seedFachwissen.ts.
import json, os, re, sys

SRC = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(SRC, '..', 'src', 'data'))

CASE_IDS = ['case-lungenembolie', 'case-eug', 'case-meningitis', 'case-pankreaskarzinom', 'case-zoster', 'case-osteoporose']

PERSONALIA = ['name','age','geschlecht','geburtsdatum','groesseCm','gewichtKg','beruf','hausarzt','familienstand','wohnsituation']
SCHMERZ = ['ort','charakter','intensitaet','ausstrahlung','beginn','verlauf','verstaerker','linderer']
NOXEN = ['tabak','alkohol','drogen']
SHEET = ['personalia','leitsymptome','begleitsymptome','schmerz','vegetativeAnamnese','negativeFindings','vorerkrankungen','voroperationen','medikamente','allergien','unvertraeglichkeiten','noxen','familienanamnese','sozialanamnese','antworten','frageAntworten','schwierigeReaktionen','persona']
MV = ['verdachtsdiagnose','differenzialdiagnosen','diagnostik','therapie','erstmassnahmen','notfall']
CASE = ['id','name','pathology','specialty','centers','frequency','difficulty','patientSheet','medicalView','linkedFachwissenId','linkedFachbegriffeIds','probableAufklaerungIds','caseSpecificQuestions','examinerQuestions','pruefungsfallen','status','confidence','sourceDates','kommunikativeSituationIds','examinerSheet']
FW = ['id','pathology','specialty','definition','aetiologie','risikofaktoren','klinik','klassifikation','redFlags','diagnostik','differenzialdiagnosen','therapie','prognose','pruefungsfallen','askedInExam','merksatz','linkedCaseIds','keyFachbegriffeIds','linkedAufklaerungIds']

def pick(d, keys):
    return {k: d[k] for k in keys if k in d and d[k] is not None}

# Whitelists INTERNES aux tableaux d'objets. La whitelist de premier niveau ne
# protégeait que les champs racine : un agent avait inventé un `name_note` DANS
# klassifikation, ce qui passait l'assembleur et ne cassait qu'au typecheck.
ITEM_KEYS = {
    'klassifikation': ['name', 'inhalt'],
    'klinik': ['text', 'atypisch'],
    'differenzialdiagnosen': ['dd', 'unterscheidung'],
    'diagnostik': ['stufe', 'text'],
    'therapie': ['label', 'items', 'akut'],
    'askedInExam': ['frage', 'antwort'],
}

def clean_items(obj):
    """Filtre récursivement les clés inconnues à l'intérieur des tableaux."""
    for field, keys in ITEM_KEYS.items():
        v = obj.get(field)
        if isinstance(v, list):
            obj[field] = [pick(it, keys) if isinstance(it, dict) else it for it in v]
    return obj

def iso_dates(s):
    out = []
    for m in re.finditer(r'(\d{2})\.(\d{2})\.(\d{4})', s or ''):
        dd, mm, yy = m.groups()
        # Les protocoles contiennent parfois des dates partielles (« 00.02.2023 »
        # quand le jour est inconnu) : elles produiraient un ISO invalide.
        if dd == '00' or mm == '00':
            continue
        out.append(f'{yy}-{mm}-{dd}')
    # unique, keep order
    seen = set(); res = []
    for d in out:
        if d not in seen:
            seen.add(d); res.append(d)
    return res

def fw_id_for(case_id):
    return 'fw-' + case_id.replace('case-', '')

def norm_case(raw):
    c = clean_items(raw['case'])
    # medicalView porte SES PROPRES tableaux d'objets : les nettoyer aussi.
    # Sans cela un champ inventé (dd_note…) y passait et ne cassait qu'au tsc.
    if isinstance(c.get('medicalView'), dict):
        c['medicalView'] = clean_items(c['medicalView'])
    fwid = fw_id_for(c['id'])
    src = c.get('sourceProtocol', '')
    case = pick(c, CASE)
    # patientSheet
    ps = pick(c.get('patientSheet', {}), SHEET)
    if 'personalia' in ps:
        ps['personalia'] = pick(ps['personalia'], PERSONALIA)
    if 'schmerz' in ps and isinstance(ps['schmerz'], dict):
        ps['schmerz'] = pick(ps['schmerz'], SCHMERZ)
    if 'noxen' in ps and isinstance(ps['noxen'], dict):
        ps['noxen'] = pick(ps['noxen'], NOXEN)
    case['patientSheet'] = ps
    # medicalView + notfall placement
    mv = pick(c.get('medicalView', {}), MV)
    if c.get('notfall') is True:
        mv['notfall'] = True
    case['medicalView'] = mv
    # defaults / links
    case['linkedFachwissenId'] = fwid
    case.setdefault('linkedFachbegriffeIds', [])
    case.setdefault('probableAufklaerungIds', [])
    case.setdefault('caseSpecificQuestions', [])
    case.setdefault('examinerQuestions', [])
    case['status'] = 'À faire'
    case['confidence'] = 0
    dates = iso_dates(src)
    if dates:
        case['sourceDates'] = dates
    # reorder: id, name first
    return case

def norm_fw(raw, case):
    raw = dict(raw); raw['fachwissen'] = clean_items(raw['fachwissen'])
    fw = None
    # fachwissen may be in the case bundle or a separate file
    if raw.get('fachwissen'):
        fw = raw['fachwissen']
    else:
        p = os.path.join(SRC, fw_id_for(case['id']) + '.json')
        if os.path.exists(p):
            fw = json.load(open(p))
    if not fw:
        return None
    fw = pick(fw, FW)
    fw['id'] = fw_id_for(case['id'])
    fw['linkedCaseIds'] = [case['id']]
    fw['keyFachbegriffeIds'] = []
    fw['linkedAufklaerungIds'] = case.get('probableAufklaerungIds', [])
    return fw

IDENT = re.compile(r'^[A-Za-z_$][A-Za-z0-9_$]*$')

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'").replace('\r', '').replace('\n', '\\n')

def to_ts(v, indent):
    pad = ' ' * indent
    pad2 = ' ' * (indent + 2)
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, str):
        return "'" + esc(v) + "'"
    if isinstance(v, int):
        return str(v)
    if isinstance(v, float):
        return str(int(v)) if v.is_integer() else repr(v)
    if v is None:
        return 'undefined'
    if isinstance(v, list):
        if not v:
            return '[]'
        items = [pad2 + to_ts(x, indent + 2) for x in v]
        # virgules de fin (style hand-authored + compat validateurs regex)
        return '[\n' + ',\n'.join(items) + ',\n' + pad + ']'
    if isinstance(v, dict):
        if not v:
            return '{}'
        lines = []
        for k, val in v.items():
            key = k if IDENT.match(k) else "'" + esc(k) + "'"
            lines.append(pad2 + key + ': ' + to_ts(val, indent + 2))
        return '{\n' + ',\n'.join(lines) + ',\n' + pad + '}'
    raise SystemExit('unserializable: ' + repr(v))

def ts(obj, base_indent):
    # Émet dans le STYLE HAND-AUTHORED (clés non-quotées si identifiants, chaînes
    # simple-quote) → cohérent avec les fichiers seed + compatible validateurs regex.
    return (' ' * base_indent) + to_ts(obj, base_indent)

def splice(path, anchor, insertion):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    idx = content.rfind(anchor)
    if idx < 0:
        raise SystemExit(f'anchor not found in {path}: {anchor!r}')
    new = content[:idx] + insertion + content[idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new)

def main():
    cases_ts, muster_ts, fw_ts = [], [], []
    report = []
    for cid in CASE_IDS:
        raw = json.load(open(os.path.join(SRC, cid + '.json')))
        case = norm_case(raw)
        fw = norm_fw(raw, case)
        muster = raw.get('muster')
        # idempotency guard
        if f"id: '{cid}'" in open(os.path.join(DATA, 'seedCases.ts'), encoding='utf-8').read():
            report.append(f'SKIP {cid} (déjà présent)')
            continue
        cases_ts.append(ts(case, 4) + ',')
        if muster:
            muster_ts.append("  '" + cid + "': " + to_ts({'arztbrief': muster.get('arztbrief', {}), 'vorstellung': muster.get('vorstellung', {})}, 2) + ',')
        if fw:
            fw_ts.append(ts(fw, 4) + ',')
        report.append(f'OK {cid}: case+{"muster" if muster else "NOMUSTER"}+{"fw" if fw else "NOFW"} · fwId={case["linkedFachwissenId"]} · dates={case.get("sourceDates")}')

    if cases_ts:
        splice(os.path.join(DATA, 'seedCases.ts'), '\n  ];\n}', '\n' + '\n'.join(cases_ts))
    if fw_ts:
        splice(os.path.join(DATA, 'seedFachwissen.ts'), '\n  ];\n}', '\n' + '\n'.join(fw_ts))
    if muster_ts:
        splice(os.path.join(DATA, 'caseMuster.ts'), '\n};', '\n' + '\n'.join(muster_ts))
    print('\n'.join(report))
    print(f'\nInséré: {len(cases_ts)} cas, {len(muster_ts)} Muster, {len(fw_ts)} Fachwissen.')

if __name__ == '__main__':
    main()
