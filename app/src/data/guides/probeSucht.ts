import type { Signe } from './signesDefs';

// ============================================================================
// `PROBE_SUCHT` — ce que CHAQUE sonde cherche. K1 (ADR-0023, contrat
// `frage-atomique.md` §10.2, INV-79). Une seule table, TOTALE : toute sonde de
// `PROBE_BY_ID` y figure avec au moins un signe (la porte `checkCoherence` le vérifie).
//
// • Elle absorbe `SUCHT_AFFINE` (K0) : les banques sont mono-signe (INV-77) et les
//   paires de granularité disjointes (INV-78).
// • Règle d'identité : deux unités cherchent le même signe ssi la fiche y répondrait
//   par la même réplique. D1 : une énumération cherche CHAQUE signe qu'elle nomme.
// • Une relance de PRÉCISION (quand, combien, où, quelle couleur…) hérite du signe de sa
//   mère ; une relance qui cherche un autre signe le déclare dans `followUpSucht` de la
//   phrase (anamneseChapters.ts) et devient une unité à part.
// • Une phrase qui énumère autre chose que sa sonde (les variantes d'`akt-begleit`)
//   porte son propre `sucht` ; ici, la sonde dit ce qu'elle est.
// • Le montage ne la lit PAS encore : `dedupeBySymptom` lit `SUCHT_MONTAGE`
//   (symptoms.ts) jusqu'à K3, qui remplace l'un et l'autre par `cohere`.
// ============================================================================
export type Sucht = readonly [Signe, ...Signe[]];

