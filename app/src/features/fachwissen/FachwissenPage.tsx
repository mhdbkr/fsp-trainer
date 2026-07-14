import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFachwissenAll } from '@/hooks/useData';
import { Icon, SpecialtyIcon } from '@/components/icons';
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
        <div className="eyebrow">Référence</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Fachwissen</h1>
        <p className="text-slate-500 dark:text-slate-400">Fiches pathologie riches : Definition, Klinik, Diagnostik, DD, Therapie, pièges & questions d'examen.</p>
      </header>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une pathologie…" className="input max-w-md" />

      {filtered.length === 0 ? (
        <EmptyState icon="nav-book" title="Aucune fiche" hint="Élargis la recherche." />
      ) : (
        specialties.map((sp) => {
          const items = filtered.filter((f) => f.specialty === sp);
          if (!items.length) return null;
          return (
            <section key={sp}>
              {/* En-tête de spécialité : tuile-organe + titre display + compteur + filet */}
              <h2 className="section-rule mb-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300"><SpecialtyIcon specialty={sp} className="h-5 w-5" /></span>
                <span className="font-display text-base font-semibold tracking-tightish">{sp}</span>
                <span className="mono-tag">{items.length}</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((f) => (
                  <Link key={f.id} to={`/fachwissen/${f.id}`} className="card card-interactive relative overflow-hidden p-4">
                    {/* Filigrane d'organe — repère visuel immédiat de la spécialité */}
                    <SpecialtyIcon specialty={f.specialty} className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-brand-600/[0.08] dark:text-brand-300/10" />
                    <h3 className="font-semibold">{f.pathology}</h3>
                    <p className="mt-1 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{f.definition}</p>
                    <div className="mt-3 flex gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Icon name="alert" className="h-3.5 w-3.5" />{f.pruefungsfallen.length} pièges</span>
                      <span className="flex items-center gap-1"><Icon name="question" className="h-3.5 w-3.5" />{f.askedInExam.length} questions</span>
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
