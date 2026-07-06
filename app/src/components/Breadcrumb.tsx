import { Link, useNavigate } from 'react-router-dom';

// ============================================================================
// Fil d'Ariane + bouton retour rapide. Améliore la navigation entre les pages
// (retour à la page précédente en un clic, et repères cliquables du chemin).
// ============================================================================
export interface Crumb { label: string; to?: string }

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 text-sm">
      <button onClick={() => navigate(-1)} title="Page précédente"
        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-300">
        ← Retour
      </button>
      <nav className="flex flex-wrap items-center gap-1.5 text-slate-400">
        {items.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {c.to ? (
              <Link to={c.to} className="hover:text-brand-600 dark:hover:text-brand-300">{c.label}</Link>
            ) : (
              <span className="text-slate-600 dark:text-slate-300">{c.label}</span>
            )}
            {i < items.length - 1 && <span className="text-slate-300 dark:text-slate-600">/</span>}
          </span>
        ))}
      </nav>
    </div>
  );
}
