#!/usr/bin/env python3
# Migration schéma Fachwissen (12 fiches) :
#  - diagnostik: {text, invasiv?} -> {stufe, text}  (Anamnese/Klinik|Labor|Bildgebung|Invasiv/Speziell)
#  - therapie:   {konservativ,interventionell,chirurgisch} -> [{label, items, akut?}]
# Classement par mots-clés cliniques ; les cas ambigus sont RAPPORTÉS pour revue.
import re, sys, os

SRC = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'data', 'seedFachwissen.ts'))
src = open(SRC, encoding='utf-8').read()

# --- classement d'une ligne de diagnostik -----------------------------------
LABOR = r'labor|blutbild|crp|bsg|lipase|amylase|troponin|hba1c|tsh|ft[34]|elektrolyt|kreatinin|gerinnung|quick|inr|ptt|d-dimer|urin|kultur|serologi|elisa|western|antigen|blutgas|bga|liquor|abstrich|antibiogramm|resistogramm|blutzucker|leberwert|nierenwert|γgt|gamma-gt|ap\b|bilirubin|albumin|cea|ca 19|psa|blutgruppe|kreuzblut|lipidstatus|hämoglobin|phq|screening-fragebogen'
BILD = r'sonograph|sono\b|ultraschall|röntgen|rö-|ct\b|computertomograph|mrt|kernspin|szintigraph|angiographie|dsa|echokardiograph|stressecho|endosonograph|doppler|duplex|bildgebung|thorax-|abdomen-ct'
INVAS = r'ögd|gastroskop|koloskop|endoskop|ercp|bronchoskop|biopsie|punktion|katheter|koronarangiograph|laparoskop|drainage|lumbalpunktion|aszitespunktion|feinnadel|zystoskop|dru\b|digital-rektal|rektale untersuchung|emg|nlg|elektrophysiolog'
KLINIK = r'anamnese|untersuchung|inspektion|palpation|auskultation|vitalparameter|blutdruck|puls|temperatur|exploration|befund|zeichen|test\b|score|manöver|prüfung|status|dms|gehstrecke|lagerungsprobe|abi|knöchel-arm|psychopatholog|suizidalität'

def stufe_of(text):
    t = text.lower()
    # priorité : invasif > imagerie > labo > clinique (le plus spécifique gagne)
    if re.search(INVAS, t): return 'Invasiv/Speziell'
    if re.search(BILD, t):  return 'Bildgebung'
    if re.search(LABOR, t): return 'Labor'
    if re.search(KLINIK, t): return 'Anamnese/Klinik'
    return None  # -> à revoir

# --- labels de thérapie par spécialité --------------------------------------
LABELS = {
    'Psychiatrie':    {'konservativ': 'Basistherapie & Psychotherapie', 'interventionell': 'Pharmakotherapie', 'chirurgisch': 'Krisenintervention'},
    'Infektiologie':  {'konservativ': 'Antibiotische Therapie (Erstlinie)', 'interventionell': 'Alternativen / Sonderfälle', 'chirurgisch': 'Bei Komplikationen'},
    'Onkologie':      {'konservativ': 'Systemtherapie', 'interventionell': 'Interventionell', 'chirurgisch': 'Chirurgisch (kurativ)'},
}
DEFAULT = {'konservativ': 'Konservativ', 'interventionell': 'Interventionell', 'chirurgisch': 'Chirurgisch'}
# surcharges par pathologie (plus fin que la spécialité)
BY_ID = {
    'fw-depression':   {'konservativ': 'Psychotherapie & Basismaßnahmen', 'interventionell': 'Pharmakotherapie', 'chirurgisch': 'Bei Therapieresistenz / Krise'},
    'fw-lyme':         {'konservativ': 'Antibiotische Therapie (Erstlinie)', 'interventionell': 'Alternativen (KI / Schwangerschaft)', 'chirurgisch': 'Neuroborreliose / schwerer Verlauf'},
    'fw-pneumonie':    {'konservativ': 'Allgemeinmaßnahmen', 'interventionell': 'Antibiotische Therapie', 'chirurgisch': 'Bei Komplikationen'},
    'fw-magenkarzinom':{'konservativ': 'Systemtherapie / (neo)adjuvant', 'interventionell': 'Endoskopisch / palliativ', 'chirurgisch': 'Chirurgisch (kurativ)'},
    'fw-pyelonephritis':{'konservativ': 'Antibiotische Therapie & Allgemeinmaßnahmen', 'interventionell': 'Harnableitung bei Obstruktion', 'chirurgisch': 'Bei Abszess / Komplikation'},
    'fw-bandscheibenvorfall': {'konservativ': 'Konservativ (Basistherapie, ~90 %)', 'interventionell': 'Interventionell (PRT)', 'chirurgisch': 'Operativ (nur bei Indikation)'},
}
AKUT = re.compile(r'notfall|sofort|akut|erstmaßnahme|stabilisier|reanimat|kreislauf', re.I)

