import { useEffect, useMemo, useState } from 'react';
import { useUi } from '@/store/ui';
import { useCase, useFachbegriffe } from '@/hooks/useData';
import { termsInOrder } from '@/lib/collections/caseTerms';
import { buildExternalPrompt, SCOPE_LABELS, type Scope, type FeedbackLang } from '@/lib/externalAi/prompt';
import { AI_TARGETS, launch, loadPrefs, savePrefs, setPending, type TargetId } from '@/lib/externalAi/targets';
import { Icon } from '@/components/icons';

// Feuille unique « Simuler avec ton IA » — montée une fois dans Shell, ouverte
// par useUi.openExternalAi(caseId) depuis la pré-sim, le runner, la fiche du
// cas et l'écran de résultat. Le prompt est construit ici, à la volée.
//
// Les prompts réels (12-44 k caractères) dépassent presque toujours
// PREFILL_MAX : `launch()` renvoie donc le plus souvent `prefilled: false`.
// Le chemin normal reste donc « ouvrir + coller », d'où les 3 étapes
// numérotées affichées en permanence (pas seulement dans le toast).
export function ExternalAiSheet() {
  const caseId = useUi((s) => s.externalAiCaseId);
  const close = useUi((s) => s.closeExternalAi);
  const c = useCase(caseId ?? undefined);
  const begriffe = useFachbegriffe();
  const [target, setTarget] = useState<TargetId>('chatgpt');
  const [scope, setScope] = useState<Scope>('exam+feedback');
  const [lang, setLang] = useState<FeedbackLang>('fr');
  const [preview, setPreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => { loadPrefs().then((p) => { setTarget(p.target); setScope(p.scope); setLang(p.feedbackLang); }); }, []);
  useEffect(() => {
    if (!caseId) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [caseId, close]);
  // Chaque ouverture d'un nouveau cas repart sans toast résiduel.
  useEffect(() => { setToast(null); }, [caseId]);

  const topTerms = useMemo(
    () => (c && begriffe ? termsInOrder(c.linkedFachbegriffeIds, begriffe).slice(0, 8).map((t) => t.term) : []),
    [c, begriffe],
  );
  const prompt = useMemo(() => (c ? buildExternalPrompt({ c, scope, feedbackLang: lang, topTerms }) : ''), [c, scope, lang, topTerms]);

  if (!caseId || !c) return null;
  const t = AI_TARGETS.find((x) => x.id === target)!;
  const sizeK = Math.max(1, Math.round(prompt.length / 1000));

  const go = async () => {
    // launch() ouvre D'ABORD, de façon synchrone dans ce gestionnaire de clic
    // (Safari/mobile bloque un window.open qui suit un await) — appelé
    // directement, sans rien attendre avant lui.
    const result = await launch(t, prompt);
    await Promise.all([savePrefs({ target, scope, feedbackLang: lang }), setPending({ caseId, targetId: target, scope, at: Date.now() })]);
    setToast(result.prefilled ? `Prompt copié — le prompt part tout seul dans ${t.label}.` : `Prompt copié — colle-le dans ${t.label}.`);
  };

  const copyOnly = async () => {
    try { await navigator.clipboard.writeText(prompt); setToast('Prompt copié.'); }
    catch { setToast('Copie impossible — sélectionne le texte de l\'aperçu.'); setPreview(true); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Simuler avec ton IA"
        className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-lg space-y-4 overflow-y-auto rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-[8vh] sm:-translate-x-1/2 sm:rounded-2xl">
        <div>
          <div className="label">Simuler avec ton IA</div>
          <h2 className="text-lg font-bold">{c.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Le personnage est prêt. Dis « Fallvorstellung » pour passer à l'Oberarzt{scope === 'exam+feedback' ? ', « Feedback » pour le bilan' : ''}.
          </p>
        </div>

        <div role="radiogroup" aria-label="IA" className="flex flex-wrap gap-2">
          {[t, ...AI_TARGETS.filter((x) => x.id !== target)].map((x) => (
            <label key={x.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${x.id === target ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700'}`}>
              <input type="radio" name="ai" className="sr-only" aria-label={x.label} checked={x.id === target} onChange={() => setTarget(x.id)} />
              <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-white dark:bg-ink-600">{x.label[0]}</span>{x.label}
            </label>
          ))}
        </div>

        <div role="radiogroup" aria-label="Portée" className="grid grid-cols-3 gap-2 text-sm">
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <label key={s} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center ${s === scope ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name="scope" className="sr-only" aria-label={SCOPE_LABELS[s]} checked={s === scope} onChange={() => setScope(s)} />
              {SCOPE_LABELS[s]}
            </label>
          ))}
        </div>

        {scope === 'exam+feedback' && (
          <div className="flex items-center gap-3 text-sm">
            <span className="label">Feedback en</span>
            {(['fr', 'de'] as FeedbackLang[]).map((l) => (
              <button key={l} type="button" onClick={() => setLang(l)} className={`min-h-11 rounded-full px-3 ${lang === l ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                {l === 'fr' ? 'Français' : 'Deutsch'}
              </button>
            ))}
          </div>
        )}

        <ol className="space-y-1 rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <li><span className="font-semibold">1.</span> Colle le prompt (déjà copié)</li>
          <li><span className="font-semibold">2.</span> Envoie</li>
          <li><span className="font-semibold">3.</span> Active le mode vocal et salue le patient
            <p className="text-[11.5px] text-slate-400">{t.voiceHint}</p>
          </li>
        </ol>

        <button type="button" onClick={() => setPreview((p) => !p)} className="btn-ghost text-sm">
          {preview ? 'Masquer l\'aperçu' : 'Voir ce que ton IA recevra'} · ≈ {sizeK} k caractères
        </button>
        {preview && <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">{prompt}</pre>}

        {toast && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{toast}</p>}

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={copyOnly} className="btn-outline">Copier le prompt</button>
          <button type="button" onClick={go} className="btn-primary"><Icon name="spark" className="h-4 w-4" />Ouvrir dans {t.label}</button>
        </div>
      </div>
    </>
  );
}
