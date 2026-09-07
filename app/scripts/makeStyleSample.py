#!/usr/bin/env python3
"""Régénère STYLE_SAMPLE.ts — l'extrait de référence donné aux agents d'authoring.

POURQUOI CE FICHIER EXISTE : le prompt d'authoring demandait de lire
seedCases.ts + seedFachwissen.ts + caseMuster.ts « comme modèles de qualité ».
À 12 cas c'était raisonnable ; à 32 cas cela fait ~1,5 Mo et les agents CALAIENT
(6 tentatives, 3 min sans progrès) : ils épuisaient leur contexte en lecture
avant de produire. On leur donne donc un seul cas exemplaire complet (~75 Ko).

Usage : python3 scripts/makeStyleSample.py [case-id]
"""
import sys, os

REF = sys.argv[1] if len(sys.argv) > 1 else 'case-gicht'
FW = 'fw-' + REF.replace('case-', '')
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')

def block(path, marker):
    s = open(path, encoding='utf-8').read()
    i = s.find(marker)
    if i < 0:
        return None
    start = s.rfind('{', 0, i)
    depth = 0; j = start; instr = False; esc = False; q = ''
    while j < len(s):
        c = s[j]
        if instr:
            if esc: esc = False
            elif c == '\\': esc = True
            elif c == q: instr = False
        else:
            if c in "'\"`": instr = True; q = c
            elif c == '{': depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    return s[start:j + 1]
        j += 1
    return None

case = block(os.path.join(D, 'seedCases.ts'), f"id: '{REF}'")
fw   = block(os.path.join(D, 'seedFachwissen.ts'), f"id: '{FW}'")
must = block(os.path.join(D, 'caseMuster.ts'), f"'{REF}':")
missing = [n for n, v in [('case', case), ('fachwissen', fw), ('muster', must)] if not v]
if missing:
    sys.exit(f'introuvable pour {REF} : {", ".join(missing)}')

out = f"""// ============================================================================
// EXTRAIT DE RÉFÉRENCE POUR L'AUTHORING — NE PAS IMPORTER, NE PAS MODIFIER.
// Généré par scripts/makeStyleSample.py (cas de référence : {REF}).
//
// Remplace la lecture de seedCases.ts + seedFachwissen.ts + caseMuster.ts
// (~1,5 Mo), qui faisait caler les agents d'authoring : ils épuisaient leur
// contexte en lecture avant de produire quoi que ce soit.
// ============================================================================

// ---------- 1) UN CAS COMPLET (seedCases.ts) ----------
{case}

// ---------- 2) SA FICHE FACHWISSEN (seedFachwissen.ts) ----------
{fw}

// ---------- 3) SES MUSTER (caseMuster.ts) ----------
{must}
"""
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'STYLE_SAMPLE.ts'), 'w', encoding='utf-8').write(out)
print(f'STYLE_SAMPLE.ts régénéré depuis {REF} — {len(out)//1024} Ko')
