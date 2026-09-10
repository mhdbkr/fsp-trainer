#!/usr/bin/env python3
# ============================================================================
# Couverture du CORPUS DE PROTOCOLES par le corpus de cas.
#
# Le bon signal de fréquence n'est pas dans le corps des protocoles mais dans
# leurs TITRES : chaque protocole est titré par son diagnostic
# (« ## [05.11.2024 Kolonkarzinom](#index) »).
#
# Le rapprochement automatique titre ↔ pathology échoue dans les deux sens :
#   - faux positifs par synonymie   (Podagra = Gichtarthritis, Sprue = Zöliakie)
#   - faux négatifs par faute de frappe (Kolonkarzynom, Leberzirrohze, Deppresion)
# D'où la table d'alias explicite ci-dessous, tenue à la main. Toute entrée
# ajoutée doit pointer vers une `pathology` réellement présente dans seedCases.
# ============================================================================
import re, glob, os, collections, sys, unicodedata

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SEED = os.path.join(ROOT, 'app', 'src', 'data', 'seedCases.ts')

# titre de protocole (normalisé) -> pathologie couvrante
ALIAS = {
    'kolonkarzinom': 'Kolorektales Karzinom', 'kolorektalkarzinom': 'Kolorektales Karzinom',
    'kolonkarzynom': 'Kolorektales Karzinom', 'kolonkarzinomdiverticulitis': 'Kolorektales Karzinom',
    'cholezystolithiasis': 'Cholelithiasis mit Gallenkolik', 'cholestasegallenstau': 'Cholelithiasis mit Gallenkolik',
    'colonirritabile': 'Reizdarmsyndrom', 'kolonirritabile': 'Reizdarmsyndrom',
    'diverticulitis': 'Divertikulitis', 'diverticulitis1': 'Divertikulitis', 'divertikulose': 'Divertikulitis',
    'koronareherzkrankheitkhk': 'Angina pectoris / KHK', 'akutekoronarsyndromacs': 'Myokardinfarkt',
    'herzinfarkt': 'Myokardinfarkt',
    'oberschenkelhalsfraktur': 'Schenkelhalsfraktur (mediale Femurfraktur)',
    'podagra': 'Gichtarthritis (akuter Gichtanfall)', 'gicht2x': 'Gichtarthritis (akuter Gichtanfall)',
    'hyperurikaemiegicht': 'Gichtarthritis (akuter Gichtanfall)',
    'alkoholabusus': 'Alkoholentzugssyndrom', 'akoholabusus': 'Alkoholentzugssyndrom',
    'dmi': 'Diabetes mellitus Typ 1 (Erstmanifestation)',
    'sprue': 'Zöliakie (glutensensitive Enteropathie)', 'glutenenteropathie': 'Zöliakie (glutensensitive Enteropathie)',
    'panikattacke': 'Panikstörung mit Agoraphobie', 'panickattacke': 'Panikstörung mit Agoraphobie',
    'panikattackebzwherzinfarkt': 'Panikstörung mit Agoraphobie',
    'alzheimerkrankheit': 'Demenz vom Alzheimer-Typ', 'alzheimerkrankheit1': 'Demenz vom Alzheimer-Typ',
    'apoplex': 'Ischämischer Schlaganfall (Hirninfarkt)',
    'asthmaexazerbation': 'Asthma bronchiale',
    'copdbronchitis': 'Chronisch obstruktive Lungenerkrankung (COPD)',
    'spastischebronchitis': 'Chronisch obstruktive Lungenerkrankung (COPD)',
    'deppresion': 'Depression (depressive Episode)',
    'herniainguinalis': 'Leistenhernie (Inguinalhernie)',
    'leberzirrohze': 'Leberzirrhose', 'ethyalkoholischeleberzirrose3x': 'Leberzirrhose',
    'hepatischeencephalopathie': 'Leberzirrhose',
    'lymeborelliose': 'Lyme-Borreliose',
    'magenulkus': 'Ulcus ventriculi / Gastritis', 'ulkus': 'Ulcus ventriculi / Gastritis',
    'ulkus1': 'Ulcus ventriculi / Gastritis', 'ulkuskrankheit': 'Ulcus ventriculi / Gastritis',
    'ulcusduodeni': 'Ulcus ventriculi / Gastritis',
    'schmerzeninepigastrischerregion': 'Ulcus ventriculi / Gastritis',
    'migraene': 'Migräne',
    'nephrolithasisharnweginfektion': 'Nephrolithiasis mit Nierenkolik',
    'osoephaguskarzinom': 'Ösophaguskarzinom', 'oesphaguskarcinom': 'Ösophaguskarzinom',
    'refluxkranheit': 'GERD (Refluxkrankheit)',
    'sprunggelenksfraktur': 'Sprunggelenkfraktur (OSG-Fraktur)',
    'sprungsgelenksfraktur': 'Sprunggelenkfraktur (OSG-Fraktur)',
    'traumatischesprunggelenkverletzung': 'Sprunggelenkfraktur (OSG-Fraktur)',
    'sprunggelenkdistorsion': 'Sprunggelenkfraktur (OSG-Fraktur)',
    'tiefevenenthrombosetvt': 'Tiefe Beinvenenthrombose (TVT)',
    'tiefevenenthrombosetvt1': 'Tiefe Beinvenenthrombose (TVT)',
    'schmerzeninlinkenunterschenckel': 'Tiefe Beinvenenthrombose (TVT)',
    'pavkstadium2b': 'Periphere arterielle Verschlusskrankheit (pAVK)',
    'cronischentzuendlichedarmerkrankung': 'Morbus Crohn',
    'gastroenteritis1': 'Akute infektiöse Gastroenteritis',
    'rheumatischesfiber': 'Akutes rheumatisches Fieber', 'rheumatischesfiber1': 'Akutes rheumatisches Fieber',
    'rheumatischesfieber2x': 'Akutes rheumatisches Fieber',
    'rheumatischesfieberundtvt': 'Akutes rheumatisches Fieber',

    # --- 2e passe : variantes orthographiques, suffixes d'index et titres composés
    'oberegastrointestinaleblutung': 'Obere GI-Blutung', 'obereintestinaleblutung': 'Obere GI-Blutung',
    'gastrointestinaleblutung': 'Obere GI-Blutung', 'ogiblutung': 'Obere GI-Blutung',
    'oberegastrointestinalblutung': 'Obere GI-Blutung',
    'oberegastrointestinaleblutungbeiulkuskrankheit': 'Obere GI-Blutung',
    'gastrointestinaleblutungaufgrundvonulcusventrikuli': 'Obere GI-Blutung',
    'oberegastrointestinaleblutungulcusventriculi': 'Obere GI-Blutung',
    'oberegastrointestinaleblutungulcusventriculiduodeni': 'Obere GI-Blutung',
    'malloryweisssyndrom': 'Obere GI-Blutung',
    'zervikalerdiskusprolaps': 'Zervikaler Bandscheibenvorfall (HWS-Diskusprolaps)',
    'diskusprolapsinderhws': 'Zervikaler Bandscheibenvorfall (HWS-Diskusprolaps)',
    'diskusprolaps2x': 'Zervikaler Bandscheibenvorfall (HWS-Diskusprolaps)',
    'diabetestyp1': 'Diabetes mellitus Typ 1 (Erstmanifestation)',
    'diabetesmellitustypi': 'Diabetes mellitus Typ 1 (Erstmanifestation)',
    'pyelonephritis1': 'Akute Pyelonephritis', 'pyelonephritisundcopdexazerbation': 'Akute Pyelonephritis',
    'akuteskoronarsyndrom': 'Myokardinfarkt', 'acsinstabileanginapectorissteminichtstemi': 'Myokardinfarkt',
    'anginapektoris': 'Angina pectoris / KHK', 'anginapektoris2x': 'Angina pectoris / KHK',
    'stabileangina': 'Angina pectoris / KHK',
    'anginatonsilaris': 'Akute Tonsillitis (Angina tonsillaris)',
    'arthritisurica': 'Gichtarthritis (akuter Gichtanfall)',
    'copdexezerbationoderbronchialkarzinom': 'Chronisch obstruktive Lungenerkrankung (COPD)',
    'cholelithiasis3x': 'Cholelithiasis mit Gallenkolik', 'cholelithiasis1': 'Cholelithiasis mit Gallenkolik',
    'depression2x': 'Depression (depressive Episode)', 'depression1': 'Depression (depressive Episode)',
    'depression2': 'Depression (depressive Episode)',
    'somatoformestoerungdepression': 'Depression (depressive Episode)',
    'gerdulcusventriculi': 'GERD (Refluxkrankheit)',
    'gastrooesophagealerefluxkrankheitgerd': 'GERD (Refluxkrankheit)',
    'gastrooesophagealerefluxkrankheitgerd1': 'GERD (Refluxkrankheit)',
    'gastrooesophagealerefluxkrankheit': 'GERD (Refluxkrankheit)',
    'ulcusventriculiduodeni': 'Ulcus ventriculi / Gastritis',
    'nonhodgkinlymphom': 'Malignes Lymphom (Hodgkin-Lymphom)',
    'obstruktiveschlafapnoesyndrom': 'Obstruktives Schlafapnoe-Syndrom',
    'pankreaskarzinombauchspeicheldruesenkrebs': 'Pankreaskarzinom (duktales Adenokarzinom des Pankreas)',
    'prostatahyperplasie1': 'Benigne Prostatahyperplasie (benignes Prostatasyndrom)',
    'wirbelfrakturaufgrundeinerosteoporose': 'Osteoporose mit Wirbelkörperfraktur',
    'wirbelsaeulefrakturbeibekannterosteoporose': 'Osteoporose mit Wirbelkörperfraktur',
    'osteoporotischefraktur': 'Osteoporose mit Wirbelkörperfraktur',
    'chronischentzuendlichedarmerkrankungen': 'Morbus Crohn',
    'chronischealkoholabhaengigkeit': 'Alkoholentzugssyndrom',
    'chronischehepatitis': 'Virushepatitis (akute Hepatitis B)',
    'chronischehepatitis1': 'Virushepatitis (akute Hepatitis B)',
    'pavkperipherearterielleverschlusskrankheit': 'Periphere arterielle Verschlusskrankheit (pAVK)',
    'gastroenteritis': 'Akute infektiöse Gastroenteritis',
    'rheumatischesfieber': 'Akutes rheumatisches Fieber',

    # --- 3e passe : cibles ajoutées par le lot-19
    'abszessamgesaess': 'Weichteilabszess (Gesäßabszess)', 'abzess': 'Weichteilabszess (Gesäßabszess)',
    'anorexianervosa2x': 'Anorexia nervosa (Magersucht)',
    'koxarthrose': 'Coxarthrose (Hüftgelenkarthrose)', 'coxartrose': 'Coxarthrose (Hüftgelenkarthrose)',
    'coxarthrose': 'Coxarthrose (Hüftgelenkarthrose)',
    'metabolishessyndrom': 'Metabolisches Syndrom', 'metabolischessyndrom': 'Metabolisches Syndrom',
    'erkaeltunginfluenzaodercovid': 'Influenza (Virusgrippe)', 'grippe': 'Influenza (Virusgrippe)',
    'influenza': 'Influenza (Virusgrippe)',

    # --- 4e passe : cibles ajoutées par le lot-20
    'malaria': 'Malaria tropica (Plasmodium falciparum)',
    'endokarditis': 'Infektiöse Endokarditis', 'bakterielleendokarditis': 'Infektiöse Endokarditis',
    'infektioeseendokarditis': 'Infektiöse Endokarditis',
    'covid19': 'COVID-19 (SARS-CoV-2-Infektion)', 'covid': 'COVID-19 (SARS-CoV-2-Infektion)',
    'anaphylaktischerschock': 'Anaphylaktischer Schock (Anaphylaxie)', 'anaphylaxis': 'Anaphylaktischer Schock (Anaphylaxie)',
    'reaktivearthritis': 'Reaktive Arthritis', 'reaktivearthritis1': 'Reaktive Arthritis',
    'poststreptokokkenreaktivearthritis': 'Reaktive Arthritis',
    'pertussis': 'Pertussis (Keuchhusten)', 'pertusis': 'Pertussis (Keuchhusten)',

    # --- 5e passe : cibles ajoutées par le lot-21
    'colitisulcerosa': 'Colitis ulcerosa',
    'chronischepankreatitis': 'Chronische Pankreatitis',
    'myokarditispostcovid19': 'Akute Myokarditis',
}
# titres qui ne désignent pas un cas exploitable
IGNORE = {'karlsruhe', 'akutesabdomen', 'fahradunfall'}

