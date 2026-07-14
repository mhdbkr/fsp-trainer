import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { localLookup, deepLinks } from '@/lib/dictionary';
import { askOnline, getKey, setKey, getProvider, setProvider, hasKey, PROVIDERS } from '@/lib/onlineAi';
import { DoctopusMascot } from './DoctopusMascot';

// ============================================================================
// Doctopus — assistant IA flottant (coin de page), déclenchable en un clic.
// Traduire · expliquer une notion de science fondamentale · question d'examen.
// Cerveau : IA en ligne rapide et gratuite (Groq, clé requise) + recherche
// instantanée hors-ligne (Fachbegriffe) + repli deep-links sans clé.
// ============================================================================

const EXAMPLES = [
  'Que signifie « Belastungsdyspnoe » ?',
  'Explique la physiopathologie de la cirrhose',
  'Comment se déroule la Fallvorstellung ?',
  'Reformule « Ödeme » pour un patient',
];

export function Doctopus() {
  const open = useUi((s) => s.doctopusOpen);
  const prefill = useUi((s) => s.doctopusPrefill);
  const openDoctopus = useUi((s) => s.openDoctopus);
  const closeDoctopus = useUi((s) => s.closeDoctopus);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(!hasKey());
  const begriffe = useFachbegriffe() ?? [];
  const openGlossary = useUi((s) => s.openGlossary);

  // Quick-search : la sélection d'un mot pré-remplit la question à l'ouverture.
  useEffect(() => { if (open && prefill) setQ(prefill); }, [open, prefill]);

  const hits = useMemo(() => (q.trim() ? localLookup(q, begriffe).slice(0, 4) : []), [q, begriffe]);
  const links = useMemo(() => (q.trim() ? deepLinks(q) : []), [q]);
  const isWord = q.trim().split(/\s+/).length <= 2 && !/[?.!]/.test(q);

  const ask = async () => {
    if (!q.trim()) return;
    setLoading(true); setError(''); setAnswer('');
    try { setAnswer(await askOnline(q)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <>
      <button onClick={() => openDoctopus()} title="Doctopus — assistant IA"
        className="fixed bottom-5 right-20 z-40 flex h-12 items-center gap-1.5 rounded-full bg-white pl-1.5 pr-4 text-brand-700 shadow-lg ring-1 ring-slate-200 transition-transform hover:scale-105 dark:bg-slate-800 dark:text-brand-200 dark:ring-slate-700">
        <DoctopusMascot size={36} />
        <span className="hidden text-sm font-bold sm:inline">Doctopus</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[65] bg-slate-900/30 backdrop-blur-[1px]" onClick={() => closeDoctopus()} />
          <aside className="fixed right-0 top-0 z-[70] flex h-full w-full max-w-md animate-slide-in flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <DoctopusMascot size={40} />
                <div>
                  <div className="text-sm font-bold">Doctopus</div>
                  <div className="text-[11px] text-slate-400">Traduire · expliquer · réviser l'examen</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowSettings((s) => !s)} title="Réglages IA" className="btn-ghost text-sm"><Icon name="gear" className="h-4 w-4" /></button>
                <button onClick={() => closeDoctopus()} className="btn-ghost text-lg">✕</button>
              </div>
            </div>

            {showSettings && <Settings onClose={() => setShowSettings(false)} />}

            <div className="border-b border-slate-100 p-3 dark:border-slate-800">
              <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask(); }}
                placeholder="Pose ta question, ou tape un terme à traduire… (Cmd/Ctrl+Entrée)"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900" />
              <button onClick={ask} disabled={!q.trim() || loading || !hasKey()} className="btn-primary mt-2 w-full justify-center text-sm disabled:opacity-40">
                {loading ? 'Doctopus réfléchit…' : `Demander à Doctopus`}
              </button>
              {!hasKey() && <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Ajoute ta clé (gratuite) dans <Icon name="gear" className="inline-block h-3 w-3 align-[-1px]" /> pour activer l'IA en ligne.</p>}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {answer && (
                <div className="card p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300"><DoctopusMascot size={18} /> Doctopus</div>
                  <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{answer}</div>
                </div>
              )}
              {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">{error}</p>}

              {!q.trim() && !answer && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-400">Exemples — clique pour essayer :</div>
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setQ(ex)} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-brand-400 dark:border-slate-800">{ex}</button>
                  ))}
                </div>
              )}

              {isWord && hits.length > 0 && (
                <div className="space-y-2">
                  <div className="label">Recherche instantanée (hors-ligne)</div>
                  {hits.map((h, i) => (
                    <button key={i} onClick={() => h.fb && (openGlossary(h.fb), closeDoctopus())}
                      className={`w-full rounded-lg border border-slate-200 p-3 text-left dark:border-slate-800 ${h.fb ? 'hover:border-brand-400' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-brand-700 dark:text-brand-300">{h.term}</span>
                        <span className="chip bg-slate-100 text-[10px] text-slate-400 dark:bg-slate-800">{h.source === 'fachbegriff' ? 'Fachbegriff' : 'dico'}</span>
                      </div>
                      {h.pronunciation && <div className="text-xs text-slate-400">/{h.pronunciation}/</div>}
                      <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{h.translation}</div>
                    </button>
                  ))}
                </div>
              )}

              {q.trim() && (
                <div>
                  <div className="label mb-2">Ou ouvrir dans un service gratuit</div>
                  <div className="grid grid-cols-2 gap-2">
                    {links.map((l) => (
                      <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 dark:border-slate-800">
                        <span>{l.label}</span><span className="text-[10px] text-slate-400">{l.note} ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}

function Settings({ onClose }: { onClose: () => void }) {
  const [key, setKeyLocal] = useState(getKey());
  const [prov, setProv] = useState(getProvider().id);
  const provider = PROVIDERS.find((p) => p.id === prov) ?? PROVIDERS[0];
  const save = () => { setKey(key); setProvider(prov); onClose(); };
  return (
    <div className="space-y-2 border-b border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="label">Réglages de l'IA</div>
      <select value={prov} onChange={(e) => setProv(e.target.value)} className="input text-sm">
        {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <input type="password" value={key} onChange={(e) => setKeyLocal(e.target.value)} placeholder="Clé API (gratuite)"
        className="input text-sm" />
      <div className="flex items-center justify-between">
        <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="text-[11px] text-brand-600 hover:underline dark:text-brand-300">Obtenir une clé gratuite ↗</a>
        <button onClick={save} className="btn-primary text-xs">Enregistrer</button>
      </div>
      <p className="text-[10px] text-slate-400">La clé reste sur ton appareil (localStorage) et n'est envoyée qu'au fournisseur choisi.</p>
    </div>
  );
}
