import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { localLookup, deepLinks } from '@/lib/dictionary';
import { askOnline, getKey, setKey, getProvider, setProvider, hasKey, PROVIDERS } from '@/lib/onlineAi';

// ============================================================================
// Doctopus — assistant IA flottant. Bouton minimal glassmorphique (mark seul)
// + panneau POPOVER compact ancré au bouton (plus de barre latérale pleine).
// Traduire · expliquer une notion · question d'examen.
// Cerveau : IA en ligne (Groq, clé requise) + recherche hors-ligne (Fachbegriffe)
// + repli deep-links sans clé.
// ============================================================================

const EXAMPLES = [
  'Que signifie « Belastungsdyspnoe » ?',
  'Physiopathologie de la cirrhose',
  'Comment se déroule la Fallvorstellung ?',
  'Reformule « Ödeme » pour un patient',
];

// Petit badge marque réutilisable (mark pieuvre sur verre teinté).
function MarkBadge({ size = 'h-8 w-8', icon = 'h-[19px] w-[19px]' }: { size?: string; icon?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm ring-1 ring-white/15 ${size}`}>
      <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/25 to-transparent" />
      <Icon name="doctopus" className={`relative ${icon}`} />
    </span>
  );
}

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
    try {
      // onToken (OpenRouter uniquement) affiche la réponse au fil du stream ;
      // les autres fournisseurs l'ignorent et renvoient tout d'un coup via la
      // valeur de retour, posée ici en repli pour rester cohérente dans tous les cas.
      const full = await askOnline(q, (delta) => setAnswer((prev) => prev + delta));
      setAnswer(full);
    }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <>
      {/* Bouton flottant — minimal, glassmorphique, 3D, mark seul (sans texte) */}
      {!open && (
        <button onClick={() => openDoctopus()} title="Doctopus — assistant IA" aria-label="Ouvrir Doctopus"
          className="group fixed bottom-6 right-6 z-40 grid h-14 w-14 animate-float place-items-center rounded-2xl bg-brand-600/85 text-white shadow-xl shadow-brand-950/25 ring-1 ring-white/25 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-2xl active:scale-95">
          {/* Reflet de verre (haut) + halo interne → volume 3D */}
          <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/30 via-transparent to-transparent" />
          <span className="pointer-events-none absolute inset-x-2 top-1 h-1/3 rounded-full bg-white/20 blur-md" />
          <Icon name="doctopus" className="relative h-8 w-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse-line rounded-full bg-signal-400 ring-2 ring-paper dark:ring-ink" />
        </button>
      )}

      {open && (
        <>
          {/* Capteur de clic extérieur — sans voile (popover, pas modale) */}
          <button aria-hidden tabIndex={-1} onClick={() => closeDoctopus()} className="fixed inset-0 z-[60] cursor-default" />
          <aside className="glass glass-edge fixed bottom-[5.75rem] right-6 z-[70] flex max-h-[74vh] w-[min(384px,calc(100vw-2rem))] origin-bottom-right animate-pop flex-col overflow-hidden rounded-3xl">
            {/* En-tête */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <MarkBadge />
                <div className="leading-none">
                  <div className="font-display text-sm font-bold tracking-tightish">Doctopus</div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-400">Assistant · IA</div>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setShowSettings((s) => !s)} title="Réglages IA" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10"><Icon name="gear" className="h-[18px] w-[18px]" /></button>
                <button onClick={() => closeDoctopus()} title="Fermer" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10">✕</button>
              </div>
            </div>

            {showSettings && <Settings onClose={() => setShowSettings(false)} />}

            {/* Zone de saisie */}
            <div className="border-b border-slate-200/70 p-3 dark:border-white/10">
              <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={2} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask(); }}
                placeholder="Une question, ou un terme à traduire… (⌘/Ctrl+↵)"
                className="w-full resize-none rounded-xl border border-slate-300/80 bg-white/70 px-3 py-2 text-sm outline-none transition-colors focus:border-brand-400 dark:border-white/10 dark:bg-white/5" />
              <button onClick={ask} disabled={!q.trim() || loading || !hasKey()} className="btn-primary mt-2 w-full justify-center gap-1.5 text-sm disabled:opacity-40">
                {loading ? 'Doctopus réfléchit…' : <><Icon name="spark" className="h-4 w-4" />Demander</>}
              </button>
              {!hasKey() && <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">Ajoute ta clé (gratuite) dans <Icon name="gear" className="inline-block h-3 w-3 align-[-1px]" /> pour activer l'IA en ligne.</p>}
            </div>

            {/* Réponses / suggestions */}
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {answer && (
                <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300"><Icon name="doctopus" className="h-4 w-4" /> Doctopus</div>
                  <div className="whitespace-pre-wrap text-[13px] leading-relaxed">{answer}</div>
                </div>
              )}
              {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">{error}</p>}

              {!q.trim() && !answer && (
                <div className="space-y-1.5">
                  <div className="label">Exemples — clique pour essayer</div>
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => setQ(ex)} className="flex w-full items-center gap-2 rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-left text-[13px] transition-colors hover:border-brand-400 dark:border-white/10 dark:bg-white/5">
                      <Icon name="spark" className="h-3.5 w-3.5 shrink-0 text-slate-300" />{ex}
                    </button>
                  ))}
                </div>
              )}

              {isWord && hits.length > 0 && (
                <div className="space-y-2">
                  <div className="label">Recherche instantanée (hors-ligne)</div>
                  {hits.map((h, i) => (
                    <button key={i} onClick={() => h.fb && (openGlossary(h.fb), closeDoctopus())}
                      className={`w-full rounded-xl border border-slate-200/70 bg-white/50 p-3 text-left dark:border-white/10 dark:bg-white/5 ${h.fb ? 'hover:border-brand-400' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-brand-700 dark:text-brand-300">{h.term}</span>
                        <span className="chip bg-slate-100 text-[10px] text-slate-400 dark:bg-white/10">{h.source === 'fachbegriff' ? 'Fachbegriff' : 'dico'}</span>
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
                        className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white/50 px-3 py-2 text-sm transition-colors hover:border-brand-400 dark:border-white/10 dark:bg-white/5">
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
    <div className="space-y-2 border-b border-slate-200/70 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/5">
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