# --- parse fiche par fiche ---------------------------------------------------
report, warnings = [], []
out = src

for m in re.finditer(r"id: '(fw-[a-z0-9-]+)'", src):
    fid = m.group(1)
    start = m.start()
    nxt = src.find("      id: 'fw-", m.end())
    end = nxt if nxt > 0 else src.find('\n  ];', m.end())
    block = src[start:end]
    spec = (re.search(r"specialty: '([^']+)'", block) or [None, ''])[1]

    # ---- diagnostik ----
    dm = re.search(r"(      diagnostik: \[)(.*?)(\n      \],\n)", block, re.S)
    new_diag = None
    if dm:
        body = dm.group(2)
        entries = re.findall(r"\{\s*text: '((?:[^'\\]|\\.)*)'(?:,\s*invasiv: (true|false))?,?\s*\}", body)
        if entries:
            buckets = {'Anamnese/Klinik': [], 'Labor': [], 'Bildgebung': [], 'Invasiv/Speziell': []}
            for text, inv in entries:
                st = stufe_of(text)
                if st is None:
                    st = 'Invasiv/Speziell' if inv == 'true' else 'Anamnese/Klinik'
                    warnings.append(f'{fid}: stufe devinée ({st}) pour « {text[:60]}… »')
                buckets[st].append(text)
            lines = []
            for st in ['Anamnese/Klinik', 'Labor', 'Bildgebung', 'Invasiv/Speziell']:
                for t in buckets[st]:
                    lines.append(f"        {{ stufe: '{st}', text: '{t}' }},")
            new_diag = dm.group(1) + '\n' + '\n'.join(lines) + dm.group(3)

    # ---- therapie ----
    tm = re.search(r"(      therapie: \{)(.*?)(\n      \},\n)", block, re.S)
    new_ther = None
    if tm:
        body = tm.group(2)
        labels = BY_ID.get(fid) or LABELS.get(spec) or DEFAULT
        sections = []
        for key in ['konservativ', 'interventionell', 'chirurgisch']:
            km = re.search(rf"{key}: \[(.*?)\n        \],", body, re.S)
            if not km:
                km = re.search(rf"{key}: \[(.*?)\],", body, re.S)
            if not km:
                continue
            items = re.findall(r"'((?:[^'\\]|\\.)*)'", km.group(1))
            if not items:
                continue
            label = labels.get(key, DEFAULT[key])
            akut = any(AKUT.search(i) for i in items)
            it = '\n'.join(f"            '{i}'," for i in items)
            sec = f"        {{\n          label: '{label}',\n          items: [\n{it}\n          ],"
            if akut:
                sec += "\n          akut: true,"
            sec += '\n        },'
            sections.append(sec)
        if sections:
            new_ther = '      therapie: [\n' + '\n'.join(sections) + '\n      ],\n'

    if new_diag or new_ther:
        nb = block
        if new_diag:
            nb = nb.replace(dm.group(0), new_diag)
        if new_ther:
            nb = nb.replace(tm.group(0), new_ther)
        out = out.replace(block, nb)
        report.append(f'✓ {fid} [{spec}] diagnostik={"ok" if new_diag else "-"} therapie={"ok" if new_ther else "-"}')
    else:
        report.append(f'– {fid}: rien à migrer (déjà au nouveau format ?)')

open(SRC, 'w', encoding='utf-8').write(out)
print('\n'.join(report))
if warnings:
    print('\n⚠ à revoir :')
    print('\n'.join('  ' + w for w in warnings))
