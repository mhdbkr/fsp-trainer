// Les routes de l'app — extraites de `main.tsx` pour être testables (INV-E12) sans démarrer l'app.
import { Link, Navigate, type RouteObject } from 'react-router-dom';
import { Shell } from '@/components/Shell';
import { HomePage } from '@/features/home/HomePage';
import { CasesPage } from '@/features/cases/CasesPage';
import { CaseDetailPage } from '@/features/cases/CaseDetailPage';
import { ExamenPage } from '@/features/examen/ExamenPage';
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
import { HistoriquePage } from '@/features/history/HistoriquePage';
import { SignInPage } from '@/features/account/SignInPage';
import { OnboardingPage } from '@/features/account/OnboardingPage';
import { AuthCallback } from '@/features/account/AuthCallback';
import { AccountPage } from '@/features/account/AccountPage';
import { PricingPage } from '@/features/pricing/PricingPage';

function MerciPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Merci !</h1>
      <p>Ton accès se débloque dans quelques secondes.</p>
      <Link to="/" className="btn-primary justify-center">Retour à l'accueil</Link>
    </div>
  );
}

export const ROUTES: RouteObject[] = [
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'programme', element: <ProgramPage /> },
      { path: 'cas', element: <CasesPage /> },
      { path: 'cas/:id', element: <CaseDetailPage /> },
      // [S4-7] Le menu mène à l'Examen ; `/simulation` y redirige (simulation-run.md §11.7). `/pre` et `/run` restent
      // l'entraînement, lancé depuis « Cas cliniques » et le Programme.
      { path: 'examen', element: <ExamenPage /> },
      { path: 'simulation', element: <Navigate to="/examen" replace /> },
      { path: 'simulation/:caseId/pre', element: <PreSimulationPage /> },
      { path: 'simulation/:caseId/run', element: <SimulationRunner /> },
      { path: 'fachwissen', element: <FachwissenPage /> },
      { path: 'fachwissen/:id', element: <FachwissenDetailPage /> },
      { path: 'guides', element: <GuidesPage /> },
      { path: 'aufklaerung', element: <AufklaerungPage /> },
      { path: 'fachbegriffe', element: <FachbegriffePage /> },
      { path: 'fachbegriffe/drill', element: <DrillPage /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'historique', element: <HistoriquePage /> },
      { path: 'signin', element: <SignInPage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'auth/callback', element: <AuthCallback /> },
      { path: 'pricing', element: <PricingPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: 'merci', element: <MerciPage /> },
    ],
  },
  // Route 2ᵉ écran « rôle patient » — standalone (hors Shell), responsive mobile.
  { path: '/patient/:caseId', element: <PatientScreen /> },
];
