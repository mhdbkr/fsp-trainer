// Spec visuelle — KHK / Angina pectoris (Kardiologie). Voir contrat §1, §10.
// Lc2 : l'arbre exclut d'abord l'ACS (ST-Hebung, puis hs-Troponin) — la version
// précédente classait l'instabile AP hors de l'ACS ; le tableau sépare
// instabile AP (Troponin normal) et NSTEMI/STEMI.

import type { FachwissenVisualSpec } from './types';

const STABIL = { section: 'klinik', text: 'Stabile AP: reproduzierbar bei definierter Belastung' } as const;
const INSTABIL = { section: 'klinik', text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!' } as const;
const ACS = { section: 'differenzialdiagnosen', dd: 'Akuter Myokardinfarkt / ACS' } as const;

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-khk',
  version: 1,
  blocks: [
    {
      id: 'tree-ap',
      kind: 'decision-tree',
      title: 'Stabile vs. instabile Angina pectoris',
      anchor: 'klinik',
      replaces: [],
      merke: 'Instabile Angina, NSTEMI und STEMI sind alle ein akutes Koronarsyndrom.',
      data: {
        root: {
          question: 'Beschwerden neu, in Ruhe oder zunehmend?',
          source: INSTABIL,
          branches: [
            {
              label: 'ja',
              child: {
                question: 'ST-Hebungen im EKG?',
                source: ACS,
                branches: [
                  {
                    label: 'ja',
                    child: {
                      answer: 'STEMI',
                      source: ACS,
                      text: 'Notfall: sofortige Koronarangiographie mit PCI.',
                      tone: 'signal',
                    },
                  },
                  {
                    label: 'nein',
                    child: {
                      question: 'hs-Troponin erhöht?',
                      source: { section: 'diagnostik', stufe: 'Labor' },
                      branches: [
                        {
                          label: 'ja',
                          child: {
                            answer: 'NSTEMI',
                            source: ACS,
                            text: 'Stationär, Monitoring, Koronarangiographie.',
                            tone: 'warn',
                          },
                        },
                        {
                          label: 'nein',
                          child: {
                            answer: 'Instabile Angina pectoris',
                            source: INSTABIL,
                            text: 'Ebenfalls ein ACS: stationär, Monitoring.',
                            tone: 'warn',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            {
              label: 'nein',
              child: {
                question: 'Reproduzierbar bei definierter Belastung, Besserung in Ruhe?',
                source: STABIL,
                branches: [
                  {
                    label: 'ja',
                    child: {
                      answer: 'Stabile Angina pectoris',
                      source: STABIL,
                      text: 'Elektive Abklärung nach klinischer Wahrscheinlichkeit.',
                    },
                  },
                  {
                    label: 'nein',
                    child: {
                      answer: 'Andere Ursache prüfen',
                      source: STABIL,
                      text: 'Differenzialdiagnosen erwägen.',
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    },
    {
      id: 'table-ap-acs',
      kind: 'compare-table',
      title: 'Stabile AP · Instabile AP · Myokardinfarkt',
      anchor: 'differenzialdiagnosen',
      replaces: [ACS, STABIL, INSTABIL],
      data: {
        columns: ['Stabile AP', 'Instabile AP', 'NSTEMI / STEMI'],
        rows: [
          {
            criterion: 'Auslöser',
            cells: ['Definierte Belastung, reproduzierbar', 'Neu, in Ruhe oder zunehmend', 'Meist in Ruhe'],
            source: STABIL,
          },
          {
            criterion: 'Dauer',
            cells: ['Minuten, Besserung in Ruhe/auf Nitro', 'Länger, auch in Ruhe', 'Ruheschmerz >20 min'],
            source: ACS,
            emphasis: 2,
          },
          {
            criterion: 'Troponin',
            cells: ['Normal', 'Normal', 'Erhöht'],
            source: ACS,
            emphasis: 2,
          },
          {
            criterion: 'EKG',
            cells: ['Meist unauffällig', 'Ohne ST-Hebung', 'STEMI: ST-Hebung'],
            source: ACS,
          },
        ],
      },
    },
    {
      id: 'toggles-therapie',
      kind: 'therapy-toggles',
      title: 'Therapie der KHK',
      anchor: 'therapie',
      replaces: [
        { section: 'therapie', label: 'Kupierung des Angina-pectoris-Anfalls' },
        {
          section: 'therapie',
          label:
            'Prognoseverbessernde Basistherapie (Risikofaktoren, Thrombozytenaggregationshemmung, Statin)',
        },
        { section: 'therapie', label: 'Antianginöse Dauertherapie zur Symptomkontrolle' },
        { section: 'therapie', label: 'Revaskularisation: PCI oder Bypass — Indikation und Verfahrenswahl' },
      ],
      data: {
        default: 0,
        options: [
          {
            label: 'Akuter Anfall',
            ref: { section: 'therapie', label: 'Kupierung des Angina-pectoris-Anfalls' },
            akut: true,
          },
          {
            label: 'Basistherapie',
            ref: {
              section: 'therapie',
              label:
                'Prognoseverbessernde Basistherapie (Risikofaktoren, Thrombozytenaggregationshemmung, Statin)',
            },
          },
          {
            label: 'Dauertherapie',
            ref: { section: 'therapie', label: 'Antianginöse Dauertherapie zur Symptomkontrolle' },
          },
          {
            label: 'Revaskularisation',
            ref: { section: 'therapie', label: 'Revaskularisation: PCI oder Bypass — Indikation und Verfahrenswahl' },
          },
        ],
      },
    },
  ],
};