export const PROBE_SUCHT: Readonly<Record<string, Sucht>> = {
  // --- Persönliche Daten, Motif -----------------------------------------------
  'pers-name': ['name'], 'pers-alter': ['alter'], 'pers-groesse': ['koerpermasse'], 'pers-hausarzt': ['hausarzt'],
  'akt-motiv': ['motiv'],
  // --- Aktuelle Beschwerden : les dimensions (banques) -------------------------
  'akt-ort': ['ort'], 'akt-beginn': ['beginn'], 'akt-charakter': ['charakter'], 'akt-intensitaet': ['intensitaet'],
  'akt-ausstrahlung': ['ausstrahlung'], 'akt-verlauf': ['verlauf'], 'akt-ausloeser': ['ausloeser'],
  'akt-einfluss': ['einfluss'], 'akt-frueher': ['frueher'], 'akt-begleit': ['begleit'],
  // --- Aktuelle Beschwerden : les variantes par nature --------------------------
  'akt-atemnot-belastung': ['atemnot'], 'akt-atemnot-nachts': ['orthopnoe', 'dpn'], 'akt-atemnot-husten': ['husten'],
  'akt-atemnot-geraeusch': ['giemen'],
  'akt-allgemein-art': ['muedigkeit', 'schwindel'],   // « Müdigkeit, Kraftlosigkeit, Schwindel » (D1)
  'akt-allgemein-alltag': ['leistung'], 'akt-allgemein-tageszeit': ['tageszeit'],
  'akt-allgemein-gewicht': ['gewicht', 'appetit', 'durst'],   // K3 : l'unité = la question ET sa relance « Und Ihr Appetit, Ihr Durst? » (précision, reste sous sa mère) ; ses parts suivent
  'akt-allgemein-schwellung': ['oedeme'],
  'akt-psych-stimmung': ['stimmung'], 'akt-psych-antrieb': ['antrieb'], 'akt-psych-schlaf': ['schlaf'], 'akt-psych-sicherheit': ['suizid'],
  'akt-neuro-ausfall': ['schwaeche', 'taubheit', 'sprache', 'sehstoerung', 'gang'], 'akt-neuro-dauer': ['dauer'], 'akt-neuro-lage': ['lageabhaengig'],
  'akt-nerven-art': ['taubheit', 'schwaeche'], 'akt-nerven-alltag': ['feinmotorik', 'sturz'], 'akt-nerven-tageszeit': ['tageszeit'],
  'akt-infekt-fieber': ['fieber'], 'akt-infekt-kontakt': ['reise'],   // K3 : « Kontakt » et « Essen » sont des relances de PRÉCISION (elles suivent la question, sans signe propre)
  'akt-infekt-herd': ['husten', 'halsschmerzen', 'miktion', 'stuhl', 'ausschlag', 'wunde'],   // énumération (D1)
  'akt-veraend-was': ['knoten', 'ausschlag', 'lokalblutung', 'haematome'],
  'akt-veraend-entwicklung': ['entwicklung'], 'akt-veraend-blutung': ['lokalschmerz', 'juckreiz', 'lokalblutung', 'stuhlaussehen', 'urin_aspekt', 'haemoptyse'],   // K3 : ses relances (Blut im Stuhl / Urin, Blut abhusten) précisent « blutet es »
  'akt-ausscheid-was': ['stuhl', 'miktion', 'gelbfaerbung', 'urin_aspekt', 'stuhlaussehen'],   // D1
  'akt-ausscheid-haeufigkeit': ['stuhlfrequenz'], 'akt-ausscheid-harn-haeufigkeit': ['miktion_frequenz', 'nykturie'],
  'akt-ausscheid-aussehen': ['stuhlaussehen'], 'akt-ausscheid-harn-aussehen': ['urin_aspekt'],
  'akt-ausscheid-schlucken': ['schluck'],
  'akt-anfall-ablauf': ['anfallsablauf'], 'akt-anfall-dauer': ['dauer'], 'akt-anfall-bewusstsein': ['bewusstlos'],
  // --- Vegetative Anamnese ------------------------------------------------------
  'veg-fieber': ['fieber', 'reise'],   // parts : fieber / reise
  'veg-schuettelfrost': ['schuettelfrost', 'nachtschweiss', 'schwitzen'], 'veg-uebelkeit': ['uebelkeit'],
  'veg-ausscheidung': ['stuhl', 'miktion'],   // la mère seule : fréquence et aspect ne sont demandés que par la relance « Falls ja » (revue K2 m2, esprit d'INV-84)
  'veg-gewicht': ['gewicht'], 'veg-appetit': ['appetit'], 'veg-schlaf': ['schlaf'],
  // --- Vorerkrankungen, Medikamente, Allergien, Noxen, Familie & Sozial ---------
  'vor-erkrank': ['vorerkrankung'], 'vor-op': ['operation'], 'vor-krankenhaus': ['krankenhaus'],
  'med-regelmaessig': ['medikation'], 'med-blutverduenner': ['antikoagulation', 'kortison'], 'med-otc': ['selbstmedikation'],
  'all-allergie': ['allergie'], 'all-unvertraeglich': ['unvertraeglichkeit'],
  'nox-rauchen': ['rauchen'], 'nox-alkohol': ['alkohol'], 'nox-drogen': ['drogen'],
  'fam-familie': ['familie_krank'], 'fam-eltern': ['eltern'], 'fam-stand': ['familienstand', 'kinder'],
  'fam-beruf': ['beruf', 'stress'], 'pers-beruf': ['berufsstoffe'], 'fam-wohnen': ['wohnsituation'], 'fam-haustiere': ['haustiere'],
  // --- Frauenanamnese -----------------------------------------------------------
  'frau-periode': ['zyklus'], 'frau-schwanger': ['schwangerschaft'], 'frau-verhuetung': ['verhuetung'], 'frau-wechseljahre': ['wechseljahre'],
  // --- Fach Gastroenterologie ---------------------------------------------------
  'fach-gastro-uebelkeit': ['uebelkeit'], 'fach-gastro-sodbrennen': ['sodbrennen'], 'fach-gastro-voelle': ['voellegefuehl'],
  'fach-gastro-speisen': ['speisen', 'essen_expo'], 'fach-gastro-stuhl': ['stuhl', 'stuhlaussehen'],   // K2 : « Welche Farbe (blutig, teerschwarz, hell) » = l'aspect des selles (D1)
  'fach-gastro-tenesmen': ['tenesmen'],
  'fach-gastro-spiegelung': ['spiegelung'],
  // --- Fach Kardiologie ---------------------------------------------------------
  'fach-kardio-brust': ['brustschmerz'], 'fach-kardio-belastung': ['belastung', 'dauer'], 'fach-kardio-ausstrahlung': ['ausstrahlung'],
  'fach-kardio-atem': ['lageabhaengig'], 'fach-kardio-nitro': ['nitro'], 'fach-kardio-herzrasen': ['herzrasen'],
  'fach-kardio-luft': ['atemnot'], 'fach-kardio-oedeme': ['oedeme', 'orthopnoe'], 'fach-kardio-nykturie': ['nykturie'],
  'fach-kardio-synkope': ['bewusstlos'],
  // --- Fach Chirurgie -----------------------------------------------------------
  'fach-chir-essen': ['nuechternheit'], 'fach-chir-ileus': ['stuhl', 'windabgang'], 'fach-chir-op': ['bauch_op'],
  'fach-chir-gallensteine': ['gallensteine'],
  // --- Fach Psychiatrie ---------------------------------------------------------
  'fach-psych-stimmung': ['stimmung'], 'fach-psych-interesse': ['interesse'], 'fach-psych-antrieb': ['antrieb'],
  'fach-psych-schlaf': ['schlaf'], 'fach-psych-tagesverlauf': ['tageszeit'], 'fach-psych-konzentration': ['konzentration'],
  'fach-psych-angst': ['angst', 'panikattacke'], 'fach-psych-suizid': ['suizid', 'selbstverletzung', 'selbstverletzung_wunsch'],   // K3 SÉCURITÉ : idéation, acte, désir d'automutilation — une unité, trois signes, jamais retirés (RISIKO_SIGNES)
  'fach-psych-ausloeser': ['ausloeser'], 'fach-psych-frueher': ['frueher'],
  // --- Fach Pneumologie ---------------------------------------------------------
  'fach-pneumo-husten': ['husten', 'auswurf', 'stimme', 'verschlucken'], 'fach-pneumo-auswurf': ['auswurf_aspekt', 'haemoptyse'], 'fach-pneumo-atemnot': ['atemnot'],   // fach-pneumo-auswurf, revue K1 C2 : la seule hémoptysie de la Lungenembolie
  'fach-pneumo-orthopnoe': ['orthopnoe', 'dpn', 'schlafapnoe'], 'fach-pneumo-schmerz': ['brustschmerz', 'atemabhaengig'],
  'fach-pneumo-fieber': ['fieber', 'schuettelfrost'], 'fach-pneumo-giemen': ['giemen'],
  'fach-pneumo-infekt': ['atemwegsinfekt', 'kontakt', 'reise'], 'fach-pneumo-noxen': ['lungennoxen'], 'fach-pneumo-allergie': ['atopie', 'asthma'],   // revue K1 C1 : ≠ all-allergie (pénicilline), que K3 ne doit pas retirer
  // --- Fach Infektiologie -------------------------------------------------------
  'fach-infekt-fieber': ['fieber'], 'fach-infekt-zecke': ['zecke', 'insektenstich'],   // K2 (revue clinique C3)
  'fach-infekt-haut': ['ausschlag', 'erythem_ring'],
  'fach-infekt-gelenke': ['arthralgie', 'gelenke'],   // K2 : « Wandern sie von Gelenk zu Gelenk ? » cherche aussi le schéma articulaire (D1)
  'fach-infekt-neuro': ['kopfschmerz', 'meningismus', 'taubheit', 'fazialis'],
  'fach-infekt-reise': ['reise'], 'fach-infekt-kontakt': ['kontakt', 'essen_expo'], 'fach-infekt-impfung': ['impfung'],
  // --- Fach Urologie ------------------------------------------------------------
  'fach-uro-miktion': ['miktion'], 'fach-uro-frequenz': ['miktion_frequenz', 'nykturie'], 'fach-uro-drang': ['drang', 'inkontinenz'],
  'fach-uro-farbe': ['urin_aspekt'], 'fach-uro-flanke': ['flankenschmerz', 'ausstrahlung'], 'fach-uro-fieber': ['fieber', 'schuettelfrost'],
  'fach-uro-strahl': ['harnstrahl'], 'fach-uro-sexualanamnese': ['sexualanamnese', 'std_vorgeschichte'], 'fach-uro-funktion': ['sexualfunktion', 'blutung'],
  'fach-uro-vorgeschichte': ['harnwegsinfekt', 'nierensteine', 'prostata'],
  // --- Fach Orthopädie ----------------------------------------------------------
  'fach-ortho-mechanismus': ['unfallhergang', 'bewusstlos', 'begleitverletzung'], 'fach-ortho-bewegung': ['bewegungsschmerz', 'ruheschmerz'], 'fach-ortho-ausstrahlung': ['ausstrahlung'],
  'fach-ortho-sensomotorik': ['taubheit', 'schwaeche'], 'fach-ortho-durchblutung': ['durchblutung'], 'fach-ortho-cauda': ['sattel', 'miktion', 'stuhl'],
  'fach-ortho-schwellung': ['gelenk_entzuendung', 'haematome'], 'fach-ortho-belastung': ['belastbarkeit'], 'fach-ortho-vorgeschichte': ['ortho_vorgeschichte'],
  // --- Fach Rheumatologie -------------------------------------------------------
  'fach-rheuma-gelenke': ['gelenke'], 'fach-rheuma-morgensteifigkeit': ['steifigkeit'], 'fach-rheuma-entzuendung': ['gelenk_entzuendung'],
  'fach-rheuma-verlauf': ['beginn_art'], 'fach-rheuma-ausloeser': ['ausloeser'], 'fach-rheuma-haut': ['ausschlag'],   // fach-rheuma-verlauf, « plötzlich und anfallsartig, oder langsam » : le MODE de début (K3), pas la date d'akt-beginn
  'fach-rheuma-systemisch': ['fieber', 'augenentzuendung', 'ulzera', 'stuhl', 'ausschlag'], 'fach-rheuma-vorgeschichte': ['frueher'],
  // --- Fach Neurologie ----------------------------------------------------------
  'fach-neuro-sehen': ['sehstoerung'], 'fach-neuro-sensibilitaet': ['taubheit'], 'fach-neuro-kraft': ['schwaeche'],
  'fach-neuro-koordination': ['schwindel', 'gang', 'sturz'], 'fach-neuro-sprache': ['sprache', 'schluck'],
  'fach-neuro-blase': ['miktion', 'stuhl', 'drang', 'inkontinenz'], 'fach-neuro-anfall': ['krampf', 'bewusstlos'],
  'fach-neuro-verlauf': ['schub', 'waerme'], 'fach-neuro-kopfschmerz': ['kopfschmerz'], 'fach-neuro-aura': ['aura'],
  'fach-neuro-autonom': ['autonome_zeichen'], 'fach-neuro-anfallzeichen': ['anfallszeichen'],
  // --- Fach Endokrinologie ------------------------------------------------------
  'fach-endo-durst': ['durst', 'polyurie', 'nykturie'], 'fach-endo-gewicht': ['gewicht', 'appetit'],
  'fach-endo-temperatur': ['schwitzen', 'temperaturtoleranz'], 'fach-endo-herz-nerven': ['herzrasen', 'tremor', 'unruhe', 'antrieb', 'muedigkeit'],
  'fach-endo-hals': ['halsschwellung', 'schluck', 'stimme'], 'fach-endo-augen': ['augenveraenderung', 'sehstoerung'],
  'fach-endo-haut-haare': ['haut_haare'], 'fach-endo-unterzucker': ['hypoglykaemie'],
  'fach-endo-folgeschaeden': ['taubheit', 'sehstoerung', 'nierenprobleme'], 'fach-endo-familie-therapie': ['familie_endokrin', 'endokrine_therapie'],
  // --- Fach Hämatologie ---------------------------------------------------------
  'fach-haem-leistung': ['muedigkeit', 'leistung', 'blaesse'], 'fach-haem-belastung': ['atemnot', 'herzrasen', 'schwindel'],
  'fach-haem-blutung': ['blutungsneigung', 'haematome'], 'fach-haem-blutverlust': ['blutverlust', 'stuhlaussehen'],
  'fach-haem-ernaehrung': ['ernaehrung'], 'fach-haem-bsymptomatik': ['fieber', 'nachtschweiss', 'gewicht'],
  'fach-haem-lymphknoten': ['lymphknoten'], 'fach-haem-infekte': ['infektneigung', 'fieber', 'wundheilung'],
  'fach-haem-knochen': ['knochenschmerz'], 'fach-haem-thrombose': ['thrombose_vorgeschichte', 'familie_thrombose'],
  // --- Fach Dermatologie --------------------------------------------------------
  'fach-derma-beginn-ort': ['ort', 'ausbreitung'], 'fach-derma-empfinden': ['juckreiz', 'lokalschmerz'], 'fach-derma-aussehen': ['hautbefund'],
  'fach-derma-ausloeser': ['ausloeser'], 'fach-derma-verlauf': ['verlauf'], 'fach-derma-systemisch': ['fieber', 'arthralgie', 'ulzera', 'augenentzuendung'],
  'fach-derma-vorgeschichte': ['hautvorgeschichte', 'familie_haut'], 'fach-derma-muttermal': ['muttermal', 'juckreiz', 'lokalblutung', 'vorsorge_krebs'], 'fach-derma-vorbehandlung': ['vorbehandlung'],
  // --- Fach Gynäkologie ---------------------------------------------------------
  'fach-gyn-blutung': ['vaginalblutung'], 'fach-gyn-unterbauch': ['unterbauchschmerz'], 'fach-gyn-fluor': ['fluor'], 'fach-gyn-dyspareunie': ['dyspareunie', 'miktion'],
  'fach-gyn-schwangerschaften': ['geburten'], 'fach-gyn-kinderwunsch': ['kinderwunsch'], 'fach-gyn-brust': ['brust'],
  'fach-gyn-vorsorge': ['vorsorge_gyn'], 'fach-gyn-eingriffe': ['gyn_op', 'hormone'],
  // --- Fach Angiologie ----------------------------------------------------------
  'fach-gefaess-gehstrecke': ['gehstrecke'], 'fach-gefaess-ruheschmerz': ['ruheschmerz'], 'fach-gefaess-schwellung': ['beinschwellung'],
  'fach-gefaess-immobilisation': ['immobilisation'], 'fach-gefaess-hormone': ['hormone', 'schwangerschaft'],
  'fach-gefaess-thrombose': ['thrombose_vorgeschichte', 'familie_thrombose'], 'fach-gefaess-wunde': ['wundheilung', 'durchblutung'],
  'fach-gefaess-vorgeschichte': ['gefaess_vorgeschichte'],
  // --- Fach Nephrologie ---------------------------------------------------------
  'fach-nephro-menge': ['miktion_frequenz', 'urinmenge', 'nykturie'], 'fach-nephro-aussehen': ['urin_aspekt'], 'fach-nephro-oedeme': ['oedeme', 'gewicht'],
  'fach-nephro-blutdruck': ['blutdruck'], 'fach-nephro-nephrotoxisch': ['nephrotoxika'], 'fach-nephro-uraemie': ['juckreiz', 'uebelkeit', 'appetit', 'geschmack'],
  'fach-nephro-infekt': ['vorinfekt'], 'fach-nephro-vorgeschichte': ['nierenvorgeschichte', 'familie_niere'],
  // --- Fach Onkologie -----------------------------------------------------------
  'fach-onko-bsymptomatik': ['fieber', 'nachtschweiss', 'gewicht'], 'fach-onko-leistung': ['leistung'], 'fach-onko-schmerz': ['ruheschmerz'],
  'fach-onko-knoten': ['knoten'], 'fach-onko-blutung': ['stuhlaussehen', 'urin_aspekt', 'haemoptyse', 'vaginalblutung'], 'fach-onko-appetit': ['schluck', 'voellegefuehl', 'appetit'],   // fach-onko-blutung, D1 : « im Stuhl, im Urin, beim Husten, aus der Scheide »
  'fach-onko-vorbehandlung': ['tumor_vorgeschichte'], 'fach-onko-familie': ['familie_krebs'], 'fach-onko-vorsorge': ['vorsorge_krebs'],
};
