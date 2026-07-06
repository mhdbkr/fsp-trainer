import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAufklaerungen, useCases } from '@/hooks/useData';
import { AutoLink } from '@/components/AutoLink';
import type { AufklaerungItem } from '@/db/types';

// Espace Aufklärung : catalogue. Blocs STANDARDS (hérités) visuellement distincts
// des blocs SPÉCIFIQUES. Questions probables du patient réutilisées en simulation.
export function AufklaerungPage() {
  const items = useAufklaerungen();
  const [params] = useSearchParams();
  const openId = params.get('open');
  if (!items) return <div className="text-slate-400">Chargement…</div>;

  const cats = ['Untersuchung', 'OP', 'Therapie'] as const;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Aufklärung</h1>
        <p className="text-slate-500 dark:text-slate-400">Catalogue des actes. Blocs <span className="text-brand-600 dark:text-brand-300">standards répétables</span> + blocs <span className="text-rose-600 dark:text-rose-400">spécifiques</span>.</p>
      </header>

      {cats.map((cat) => {
        const list = items.filter((a) => a.category === cat);
        if (!list.length) return null;
        return (
          <section key={cat}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{cat}</h2>
            <div className="space-y-3">
              {list.map((a) => <AufkCard key={a.id} item={a} defaultOpen={a.id === openId} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AufkCard({ item, defaultOpen }: { item: AufklaerungItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const cases = useCases();
  const b = item.blocks;
  const linked = (cases ?? []).filter((c) => item.linkedCaseIds.includes(c.id));

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span className="font-semibold">📋 {item.name}</span>
        <span className={`text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          {/* Blocs standards */}
          <div className="rounded-xl border-2 border-dashed border-brand-200 p-3 dark:border-brand-900/50">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Blocs standards (répétables)</div>
            <div className="space-y-2 text-sm">
              <Block label="Einleitung">{b.einleitung}</Block>
              <Block label="Metakommunikation">{b.metakommunikation}</Block>
              <Block label="Warum">{b.warum}</Block>
              <Block label="Ablauf">{b.ablauf}</Block>
              <Block label="Vorbereitung">{b.vorbereitung}</Block>
              <div>
                <div className="text-xs font-semibold text-brand-600 dark:text-brand-300">Standardrisiken</div>
                <ul className="mt-1 space-y-0.5">
                  {b.standardRisiken.map((r, i) => <li key={i} className="flex gap-1.5 text-[13px]"><span className="text-brand-400">·</span><AutoLink>{r}</AutoLink></li>)}
                </ul>
              </div>
              <Block label="Abschluss">{b.abschluss}</Block>
            </div>
          </div>

          {/* Bloc spécifique */}
          <div className="mt-3 rounded-xl border-2 border-rose-200 bg-rose-50/40 p-3 dark:border-rose-900/50 dark:bg-rose-900/10">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-500">Spezifische Risiken ({item.shortName ?? item.name})</div>
            <ul className="space-y-0.5">
              {b.spezifischeRisiken.map((r, i) => <li key={i} className="flex gap-1.5 text-[13px]"><span className="text-rose-400">·</span><AutoLink>{r}</AutoLink></li>)}
            </ul>
          </div>

          {/* Questions patient */}
          <div className="mt-3">
            <div className="label mb-2">Questions probables du patient</div>
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {item.patientQuestions.map((q, i) => (
                <li key={i} className="py-1.5">
                  <div className="font-medium">« {q.frage} »</div>
                  <div className="text-slate-500 dark:text-slate-400">→ <AutoLink>{q.antwort}</AutoLink></div>
                </li>
              ))}
            </ul>
          </div>

          {linked.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">Cas :</span>
              {linked.map((c) => <Link key={c.id} to={`/cas/${c.id}`} className="chip bg-slate-100 text-slate-600 hover:bg-brand-100 dark:bg-slate-800 dark:text-slate-300">{c.name}</Link>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ label, children }: { label: string; children: string }) {
  return <div><span className="text-xs font-semibold text-brand-600 dark:text-brand-300">{label}: </span><span className="text-[13px]"><AutoLink>{children}</AutoLink></span></div>;
}
