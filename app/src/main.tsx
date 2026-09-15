import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createHashRouter } from 'react-router-dom';
// Polices de marque auto-hébergées (offline-first) — identité typographique :
// Bricolage Grotesque (display), IBM Plex Sans (corps), IBM Plex Mono (signature).
import '@fontsource-variable/bricolage-grotesque/wght.css';
import '@fontsource-variable/ibm-plex-sans/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles/index.css';
import { Shell } from '@/components/Shell';
import { useProfiles } from '@/store/profile';
import { ensureDemoData } from '@/data/seed';
import { contentLoader, FirstLoadRequired } from '@/lib/content/loader';
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
import { SignInPage } from '@/features/account/SignInPage';
import { OnboardingPage } from '@/features/account/OnboardingPage';
import { AuthCallback } from '@/features/account/AuthCallback';
import { initSession } from '@/lib/auth/session';
import { loadEntitlements, watchEntitlements } from '@/lib/entitlements';

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
      { path: 'signin', element: <SignInPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'auth/callback', element: <AuthCallback /> },
    ],
  },
  // Route 2ᵉ écran « rôle patient » — standalone (hors Shell), responsive mobile.
  { path: '/patient/:caseId', element: <PatientScreen /> },
]);

function renderFirstLoadScreen() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
        <div className="card" style={{ maxWidth: 420, textAlign: 'center' }}>
          <p>Doctopus a besoin d&apos;une connexion pour le premier chargement</p>
          <button type="button" className="btn-primary" onClick={() => location.reload()}>Réessayer</button>
        </div>
      </div>
    </React.StrictMode>,
  );
}

// La session d'abord : un `?code=` de lien magique doit être échangé AVANT
// que le router ne touche à l'URL. Les entitlements ensuite (le tier doit
// être connu avant de synchroniser le contenu, qui purge selon le tier).
initSession()
  .then(() => loadEntitlements())
  .then(() => { watchEntitlements(); })
  .then(() => contentLoader.sync())
  .then(() => ensureDemoData())
  .then(() => useProfiles.getState().load())
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <RouterProvider router={router} />
      </React.StrictMode>,
    );
  })
  .catch((e) => {
    if (e instanceof FirstLoadRequired) { renderFirstLoadScreen(); return; }
    throw e;
  });
