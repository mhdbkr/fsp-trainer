#!/usr/bin/env python3
# Assembleur des contenus SANS cas clinique : fiches Fachwissen transversales
# (Sepsis, Schmerztherapie, Antikoagulation…) et Aufklärungen.
#
# lotAssembler.py n'insère que des triplets cas + fiche + Muster ; ici on
# réutilise son sérialiseur (style hand-authored, virgules de fin, whitelists)
# et ses garde-fous, mais on écrit dans seedFachwissen.ts et
# seedAufklaerungen.ts seulement.
#
# Entrées, posées à côté de ce script :
#   fwonly-<id>.json   → { fachwissen: {...}, selfCheck: {...} }
#   auf-<id>.json      → { id, name, shortName, category, blocks, patientQuestions }
#
# Les blocs partagés d'Aufklärung (META, ABSCHLUSS, STANDARD_RISIKEN, OP_RISIKEN)
# sont des CONSTANTES du fichier seed : le JSON porte un jeton, l'assembleur
# émet l'identifiant.
import glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lotAssembler import DATA, FW, SRC, clean_items, pick, splice, ts  # noqa: E402

AUF_KEYS = ['id', 'name', 'shortName', 'category', 'blocks', 'patientQuestions', 'linkedCaseIds']
BLOCK_KEYS = ['einleitung', 'metakommunikation', 'warum', 'ablauf', 'vorbereitung',
              'standardRisiken', 'spezifischeRisiken', 'abschluss']
RISK_CONST = {'NONE': '[]', 'STANDARD_RISIKEN': 'STANDARD_RISIKEN', 'OP_RISIKEN': 'OP_RISIKEN'}
# Jetons remplacés APRÈS sérialisation par l'identifiant TS correspondant.
TOKENS = {
    "'__META__'": 'META',
    "'__ABSCHLUSS__'": 'ABSCHLUSS',
    "'__RISK_NONE__'": '[]',
    "'__RISK_STANDARD__'": 'STANDARD_RISIKEN',
    "'__RISK_OP__'": 'OP_RISIKEN',
}


def norm_fw_only(raw):
    fw = clean_items(dict(raw['fachwissen']))
    fw = pick(fw, FW)
    fw.setdefault('specialty', 'Allgemein')
    fw['linkedCaseIds'] = []
    fw['keyFachbegriffeIds'] = []
    fw['linkedAufklaerungIds'] = []
    return fw


def norm_auf(raw):
    b = raw['blocks']
    risk = str(b.get('standardRisiken', 'NONE')).upper()
    if risk not in RISK_CONST:
        raise SystemExit(f"{raw['id']}: standardRisiken inconnu {risk!r}")
    blocks = {
        'einleitung': b['einleitung'],
        'metakommunikation': '__META__',
        'warum': b['warum'],
        'ablauf': b['ablauf'],
        'vorbereitung': b['vorbereitung'],
        'standardRisiken': {'NONE': '__RISK_NONE__', 'STANDARD_RISIKEN': '__RISK_STANDARD__', 'OP_RISIKEN': '__RISK_OP__'}[risk],
        'spezifischeRisiken': [s for s in b.get('spezifischeRisiken', []) if str(s).strip()],
        'abschluss': '__ABSCHLUSS__',
    }
    auf = {
        'id': raw['id'], 'name': raw['name'], 'shortName': raw.get('shortName') or raw['name'],
        'category': raw['category'], 'blocks': blocks,
        'patientQuestions': [pick(q, ['frage', 'antwort']) for q in raw.get('patientQuestions', []) if q.get('frage') and q.get('antwort')],
        'linkedCaseIds': [],
    }
    return pick(auf, AUF_KEYS)


def main():
    report = []
    fw_path = os.path.join(DATA, 'seedFachwissen.ts')
    auf_path = os.path.join(DATA, 'seedAufklaerungen.ts')
    fw_src = open(fw_path, encoding='utf-8').read()
    auf_src = open(auf_path, encoding='utf-8').read()

    fw_ts = []
    for p in sorted(glob.glob(os.path.join(SRC, 'fwonly-*.json'))):
        fw = norm_fw_only(json.load(open(p, encoding='utf-8')))
        if f"id: '{fw['id']}'" in fw_src:
            report.append(f"SKIP {fw['id']} (déjà présent)"); continue
        fw_ts.append(ts(fw, 4) + ',')
        report.append(f"OK fachwissen {fw['id']} · {len(fw.get('askedInExam', []))} askedInExam · {len(fw.get('therapie', []))} sections")

    auf_ts = []
    for p in sorted(glob.glob(os.path.join(SRC, 'auf-*.json'))):
        auf = norm_auf(json.load(open(p, encoding='utf-8')))
        if f"id: '{auf['id']}'" in auf_src:
            report.append(f"SKIP {auf['id']} (déjà présent)"); continue
        s = ts(auf, 4) + ','
        for tok, ident in TOKENS.items():
            s = s.replace(tok, ident)
        auf_ts.append(s)
        report.append(f"OK aufklaerung {auf['id']} · {len(auf['blocks']['spezifischeRisiken'])} risques · {len(auf['patientQuestions'])} questions")

    if fw_ts:
        splice(fw_path, '\n  ];\n}', '\n' + '\n'.join(fw_ts))
    if auf_ts:
        splice(auf_path, '\n  ];\n}', '\n' + '\n'.join(auf_ts))
    print('\n'.join(report))
    print(f'\nInséré: {len(fw_ts)} Fachwissen, {len(auf_ts)} Aufklärungen.')


if __name__ == '__main__':
    main()
