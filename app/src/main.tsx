import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import './styles/index.css';
import { Shell } from '@/components/Shell';
import { ensureSeeded } from '@/data/seed';
import { HomePage } from '@/features/home/HomePage';
import { CasesPage } from '@/features/cases/CasesPage';
import { CaseDetailPage } from '@/features/cases/CaseDetailPage';
import { SimulationHub } from '@/features/simulation/SimulationHub';
import { SimulationRunner } from '@/features/simulation/SimulationRunner';
import { PreSimulationPage } from '@/features/simulation/PreSimulationPage';
import { FachwissenPage } from '@/features/fachwissen/FachwissenPage';
import { FachwissenDetailPage } from '@/features/fachwissen/FachwissenDetailPage';
import { GuidesPage } from '@/features/guides/GuidesPage';
import { AufklaerungPage } from '@/features/aufklaerung/AufklaerungPage';
import { FachbegriffePage } from '@/features/fachbegriffe/FachbegriffePage';
import { DrillPage } from '@/features/fachbegriffe/DrillPage';
import { StatsPage } from '@/features/stats/StatsPage';
import { PatientScreen } from '@/features/simulation/PatientScreen';
import { ProgramPage } from '@/features/program/ProgramPage';

// Hash router → fonctionne aussi bien en dev qu'en ouverture file:// (Tauri).
const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'programme', element: <ProgramPage /> },
      { path: 'cas', element: <CasesPage /> },
      { path: 'cas/:id', element: <CaseDetailPage /> },
      { path: 'simulation', element: <SimulationHub /> },
      { path: 'simulation/:caseId/pre', element: <PreSimulationPage /> },
      { path: 'simulation/:caseId/run', element: <SimulationRunner /> },
      { path: 'fachwissen', element: <FachwissenPage /> },
      { path: 'fachwissen/:id', element: <FachwissenDetailPage /> },
      { path: 'guides', element: <GuidesPage /> },
      { path: 'aufklaerung', element: <AufklaerungPage /> },
      { path: 'fachbegriffe', element: <FachbegriffePage /> },
      { path: 'fachbegriffe/drill', element: <DrillPage /> },
      { path: 'stats', element: <StatsPage /> },
    ],
  },
  // Route 2ᵉ écran « rôle patient » — standalone (hors Shell), responsive mobile.
  { path: '/patient/:caseId', element: <PatientScreen /> },
]);

ensureSeeded().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
});
