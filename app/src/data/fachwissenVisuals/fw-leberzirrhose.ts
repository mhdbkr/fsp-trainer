// Spec visuelle — Leberzirrhose (Gastroenterologie). Voir contrat §1, §10.
// Score-gauge Child-Pugh : les seuils par critère (§ score-gauge criteria)
// ne figurent pas dans la fiche → `source: 'ergänzt'`, à relire.

import type { FachwissenVisualSpec } from './types';

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-leberzirrhose',
  version: 1,
  blocks: [
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
          {
            label: 'Bilirubin (mg/dl)',
            points: [1, 2, 3],
            choices: ['< 2', '2–3', '> 3'],
            source: 'ergänzt',
          },
          {
            label: 'Albumin (g/dl)',
            points: [1, 2, 3],
            choices: ['> 3,5', '2,8–3,5', '< 2,8'],
            source: 'ergänzt',
          },
          {
            label: 'INR',
            points: [1, 2, 3],
            choices: ['< 1,7', '1,7–2,3', '> 2,3'],
            source: 'ergänzt',
          },
          {
            label: 'Aszites',
            points: [1, 2, 3],
            choices: ['keiner', 'leicht', 'ausgeprägt'],
            source: 'ergänzt',
          },
          {
            label: 'Enzephalopathie',
            points: [1, 2, 3],
            choices: ['keine', 'Grad I–II', 'Grad III–IV'],
            source: 'ergänzt',
          },
        ],
        bands: [
          { label: 'Child A', min: 5, max: 6, tone: 'neutral', source: { section: 'klassifikation', name: 'Child-Pugh' } },
          { label: 'Child B', min: 7, max: 9, tone: 'warn', source: { section: 'klassifikation', name: 'Child-Pugh' } },
          { label: 'Child C', min: 10, max: 15, tone: 'signal', source: { section: 'klassifikation', name: 'Child-Pugh' } },
        ],
      },
    },
    {
      id: 'timeline-dekompensation',
      kind: 'timeline',
      title: 'Dekompensation der Leberzirrhose',
      anchor: 'redFlags',
      merke: 'Fieber bei Aszites = SBP ausschließen (Punktion).',
      replaces: [
        {
          section: 'redFlags',
          text: 'Hämatemesis oder Meläna → Verdacht auf Ösophagusvarizenblutung',
        },
        {
          section: 'redFlags',
          text: 'zunehmende Somnolenz, Asterixis, Verwirrtheit → hepatische Enzephalopathie',
        },
        {
          section: 'redFlags',
          text: 'Fieber und Bauchschmerz bei Aszites → spontan bakterielle Peritonitis (Punktion!)',
        },
        {
          section: 'redFlags',
          text: 'Oligurie und Kreatininanstieg → hepatorenales Syndrom',
        },
      ],
      data: {
        axis: 'stadium',
        axisTone: 'signal',
        points: [
          {
            at: 'Stadium 1',
            label: 'Ösophagusvarizenblutung',
            detail: 'Hämatemesis oder Meläna',
            source: {
              section: 'redFlags',
              text: 'Hämatemesis oder Meläna → Verdacht auf Ösophagusvarizenblutung',
            },
            tone: 'warn',
          },
          {
            at: 'Stadium 2',
            label: 'Hepatische Enzephalopathie',
            detail: 'Zunehmende Somnolenz, Asterixis, Verwirrtheit',
            source: {
              section: 'redFlags',
              text: 'zunehmende Somnolenz, Asterixis, Verwirrtheit → hepatische Enzephalopathie',
            },
            tone: 'warn',
          },
          {
            at: 'Stadium 3',
            label: 'Spontan bakterielle Peritonitis',
            detail: 'Fieber und Bauchschmerz bei Aszites',
            source: {
              section: 'redFlags',
              text: 'Fieber und Bauchschmerz bei Aszites → spontan bakterielle Peritonitis (Punktion!)',
            },
            tone: 'warn',
          },
          {
            at: 'Stadium 4',
            label: 'Hepatorenales Syndrom',
            detail: 'Oligurie und Kreatininanstieg',
            source: {
              section: 'redFlags',
              text: 'Oligurie und Kreatininanstieg → hepatorenales Syndrom',
            },
            tone: 'warn',
          },
        ],
      },
    },
    {
      id: 'anatomy-leberhautzeichen',
      kind: 'anatomy-map',
      title: 'Leberhautzeichen & Stauung',
      anchor: 'klinik',
      replaces: [
        { section: 'klinik', text: 'Ikterus (Gelbfärbung), Juckreiz' },
        { section: 'klinik', text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
        { section: 'klinik', text: 'Aszites, Beinödeme, Zunahme des Bauchumfangs' },
        {
          section: 'klinik',
          text: 'Hepatische Enzephalopathie: Konzentrationsstörung, Flapping tremor, Somnolenz',
        },
      ],
      data: {
        figure: 'body',
        hotspots: [
          {
            region: 'eyes',
            label: 'Ikterus (Sklera)',
            source: { section: 'klinik', text: 'Ikterus (Gelbfärbung), Juckreiz' },
          },
          {
            region: 'chest',
            label: 'Spider naevi',
            source: { section: 'klinik', text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
          },
          {
            region: 'skin',
            label: 'Palmarerythem',
            source: { section: 'klinik', text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
          },
          {
            region: 'periumbilical',
            label: 'Caput medusae',
            source: { section: 'klinik', text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
          },
          {
            region: 'legs',
            label: 'Beinödeme',
            source: { section: 'klinik', text: 'Aszites, Beinödeme, Zunahme des Bauchumfangs' },
          },
          {
            region: 'hands',
            label: 'Flapping tremor',
            source: {
              section: 'klinik',
              text: 'Hepatische Enzephalopathie: Konzentrationsstörung, Flapping tremor, Somnolenz',
            },
            tone: 'signal',
          },
        ],
      },
    },
  ],
};
