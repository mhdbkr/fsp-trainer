// Spec visuelle — KHK / Angina pectoris (Kardiologie). Voir contrat §1, §10.

import type { FachwissenVisualSpec } from './types';

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-khk',
  version: 1,
  blocks: [
    {
      id: 'tree-ap',
      kind: 'decision-tree',
      title: 'Stabile vs. instabile Angina pectoris',
      anchor: 'klinik',
      replaces: [{ section: 'diagnostik', stufe: 'Labor' }],
      data: {
        root: {
          question: 'Thoraxschmerz reproduzierbar bei definierter Belastung, Besserung in Ruhe?',
          source: { section: 'klinik', text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
          branches: [
            {
              label: 'ja',
              child: {
                answer: 'Stabile Angina pectoris',
                source: { section: 'klinik', text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
                text: 'Ambulante Abklärung, Belastungs-EKG/Bildgebung.',
              },
            },
            {
              label: 'nein',
              child: {
                question: 'Neu aufgetreten, in Ruhe oder zunehmend?',
                source: { section: 'klinik', text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!' },
                branches: [
                  {
                    label: 'ja',
                    child: {
                      question: 'Troponin erhöht oder EKG-Veränderungen?',
                      source: { section: 'diagnostik', stufe: 'Labor' },
                      branches: [
                        {
                          label: 'ja',
                          child: {
                            answer: 'Akutes Koronarsyndrom (ACS)',
                            source: { section: 'differenzialdiagnosen', dd: 'Akuter Myokardinfarkt / ACS' },
                            text: 'Notfall: sofortige Klinikeinweisung, Monitoring.',
                            tone: 'signal',
                          },
                        },
                        {
                          label: 'nein',
                          child: {
                            answer: 'Instabile Angina pectoris',
                            source: { section: 'klinik', text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!' },
                            text: 'Stationäre Überwachung, engmaschige Kontrolle.',
                          },
                        },
                      ],
                    },
                  },
                  {
                    label: 'nein',
                    child: {
                      answer: 'Andere Ursache prüfen',
                      source: { section: 'klinik', text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
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
      title: 'Stabile AP · Instabile AP / ACS',
      anchor: 'differenzialdiagnosen',
      replaces: [
        { section: 'differenzialdiagnosen', dd: 'Akuter Myokardinfarkt / ACS' },
        { section: 'klinik', text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
        { section: 'klinik', text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!' },
      ],
      data: {
        columns: ['Stabile AP', 'Instabile AP / ACS'],
        rows: [
          {
            criterion: 'Auslöser',
            cells: ['Reproduzierbar bei definierter Belastung', 'Neu, in Ruhe oder zunehmend'],
            source: { section: 'klinik', text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
          },
          {
            criterion: 'Dauer / Verlauf',
            cells: ['Besserung in Ruhe/auf Nitro', 'Ruheschmerz >20 min'],
            source: { section: 'differenzialdiagnosen', dd: 'Akuter Myokardinfarkt / ACS' },
            emphasis: 1,
          },
          {
            criterion: 'Troponin / EKG',
            cells: ['Unauffällig', 'Troponin↑, EKG-Veränderungen'],
            source: { section: 'differenzialdiagnosen', dd: 'Akuter Myokardinfarkt / ACS' },
            emphasis: 1,
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
