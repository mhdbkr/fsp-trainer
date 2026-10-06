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
import { contentLoader, FirstLoadRequired } from '@/lib/content/loader';
import { ROUTES } from '@/routes';
import { bootJournal, watchDayPlan } from '@/lib/sync/boot';
import { initSession, AUTH_MODE, useSession } from '@/lib/auth/session';
import { loadEntitlements, watchEntitlements } from '@/lib/entitlements';
import { startSyncLoop } from '@/lib/sync/queue';
import { FounderGate } from '@/features/auth/FounderGate';
import { getActiveUserId, setActiveUserId, listAccounts } from '@/lib/auth/accounts';
import { restartApp } from '@/lib/auth/restart';

// Hash router → fonctionne aussi bien en dev qu'en ouverture file:// (Tauri). Les routes vivent dans `routes.tsx`.
const router = createHashRouter(ROUTES);

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

function renderFounderGate() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><FounderGate onDone={() => restartApp()} /></React.StrictMode>,
  );
}

// Mode fondateur : pas de compte actif sur cet appareil → écran d'entrée, rien
// d'autre ne démarre (ni sync, ni contenu). Un compte actif → séquence normale.
if (AUTH_MODE === 'founder' && !getActiveUserId()) {
  renderFounderGate();
} else {
  // La session d'abord : un `?code=` de lien magique doit être échangé AVANT
  // que le router ne touche à l'URL. Les entitlements ensuite (le tier doit
  // être connu avant de synchroniser le contenu, qui purge selon le tier).
  initSession()
    .then(() => {
      // Garde-fou : la session (partagée entre onglets) doit être celle du
      // compte actif de ce tab. Session morte au boot (jeton révoqué hors app)
      // → écran d'entrée, au lieu d'ouvrir l'app en anonyme sous l'identité
      // Dexie d'un autre compte. Session d'un autre compte connu (bascule
      // faite dans un autre onglet) → on redémarre sur ce compte.
      // offline → on continue avec la base locale du compte ; le rafraîchissement reprend au retour du réseau.
      if (AUTH_MODE === 'founder' && navigator.onLine) {
        const uid = useSession.getState().user?.id ?? null;
        if (uid !== getActiveUserId()) {
          setActiveUserId(uid && listAccounts().some((a) => a.userId === uid) ? uid : null);
          restartApp();
          throw new Error('halt');
        }
      }
    })
    .then(() => loadEntitlements())
    .then(() => { watchEntitlements(); })
    .then(() => contentLoader.sync())
    // Le plan du jour est materialise ICI, une fois, au demarrage — JAMAIS par
    // un composant (contrat training-journal.md 3.2). AVANT : pull borne (D-I2)
    // et reconstruction du journal (B-C1). Un echec n'empeche pas l'app de
    // demarrer : l'ecran affiche « pas encore ouvert ».
    .then(() => bootJournal().catch((e) => { console.warn('[programme]', e); }))
    .then(() => {
      ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
          <RouterProvider router={router} />
        </React.StrictMode>,
      );
      startSyncLoop();
      watchDayPlan();          // I1 : retour au premier plan, minuit
    })
    .catch((e) => {
      if (e instanceof Error && e.message === 'halt') return;
      if (e instanceof FirstLoadRequired) { renderFirstLoadScreen(); return; }
      throw e;
    });
}
