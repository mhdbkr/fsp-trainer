import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFachwissenAll } from '@/hooks/useData';
import { EmptyState } from '@/components/ui';

export function FachwissenPage() {
  const all = useFachwissenAll();
  const [q, setQ] = useState('');
  if (!all) return <div className="text-slate-400">Chargement…</div>;

  const specialties = [...new Set(all.map((f) => f.specialty))].sort();
  const filtered = all.filter((f) => `${f.pathology} ${f.definition}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Fachwissen</h1>
        <p className="text-slate-500 dark:text-slate-400">Fiches pathologie riches : Definition, Klinik, Diagnostik, DD, Therapie, pièges & questions d'examen.</p>
      </header>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une pathologie…" className="input max-w-md" />

      {filtered.length === 0 ? (
        <EmptyState icon="📚" title="Aucune fiche" hint="Élargis la recherche." />
      ) : (
        specialties.map((sp) => {
          const items = filtered.filter((f) => f.specialty === sp);
          if (!items.length) return null;
          return (
            <section key={sp}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{sp}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => (
                  <Link key={f.id} to={`/fachwissen/${f.id}`} className="card p-4 transition-all hover:border-brand-400 hover:shadow-md">
                    <h3 className="font-semibold">{f.pathology}</h3>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{f.definition}</p>
                    <div className="mt-3 flex gap-2 text-[11px] text-slate-400">
                      <span>⚠ {f.pruefungsfallen.length} pièges</span>
                      <span>❓ {f.askedInExam.length} questions</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
