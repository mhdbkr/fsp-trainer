// Spec visuelle — Depression / depressive Episode (Psychiatrie). Contrat §1, §10.

import type { FachwissenVisualSpec } from './types';

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-depression',
  version: 1,
  blocks: [
    {
      id: 'syndrome-depression',
      kind: 'syndrome-map',
      title: 'Depressive Episode — ICD-10-Kriterien & Schweregrad',
      anchor: 'klinik',
      replaces: [
        {
          section: 'klinik',
          text: 'Gedrückte, niedergeschlagene Stimmung, Gefühl innerer Leere oder der "Gefühllosigkeit" (Hauptsymptom)',
        },
        {
          section: 'klinik',
          text: 'Interessen- und Freudlosigkeit (Anhedonie), Verlust von Freude an früher wichtigen Aktivitäten (Hauptsymptom)',
        },
        { section: 'klinik', text: 'Antriebsminderung, erhöhte Ermüdbarkeit, sozialer Rückzug (Hauptsymptom)' },
        { section: 'klinik', text: 'Konzentrations- und Aufmerksamkeitsstörung, Entscheidungsunfähigkeit' },
        { section: 'klinik', text: 'Vermindertes Selbstwertgefühl, Schuld- und Wertlosigkeitsgefühle' },
        {
          section: 'klinik',
          text: 'Somatisches Syndrom: Früherwachen, Morgentief (Morgenpessimum), psychomotorische Hemmung, Appetit- und Gewichtsverlust, Libidoverlust',
        },
        { section: 'klassifikation', name: 'ICD-10 F32 — Schweregrad' },
        {
          section: 'klinik',
          text: 'Suizidgedanken oder -handlungen ("Mir ist egal, ob ich lebe oder nicht")',
        },
        {
          section: 'redFlags',
          text: 'Akute Suizidalität mit konkreten Plänen, Vorbereitungen oder Ankündigungen (z. B. Sprungabsicht) → sofortige Sicherung, Patient nicht allein lassen',
        },
      ],
      data: {
        center: 'Depressive Episode ≥ 2 Wochen',
        spokes: [
          {
            label: 'Hauptsymptome',
            items: [
              {
                text: 'Gedrückte, niedergeschlagene Stimmung',
                source: {
                  section: 'klinik',
                  text: 'Gedrückte, niedergeschlagene Stimmung, Gefühl innerer Leere oder der "Gefühllosigkeit" (Hauptsymptom)',
                },
              },
              {
                text: 'Interessen- und Freudlosigkeit (Anhedonie)',
                source: {
                  section: 'klinik',
                  text: 'Interessen- und Freudlosigkeit (Anhedonie), Verlust von Freude an früher wichtigen Aktivitäten (Hauptsymptom)',
                },
              },
              {
                text: 'Antriebsminderung, erhöhte Ermüdbarkeit',
                source: {
                  section: 'klinik',
                  text: 'Antriebsminderung, erhöhte Ermüdbarkeit, sozialer Rückzug (Hauptsymptom)',
                },
              },
            ],
          },
          {
            label: 'Zusatzsymptome',
            items: [
              {
                text: 'Konzentrations- und Entscheidungsstörung',
                source: {
                  section: 'klinik',
                  text: 'Konzentrations- und Aufmerksamkeitsstörung, Entscheidungsunfähigkeit',
                },
              },
              {
                text: 'Vermindertes Selbstwertgefühl, Schuldgefühle',
                source: {
                  section: 'klinik',
                  text: 'Vermindertes Selbstwertgefühl, Schuld- und Wertlosigkeitsgefühle',
                },
              },
            ],
          },
          {
            label: 'Somatisches Syndrom',
            items: [
              {
                text: 'Früherwachen, Morgentief, Appetit-/Libidoverlust',
                source: {
                  section: 'klinik',
                  text: 'Somatisches Syndrom: Früherwachen, Morgentief (Morgenpessimum), psychomotorische Hemmung, Appetit- und Gewichtsverlust, Libidoverlust',
                },
              },
            ],
          },
          {
            label: 'Schweregrad',
            items: [
              {
                text: 'Leicht / mittelgradig / schwer nach Anzahl der Symptome (ICD-10 F32)',
                source: { section: 'klassifikation', name: 'ICD-10 F32 — Schweregrad' },
              },
            ],
          },
          {
            label: 'Red Flags',
            tone: 'signal',
            items: [
              {
                text: 'Suizidgedanken oder -handlungen erfragen',
                source: {
                  section: 'klinik',
                  text: 'Suizidgedanken oder -handlungen ("Mir ist egal, ob ich lebe oder nicht")',
                },
              },
              {
                text: 'Akute Suizidalität mit konkreten Plänen oder Vorbereitungen',
                source: {
                  section: 'redFlags',
                  text: 'Akute Suizidalität mit konkreten Plänen, Vorbereitungen oder Ankündigungen (z. B. Sprungabsicht) → sofortige Sicherung, Patient nicht allein lassen',
                },
              },
            ],
          },
        ],
      },
    },
    {
      id: 'toggles-therapie-depression',
      kind: 'therapy-toggles',
      title: 'Therapie der Depression',
      anchor: 'therapie',
      replaces: [
        { section: 'therapie', label: 'Psychotherapie & Basismaßnahmen' },
        { section: 'therapie', label: 'Pharmakotherapie' },
        { section: 'therapie', label: 'Bei Therapieresistenz / Krise' },
      ],
      data: {
        default: 0,
        options: [
          {
            label: 'Psychotherapie & Basis',
            ref: { section: 'therapie', label: 'Psychotherapie & Basismaßnahmen' },
          },
          {
            label: 'Pharmakotherapie',
            ref: { section: 'therapie', label: 'Pharmakotherapie' },
          },
          {
            label: 'Therapieresistenz / Krise',
            ref: { section: 'therapie', label: 'Bei Therapieresistenz / Krise' },
            akut: true,
          },
        ],
      },
    },
    {
      id: 'table-depression-dd',
      kind: 'compare-table',
      title: 'Depression · Dysthymie · Bipolar',
      anchor: 'differenzialdiagnosen',
      replaces: [
        { section: 'differenzialdiagnosen', dd: 'Bipolare affektive Störung' },
        { section: 'differenzialdiagnosen', dd: 'Dysthymie' },
        { section: 'klassifikation', name: 'Verlaufsformen' },
      ],
      data: {
        columns: ['Depression (F32/F33)', 'Dysthymie', 'Bipolare Störung'],
        rows: [
          {
            criterion: 'Dauer',
            cells: ['Episode ≥ 2 Wochen', 'Chronisch ≥ 2 Jahre', 'Episoden, wechselnd mit Manie/Hypomanie'],
            source: { section: 'klassifikation', name: 'Verlaufsformen' },
          },
          {
            criterion: 'Verlauf',
            cells: [
              'Einzeln (F32) oder rezidivierend (F33)',
              'Chronisch-leicht, ohne volle Episode',
              'Zyklisch, mit affektiven Polen',
            ],
            source: { section: 'klassifikation', name: 'Verlaufsformen' },
          },
          {
            criterion: 'Manie/Hypomanie',
            cells: ['Nein', 'Nein', 'Ja — anamnestisch zu erfragen'],
            source: { section: 'differenzialdiagnosen', dd: 'Bipolare affektive Störung' },
            emphasis: 2,
          },
          {
            criterion: 'Schweregrad',
            cells: [
              'Leicht bis schwer nach ICD-10 F32',
              'Immer leicht, ohne volle Ausprägung',
              'Abhängig von aktueller Phase',
            ],
            source: { section: 'differenzialdiagnosen', dd: 'Dysthymie' },
          },
        ],
      },
    },
  ],
};
