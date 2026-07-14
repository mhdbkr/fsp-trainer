// Destinations de premier niveau — source unique pour la sidebar (Shell)
// et la palette de commandes (⌘K).
export const NAV: { to: string; label: string; icon: string }[] = [
  { to: '/', label: 'Accueil', icon: 'nav-home' },
  { to: '/programme', label: 'Programme', icon: 'nav-calendar' },
  { to: '/cas', label: 'Cas cliniques', icon: 'nav-cases' },
  { to: '/simulation', label: 'Simulation', icon: 'nav-sim' },
  { to: '/fachwissen', label: 'Fachwissen', icon: 'nav-book' },
  { to: '/guides', label: 'Guides', icon: 'nav-compass' },
  { to: '/aufklaerung', label: 'Aufklärung', icon: 'nav-clipboard' },
  { to: '/fachbegriffe', label: 'Fachbegriffe', icon: 'nav-abc' },
  { to: '/stats', label: 'Stats', icon: 'nav-chart' },
];