def norm(s):
    # NFC : certains titres portent un tréma combinant, d'autres un ä précomposé
    s = unicodedata.normalize('NFC', s).lower()
    for a, b in (('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')):
        s = s.replace(a, b)
    return re.sub(r'[^a-z0-9]', '', s)

def main():
    titles = []
    for f in glob.glob(os.path.join(ROOT, '00 FSP *.md')):
        for line in open(f, encoding='utf-8', errors='ignore'):
            m = re.match(r'^##\s*\[?\s*(?:[\dx]{2}\.[\dx]{2}\.\d{4})\s+(.+?)\]?\(?#?index?\)?\s*$', line.strip())
            if m: titles.append(re.sub(r'\s+', ' ', m.group(1).strip(' []')))

    seed = open(SEED, encoding='utf-8').read()
    cov = re.findall(r"pathology: '([^']+)'", seed)
    covn = {norm(c): c for c in cov}

    def resolve(t):
        n = norm(t)
        if n in IGNORE: return 'IGNORE'
        if n in covn: return covn[n]
        if n in ALIAS:
            target = ALIAS[n]
            return target if norm(target) in covn else None
        for cn, c in covn.items():          # inclusion stricte, sans partage de mots
            if cn and (cn in n or n in cn): return c
        return None

    done, todo = collections.Counter(), collections.Counter()
    for t in titles:
        r = resolve(t)
        if r == 'IGNORE': continue
        (done if r else todo)[t] += 1

    tot = sum(done.values()) + sum(todo.values())
    print(f'{tot} protocoles exploitables · {len(cov)} cas au corpus')
    print(f'couverts   : {sum(done.values()):4d} ({100*sum(done.values())//tot} %)')
    print(f'restants   : {sum(todo.values()):4d} protocoles, {len(todo)} intitulés\n')
    print('=== PATHOLOGIES RESTANTES ===')
    for t, n in sorted(todo.items(), key=lambda x: (-x[1], x[0])): print(f'{n:3d}  {t}')

if __name__ == '__main__':
    main()
