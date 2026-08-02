#!/usr/bin/env python3
# Migration MedicalView — PASSE 2, parseur robuste par comptage de
# crochets/accolades conscient des chaînes (gère indifféremment le format
# compact sur une ligne des 10 cas Phase 1 et le format étalé des cas Phase 2).
import re, sys, os

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'seedCases.ts'))
src = open(SRC, encoding='utf-8').read()

LABOR = r'labor|blutbild|crp|bsg|lipase|amylase|troponin|hba1c|tsh|ft[34]|elektrolyt|kreatinin|gerinnung|quick|inr|ptt|d-dimer|urin|kultur|serologi|elisa|western|antigen|blutgas|bga|liquor|abstrich|antibiogramm|resistogramm|blutzucker|leberwert|nierenwert|γgt|gamma-gt|\bap\b|bilirubin|albumin|\bcea\b|ca 19|psa|blutgruppe|kreuzblut|lipidstatus|hämoglobin|phq|screening-fragebogen'
BILD = r'sonograph|sono\b|ultraschall|röntgen|rö-|\bct\b|\bct-|computertomograph|mrt|kernspin|szintigraph|angiographie|dsa|echokardiograph|stressecho|endosonograph|doppler|duplex|bildgebung|thorax-|abdomen-ct|ekg\b'
INVAS = r'ögd|gastroskop|koloskop|endoskop|ercp|bronchoskop|biopsie|punktion|katheter|koronarangiograph|laparoskop|drainage|lumbalpunktion|aszitespunktion|feinnadel|zystoskop|\bdru\b|digital-rektal|rektale untersuchung|emg|nlg|elektrophysiolog|konsil'
KLINIK = r'anamnese|untersuchung|inspektion|palpation|auskultation|vitalparameter|blutdruck|puls|temperatur|exploration|befund|zeichen|test\b|score|manöver|prüfung|status|dms|gehstrecke|lagerungsprobe|klinische diagnose'

def stufe_of(text):
    t = text.lower()
    if re.search(INVAS, t): return 'Invasiv & Speziell'
    if re.search(BILD, t):  return 'Apparativ & Bildgebung'
    if re.search(LABOR, t): return 'Labor'
    if re.search(KLINIK, t): return 'Anamnese/Klinik'
    return None

BY_ID = {}  # déjà géré en passe 1 pour les cas connus ; ceux-ci sont les 10 initiaux
DEFAULT = {'konservativ': 'Konservativ', 'interventionell': 'Interventionell', 'chirurgisch': 'Chirurgisch'}
AKUT = re.compile(r'notfall|sofort|akut|erstmaßnahme|stabilisier|reanimat|kreislauf', re.I)

def find_matching(s, open_i, open_ch, close_ch):
    """Retourne l'index du crochet/accolade fermant correspondant, en ignorant
    ce qui est dans des chaînes '...' (avec échappement \\')."""
    depth = 0
    i = open_i
    in_str = False
    while i < len(s):
        c = s[i]
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == "'":
                in_str = False
        else:
            if c == "'":
                in_str = True
            elif c == open_ch:
                depth += 1
            elif c == close_ch:
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1

def extract_strings(s):
    out = []
    i = 0
    while i < len(s):
        if s[i] == "'":
            j = i + 1
            buf = []
            while j < len(s) and s[j] != "'":
                if s[j] == '\\':
                    buf.append(s[j:j+2]); j += 2; continue
                buf.append(s[j]); j += 1
            out.append(''.join(buf))
            i = j + 1
        else:
            i += 1
    return out

migrated_diag, migrated_ther, skipped = 0, 0, []

# --- diagnostik: ['a', 'b', ...],  (ancien format string[]) ------------------
out = []
pos = 0
for m in re.finditer(r'diagnostik:\s*\[', src):
    start = m.end() - 1  # index du '['
    if start < pos:
        continue
    close = find_matching(src, start, '[', ']')
    if close < 0:
        continue
    body = src[start+1:close]
    # déjà migré ? (contient déjà 'stufe:')
    if 'stufe:' in body:
        continue
    items = extract_strings(body)
    if not items:
        continue
    buckets = {'Anamnese/Klinik': [], 'Labor': [], 'Apparativ & Bildgebung': [], 'Invasiv & Speziell': []}
    for text in items:
        st = stufe_of(text) or 'Anamnese/Klinik'
        buckets[st].append(text)
    lines = []
    for st in ['Anamnese/Klinik', 'Labor', 'Apparativ & Bildgebung', 'Invasiv & Speziell']:
        for t in buckets[st]:
            esc = t.replace("\\", "\\\\").replace("'", "\\'")
            lines.append(f"          {{ stufe: '{st}', text: '{esc}' }},")
    new_val = '[\n' + '\n'.join(lines) + '\n        ]'
    out.append((start, close + 1, new_val))
    migrated_diag += 1

for start, end, new_val in sorted(out, key=lambda x: -x[0]):
    src = src[:start] + new_val + src[end:]

# --- therapie: { konservativ: [...], ... },  (ancien format objet) ----------
out2 = []
for m in re.finditer(r'therapie:\s*\{', src):
    start = m.end() - 1
    close = find_matching(src, start, '{', '}')
    if close < 0:
        continue
    body = src[start+1:close]
    if "label:" in body:  # déjà migré (c'est un tableau, pas un objet — ne devrait pas matcher '{')
        continue
    sections = []
    for key in ['konservativ', 'interventionell', 'chirurgisch']:
        km = re.search(rf'{key}:\s*\[', body)
        if not km:
            continue
        kstart = km.end() - 1
        kclose = find_matching(body, kstart, '[', ']')
        if kclose < 0:
            continue
        its = extract_strings(body[kstart+1:kclose])
        if not its:
            continue
        label = DEFAULT[key]
        akut = any(AKUT.search(i) for i in its)
        it_lines = '\n'.join(f"            '{i.replace(chr(92), chr(92)*2).replace(chr(39), chr(92)+chr(39))}'," for i in its)
        sec = f"          {{\n            label: '{label}',\n            items: [\n{it_lines}\n            ],"
        if akut:
            sec += "\n            akut: true,"
        sec += '\n          },'
        sections.append(sec)
    if not sections:
        continue
    new_val = '[\n' + '\n'.join(sections) + '\n        ]'
    out2.append((start, close + 1, new_val))
    migrated_ther += 1

for start, end, new_val in sorted(out2, key=lambda x: -x[0]):
    src = src[:start] + new_val + src[end:]

open(SRC, 'w', encoding='utf-8').write(src)
print(f'diagnostik migrés : {migrated_diag}')
print(f'therapie migrées  : {migrated_ther}')
