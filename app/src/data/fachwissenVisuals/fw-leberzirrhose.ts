// Spec visuelle — Leberzirrhose (Gastroenterologie). Voir contrat §1, §10.
// Lot Lc1 (FB3-G6) : la silhouette anatomique est remplacée par une carte de
// syndrome (les deux piliers : insuffisance hépatique, hypertension portale) ;
// la frise « Stadium 1–4 » (ordre inexistant entre les complications) par un
// arbre « quel signe → quelle complication → quel premier geste ».
// Score-gauge Child-Pugh : les seuils par critère ne figurent pas dans la
// fiche → `source: 'ergänzt'`, relus (reviewed.ts).

import type { FachwissenVisualSpec } from './types';

const K = {
  allgemein: 'Allgemeinsymptome: Müdigkeit, Leistungsknick (Adynamie), Inappetenz, Muskelschwund (Sarkopenie) — der Gewichtsverlust wird durch Wassereinlagerung oft verdeckt',
  synthese: 'Syntheseschwäche: Hämatome und Blutungsneigung (Gerinnungsfaktoren↓, Thrombozytopenie), Ödeme durch Hypalbuminämie',
  ikterus: 'Ikterus (zuerst an den Skleren), Juckreiz, dunkler Urin, heller Stuhl',
  haut: 'Leberhautzeichen: Spider naevi, Palmarerythem, Lacklippen und Lackzunge, Weißnägel',
  hormone: 'Verminderter Östrogenabbau beim Mann: Gynäkomastie, Hodenatrophie, Potenzverlust, Verlust der Bauchbehaarung (Bauchglatze)',
  portal: 'Portale Hypertension: Aszites mit Zunahme des Bauchumfangs, Splenomegalie, Umgehungskreisläufe (Ösophagus- und Fundusvarizen, Caput medusae)',
  he: 'Hepatische Enzephalopathie: Schlafumkehr, Konzentrationsstörung, Verwirrtheit, Flapping tremor (Asterixis), Foetor hepaticus',
} as const;

const RF = {
  varizen: 'Hämatemesis oder Meläna → Verdacht auf Ösophagusvarizenblutung',
  he: 'zunehmende Somnolenz, Asterixis, Verwirrtheit → hepatische Enzephalopathie',
  sbp: 'Fieber und Bauchschmerz bei Aszites → spontan bakterielle Peritonitis (Punktion!)',
  hrs: 'Oligurie und Kreatininanstieg → hepatorenales Syndrom',
} as const;

