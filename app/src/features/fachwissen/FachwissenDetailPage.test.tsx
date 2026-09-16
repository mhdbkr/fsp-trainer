import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '@/db/db';
import type { Fachwissen } from '@/db/types';
import { FachwissenDetailPage } from './FachwissenDetailPage';

// Fiches minimales mais fidèles aux refs citées par les pilotes visuels
// (app/src/data/fachwissenVisuals/fw-khk.ts, fw-leberzirrhose.ts).
const fwKhk: Fachwissen = {
  id: 'fw-khk',
  pathology: 'KHK',
  specialty: 'Kardiologie',
  definition: 'Koronare Herzkrankheit.',
  klinik: [
    { text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
    { text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!' },
  ],
  diagnostik: [{ stufe: 'Labor', text: 'Troponin' }],
  differenzialdiagnosen: [{ dd: 'Akuter Myokardinfarkt / ACS', unterscheidung: 'Troponin, EKG' }],
  therapie: [
    { label: 'Kupierung des Angina-pectoris-Anfalls', items: ['Nitro sublingual'], akut: true },
    {
      label:
        'Prognoseverbessernde Basistherapie (Risikofaktoren, Thrombozytenaggregationshemmung, Statin)',
      items: ['ASS', 'Statin'],
    },
    { label: 'Antianginöse Dauertherapie zur Symptomkontrolle', items: ['Betablocker'] },
    { label: 'Revaskularisation: PCI oder Bypass — Indikation und Verfahrenswahl', items: ['PCI'] },
  ],
  pruefungsfallen: [],
  askedInExam: [],
  linkedCaseIds: [],
  linkedAufklaerungIds: [],
  keyFachbegriffeIds: [],
} as unknown as Fachwissen;

const fwLeberzirrhose: Fachwissen = {
  id: 'fw-leberzirrhose',
  pathology: 'Leberzirrhose',
  specialty: 'Gastroenterologie',
  definition: 'Irreversibler fibrotischer Umbau der Leber.',
  klinik: [
    { text: 'Ikterus (Gelbfärbung), Juckreiz' },
    { text: 'Leberhautzeichen: Spider naevi, Palmarerythem, Caput medusae' },
    { text: 'Aszites, Beinödeme, Zunahme des Bauchumfangs' },
    { text: 'Hepatische Enzephalopathie: Konzentrationsstörung, Flapping tremor, Somnolenz' },
  ],
  klassifikation: [{ name: 'Child-Pugh', inhalt: 'Score A–C.' }],
  redFlags: [
    'Hämatemesis oder Meläna → Verdacht auf Ösophagusvarizenblutung',
    'zunehmende Somnolenz, Asterixis, Verwirrtheit → hepatische Enzephalopathie',
    'Fieber und Bauchschmerz bei Aszites → spontan bakterielle Peritonitis (Punktion!)',
    'Oligurie und Kreatininanstieg → hepatorenales Syndrom',
  ],
  diagnostik: [{ stufe: 'Labor', text: 'Transaminasen' }],
  differenzialdiagnosen: [{ dd: 'Herzinsuffizienz', unterscheidung: 'Echokardiographie' }],
  therapie: [{ label: 'Kausal', items: ['Alkoholkarenz'] }],
  pruefungsfallen: [],
  askedInExam: [],
  linkedCaseIds: [],
  linkedAufklaerungIds: [],
  keyFachbegriffeIds: [],
} as unknown as Fachwissen;

const fwPankreatitis: Fachwissen = {
  id: 'fw-pankreatitis',
  pathology: 'Pankreatitis',
  specialty: 'Gastroenterologie',
  definition: 'Akute Entzündung des Pankreas.',
  klinik: [{ text: 'Gürtelförmiger Oberbauchschmerz' }],
  diagnostik: [{ stufe: 'Labor', text: 'Lipase' }],
  differenzialdiagnosen: [{ dd: 'Cholezystitis', unterscheidung: 'Sonographie' }],
  therapie: [{ label: 'Konservativ', items: ['Nahrungskarenz', 'Flüssigkeit'] }],
  pruefungsfallen: [],
  askedInExam: [],
  linkedCaseIds: [],
  linkedAufklaerungIds: [],
  keyFachbegriffeIds: [],
} as unknown as Fachwissen;

let container: HTMLDivElement;
let root: Root;

async function renderPage(id: string) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[`/fachwissen/${id}`]}>
        <Routes>
          <Route path="/fachwissen/:id" element={<FachwissenDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  // useLiveQuery résout la promesse Dexie de manière asynchrone : un tick
  // supplémentaire est nécessaire après le premier rendu ("Chargement…").
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe('FachwissenDetailPage — visuels', () => {
  beforeEach(async () => {
    await db.fachwissen.bulkPut([fwKhk, fwLeberzirrhose, fwPankreatitis]);
  });

  afterEach(async () => {
    root.unmount();
    document.body.innerHTML = '';
    await db.fachwissen.clear();
  });

  it('fw-khk : decision-tree précède la Section Klinik, therapy-toggles précède Therapie', async () => {
    await renderPage('fw-khk');
    const all = Array.from(container.querySelectorAll('[data-visual], [data-section]'));
    const tags = all.map((el) =>
      el.hasAttribute('data-visual') ? `visual:${el.getAttribute('data-visual')}` : `section:${el.getAttribute('data-section')}`,
    );
    expect(tags).toContain('visual:decision-tree');
    expect(tags).toContain('visual:therapy-toggles');
    expect(tags.indexOf('visual:decision-tree')).toBeLessThan(tags.indexOf('section:Klinik'));
    expect(tags.indexOf('visual:therapy-toggles')).toBeLessThan(tags.indexOf('section:Therapie'));
  });

  it('fw-leberzirrhose : timeline précède Klassifikation & Scores, Red Flags est un <details> fermé', async () => {
    await renderPage('fw-leberzirrhose');
    const all = Array.from(container.querySelectorAll('[data-visual], [data-section]'));
    const tags = all.map((el) =>
      el.hasAttribute('data-visual') ? `visual:${el.getAttribute('data-visual')}` : `section:${el.getAttribute('data-section')}`,
    );
    expect(tags.indexOf('visual:timeline')).toBeGreaterThanOrEqual(0);
    expect(tags.indexOf('visual:timeline')).toBeLessThan(tags.indexOf('section:Klassifikation & Scores'));

    const redFlagsDetails = Array.from(container.querySelectorAll('details')).find((d) =>
      d.textContent?.includes('Red Flags'),
    );
    expect(redFlagsDetails).toBeDefined();
    expect(redFlagsDetails?.hasAttribute('open')).toBe(false);
  });

  it('fiche sans spec (fw-pankreatitis) : aucun [data-visual]', async () => {
    await renderPage('fw-pankreatitis');
    expect(container.querySelectorAll('[data-visual]').length).toBe(0);
  });
});
