#!/usr/bin/env python3
"""Applique le chantier 2 : insère les 6 fiches Fachwissen manquantes et
remplace les blocs `therapie` restés sur le moule générique (fiche ET cas).

Le remplacement se fait par comptage de crochets conscient des chaînes : un
regex naïf casserait sur les apostrophes et les crochets présents dans le texte
médical allemand.
"""
import json, os, re, sys

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')
FW_KEYS = ['id','pathology','specialty','definition','aetiologie','risikofaktoren','klinik','klassifikation','redFlags','diagnostik','differenzialdiagnosen','therapie','prognose','pruefungsfallen','askedInExam','merksatz']

def esc(s):
    return str(s).replace('\\', '\\\\').replace("'", "\\'")

def ts(v, ind):
    p = ' ' * ind
    if isinstance(v, str):
        return "'" + esc(v) + "'"
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, list):
        if not v:
            return '[]'
        return '[\n' + ''.join(f'{p}  {ts(x, ind + 2)},\n' for x in v) + p + ']'
    if isinstance(v, dict):
        return '{\n' + ''.join(f'{p}  {k}: {ts(x, ind + 2)},\n' for k, x in v.items() if x is not None) + p + '}'
    return 'null'

def find_close(s, i, op, cl):
    """Index du délimiteur fermant correspondant, en ignorant les chaînes."""
    depth = 0; instr = False
    while i < len(s):
        c = s[i]
        if instr:
            if c == '\\': i += 2; continue
            if c == "'": instr = False
        else:
            if c == "'": instr = True
            elif c == op: depth += 1
            elif c == cl:
                depth -= 1
                if depth == 0: return i
        i += 1
    return -1

def block_bounds(src, marker, nxt_re):
    i = src.find(marker)
    if i < 0: return None
    m = re.search(nxt_re, src[i + len(marker):])
    j = i + len(marker) + m.start() if m else len(src)
    return i, j

def replace_therapie(src, i, j, sections, ind):
    """Remplace le tableau therapie du bloc [i, j)."""
    blk = src[i:j]
    k = blk.find('therapie: [')
    if k < 0: return src, False
    start = k + len('therapie: ') 
    end = find_close(blk, start, '[', ']')
    if end < 0: return src, False
    new = 'therapie: ' + ts(sections, ind)
    return src[:i] + blk[:k] + new + blk[end + 1:] + src[j:], True

def main():
    data = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chantier2-out.json'), encoding='utf-8'))
    report = []

    # --- 1) nouvelles fiches Fachwissen -------------------------------------
    p = os.path.join(D, 'seedFachwissen.ts')
    s = open(p, encoding='utf-8').read()
    add = []
    for f in data['fiches']:
        fw = f['fachwissen']
        if f"id: '{fw['id']}'" in s:
            report.append(f"SKIP fiche {fw['id']} (déjà présente)"); continue
        obj = {k: fw[k] for k in FW_KEYS if k in fw and fw[k] is not None}
        obj['linkedCaseIds'] = []; obj['keyFachbegriffeIds'] = []; obj['linkedAufklaerungIds'] = []
        add.append('    ' + ts(obj, 4) + ',')
        report.append(f"OK fiche {fw['id']} ({len(fw.get('differenzialdiagnosen', []))} DD, {len(fw.get('askedInExam', []))} Q/R)")
    if add:
        anchor = '\n  ];\n}'
        idx = s.rfind(anchor)
        s = s[:idx] + '\n' + '\n'.join(add) + s[idx:]
        open(p, 'w', encoding='utf-8').write(s)

    # --- 2) thérapies : fiches existantes ------------------------------------
    s = open(p, encoding='utf-8').read()
    for t in data['therapies']:
        fwid = 'fw-' + t['caseId'].replace('case-', '')
        b = block_bounds(s, f"id: '{fwid}'", r"\n    \{\n      id: 'fw-")
        if not b:
            report.append(f"?? fiche {fwid} introuvable"); continue
        s, ok = replace_therapie(s, b[0], b[1], t['therapieFiche'], 6)
        report.append(('OK  ' if ok else 'ECHEC ') + f"thérapie fiche {fwid}")
    open(p, 'w', encoding='utf-8').write(s)

    # --- 3) thérapies : cas ---------------------------------------------------
    p = os.path.join(D, 'seedCases.ts')
    s = open(p, encoding='utf-8').read()
    todo = [(t['caseId'], t['therapieCas']) for t in data['therapies']]
    todo += [(f['fachwissen']['pathology'], f['therapieCas']) for f in data['fiches']]
    # pour les fiches on a la pathologie, pas l'id du cas → on résout
    fixed = []
    for key, sect in todo:
        if key.startswith('case-'):
            fixed.append((key, sect)); continue
        m = re.search(r"id: '(case-[a-z0-9-]+)',\n      name: '[^']*',\n      pathology: '" + re.escape(key) + "'", s)
        if m: fixed.append((m.group(1), sect))
        else: report.append(f"?? cas pour pathologie « {key} » introuvable")
    for cid, sect in fixed:
        b = block_bounds(s, f"id: '{cid}'", r"\n    \{\n      id: 'case-")
        if not b:
            report.append(f"?? cas {cid} introuvable"); continue
        s, ok = replace_therapie(s, b[0], b[1], sect, 8)
        report.append(('OK  ' if ok else 'ECHEC ') + f"thérapie cas {cid}")
    open(p, 'w', encoding='utf-8').write(s)

    print('\n'.join(report))
    print(f"\n{sum(1 for r in report if r.startswith('OK'))} opérations réussies, "
          f"{sum(1 for r in report if r.startswith(('ECHEC', '??')))} en échec.")

if __name__ == '__main__':
    main()