const KOMPLIKATIONEN =
  'Prophylaxe und Therapie der Dekompensationskomplikationen (Varizen, SBP, Enzephalopathie, hepatorenales Syndrom)';

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-leberzirrhose',
  version: 1,
  blocks: [
    {
      id: 'syndrome-zirrhose',
      kind: 'syndrome-map',
      title: 'Leberinsuffizienz und portale Hypertension',
      anchor: 'klinik',
      replaces: Object.values(K).map((text) => ({ section: 'klinik' as const, text })),
      data: {
        center: 'Leberzirrhose',
        spokes: [
          {
            label: 'Syntheseschwäche',
            items: [
              { text: 'Hämatome, Blutungsneigung (INR↑)', source: { section: 'klinik', text: K.synthese } },
              { text: 'Ödeme durch Albuminmangel', source: { section: 'klinik', text: K.synthese } },
            ],
          },
          {
            label: 'Portale Hypertension',
            items: [
              { text: 'Aszites, wachsender Bauchumfang', source: { section: 'klinik', text: K.portal } },
              { text: 'Splenomegalie mit Thrombozytopenie', source: { section: 'klinik', text: K.portal } },
              { text: 'Ösophagus- und Fundusvarizen, Caput medusae', source: { section: 'klinik', text: K.portal } },
            ],
          },
          {
            label: 'Entgiftungsstörung',
            items: [
              { text: 'Ikterus, Juckreiz', source: { section: 'klinik', text: K.ikterus } },
              { text: 'Enzephalopathie: Schlafumkehr, Asterixis', source: { section: 'klinik', text: K.he } },
              { text: 'Spider naevi, Palmarerythem', source: { section: 'klinik', text: K.haut } },
              { text: 'Gynäkomastie, Bauchglatze', source: { section: 'klinik', text: K.hormone } },
            ],
          },
          {
            label: 'Allgemein',
            items: [
              { text: 'Müdigkeit, Leistungsknick, Inappetenz', source: { section: 'klinik', text: K.allgemein } },
              { text: 'Muskelschwund, durch Wasser verdeckt', source: { section: 'klinik', text: K.allgemein } },
            ],
          },
        ],
      },
    },
    {
      id: 'gauge-child-pugh',
      kind: 'score-gauge',
      title: 'Child-Pugh-Score',
      anchor: 'klassifikation',
      replaces: [{ section: 'klassifikation', name: 'Child-Pugh' }],
      data: {
        score: { name: 'Child-Pugh', ref: { section: 'klassifikation', name: 'Child-Pugh' } },
        interactive: true,
        unit: 'Punkte',
        criteria: [
          { label: 'Bilirubin (mg/dl)', points: [1, 2, 3], choices: ['< 2', '2–3', '> 3'], source: 'ergänzt' },
          { label: 'Albumin (g/dl)', points: [1, 2, 3], choices: ['> 3,5', '2,8–3,5', '< 2,8'], source: 'ergänzt' },
          { label: 'INR', points: [1, 2, 3], choices: ['< 1,7', '1,7–2,3', '> 2,3'], source: 'ergänzt' },
          { label: 'Aszites', points: [1, 2, 3], choices: ['keiner', 'leicht', 'ausgeprägt'], source: 'ergänzt' },
          { label: 'Enzephalopathie', points: [1, 2, 3], choices: ['keine', 'Grad I–II', 'Grad III–IV'], source: 'ergänzt' },
        ],
        bands: [
          { label: 'Child A', min: 5, max: 6, tone: 'neutral', source: { section: 'klassifikation', name: 'Child-Pugh' } },
          { label: 'Child B', min: 7, max: 9, tone: 'warn', source: { section: 'klassifikation', name: 'Child-Pugh' } },
          { label: 'Child C', min: 10, max: 15, tone: 'signal', source: { section: 'klassifikation', name: 'Child-Pugh' } },
        ],
      },
    },
    {
      id: 'tree-dekompensation',
      kind: 'decision-tree',
      title: 'Dekompensation: vom Leitzeichen zur Komplikation',
      anchor: 'redFlags',
      merke: 'Jede Dekompensation hat einen Auslöser — Blutung, Infekt, Alkohol, Medikamente: immer suchen.',
      replaces: Object.values(RF).map((text) => ({ section: 'redFlags' as const, text })),
      data: {
        root: {
          question: 'Bekannte Zirrhose — welches neue Leitzeichen?',
          source: { section: 'therapie', label: KOMPLIKATIONEN },
          branches: [
            {
              label: 'Hämatemesis, Meläna',
              child: {
                answer: 'Ösophagusvarizenblutung — Notfall',
                text: 'Kreislauf stabilisieren, Terlipressin, Ceftriaxon, Ligatur in der ÖGD innerhalb von 12 Stunden.',
                source: { section: 'redFlags', text: RF.varizen },
                tone: 'signal',
              },
            },
            {
              label: 'Fieber, Bauchschmerz bei Aszites',
              child: {
                question: 'Punktat: ab 250 neutrophile Granulozyten/µl?',
                source: { section: 'diagnostik', stufe: 'Invasiv & Speziell' },
                branches: [
                  {
                    label: 'ja',
                    child: {
                      answer: 'Spontan bakterielle Peritonitis',
                      text: 'Cephalosporin der 3. Generation plus Albumin an Tag 1 und 3, danach Sekundärprophylaxe.',
                      source: { section: 'redFlags', text: RF.sbp },
                    },
                  },
                  {
                    label: 'nein',
                    child: {
                      answer: 'Keine SBP',
                      text: 'Andere Infektquelle suchen.',
                      source: { section: 'diagnostik', stufe: 'Invasiv & Speziell' },
                    },
                  },
                ],
              },
            },
            {
              label: 'Verwirrtheit, Asterixis',
              child: {
                answer: 'Hepatische Enzephalopathie',
                text: 'Auslöser beseitigen (Blutung, Infekt, Obstipation, Elektrolyte, Sedativa), Lactulose, ggf. Rifaximin.',
                source: { section: 'redFlags', text: RF.he },
              },
            },
            {
              label: 'Oligurie, Kreatininanstieg',
              child: {
                answer: 'Hepatorenales Syndrom',
                text: 'Diuretika und Nephrotoxine absetzen, Terlipressin plus Albumin.',
                source: { section: 'redFlags', text: RF.hrs },
              },
            },
          ],
        },
      },
    },
  ],
};
