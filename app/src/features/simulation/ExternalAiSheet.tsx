import { useEffect, useMemo, useRef, useState } from 'react';
import { useUi } from '@/store/ui';
import { useCase, useFachbegriffe } from '@/hooks/useData';
import { termsInOrder } from '@/lib/collections/caseTerms';
import { buildExternalPrompt, SCOPE_LABELS, type Scope, type FeedbackLang } from '@/lib/externalAi/prompt';
import { AI_TARGETS, buildLaunchUrl, launch, loadPrefs, savePrefs, setPending, type TargetId } from '@/lib/externalAi/targets';
import { Icon } from '@/components/icons';

// Feuille unique « Simuler avec ton IA » — montée une fois dans Shell, ouverte
// par useUi.openExternalAi(caseId) depuis la pré-sim, le runner, la fiche du
// cas et l'écran de résultat. Le prompt est construit ici, à la volée.
//
// Les prompts réels (12-44 k caractères) dépassent presque toujours
// PREFILL_MAX : `launch()` renvoie donc le plus souvent `prefilled: false`,
// et le libellé du bouton (« Copier et ouvrir … ») l'annonce dès avant le
// clic, via buildLaunchUrl(t, prompt). Le chemin normal reste donc
// « ouvrir + coller », d'où les 4 étapes numérotées (dont les mots de
// bascule) affichées après une copie réussie (pas seulement dans le toast).
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
  // Ordre des cibles fixé une fois (préférence sauvegardée d'abord) : une
  // sélection ne doit pas faire sauter les puces sous le doigt.
  const [order, setOrder] = useState<TargetId[]>(AI_TARGETS.map((x) => x.id));
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  // Garde double-tap (comme savingRef dans PendingExternalSimCard) : `go`
  // ouvre une fenêtre externe — un second appel avant la fin du premier ne
  // doit pas ré-ouvrir/ré-copier.
  const launchingRef = useRef(false);

  useEffect(() => {
    loadPrefs().then((p) => {
      setTarget(p.target);
      setScope(p.scope);
      setLang(p.feedbackLang);
      setOrder([p.target, ...AI_TARGETS.filter((x) => x.id !== p.target).map((x) => x.id)]);
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!caseId) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [caseId, close]);
  // Chaque ouverture d'un nouveau cas repart sans toast résiduel, et le focus
  // va sur la boîte de dialogue (accessibilité).
  useEffect(() => { setToast(null); setCopied(false); if (caseId) dialogRef.current?.focus(); }, [caseId]);

  const topTerms = useMemo(
    () => (c && begriffe ? termsInOrder(c.linkedFachbegriffeIds, begriffe).slice(0, 8).map((t) => t.term) : []),
    [c, begriffe],
  );
  const prompt = useMemo(() => (c ? buildExternalPrompt({ c, scope, feedbackLang: lang, topTerms }) : ''), [c, scope, lang, topTerms]);

  if (!caseId || !c) return null;
  const t = AI_TARGETS.find((x) => x.id === target)!;
  const sizeK = Math.max(1, Math.round(prompt.length / 1000));
  // Mots de bascule réels acceptés par le prompt (prompt.ts, section Rolle),
  // selon la portée — source unique pour l'en-tête ET les étapes numérotées.
  const switchWords = scope === 'anamnese'
    ? 'Dis « Ende » pour terminer.'
    : scope === 'exam'
      ? 'Dis « Fallvorstellung » pour passer à l\'Oberarzt, puis « Ende » pour terminer.'
      : 'Dis « Fallvorstellung » pour passer à l\'Oberarzt, « Feedback » pour le bilan, puis « Ende » pour terminer.';
  // Un prompt réel (12-44 k car.) dépasse presque toujours PREFILL_MAX : le
  // libellé du bouton est calculé AVANT le clic (pas après le retour de
  // launch()), pour ne jamais promettre une ouverture pré-remplie qui n'aura
  // pas lieu.
  const { prefilled: willPrefill } = buildLaunchUrl(t, prompt);
  const goLabel = willPrefill ? `Ouvrir dans ${t.label}` : `Copier et ouvrir ${t.label}`;

  const go = async () => {
    if (launchingRef.current) return; // double-tap : le premier lancement est déjà en cours
    launchingRef.current = true;
    try {
      // launch() ouvre D'ABORD, de façon synchrone dans ce gestionnaire de clic
      // (Safari/mobile bloque un window.open qui suit un await) — appelé
      // directement, sans rien attendre avant lui.
      const result = await launch(t, prompt);
      let prefsFailed = false;
      try {
        await Promise.all([savePrefs({ target, scope, feedbackLang: lang }), setPending({ caseId, targetId: target, scope, at: Date.now() })]);
      } catch { prefsFailed = true; }
      const suffix = prefsFailed ? ' (préférences non enregistrées)' : '';
      if (!result.copied) {
        setToast(`Copie impossible — sélectionne le texte de l'aperçu ci-dessous.${suffix}`);
        setPreview(true);
        return;
      }
      setCopied(true);
      if (result.prefilled && t.submits) setToast(`Prompt copié — le prompt part tout seul dans ${t.label}.${suffix}`);
      else if (result.prefilled) setToast(`Prompt pré-rempli — appuie sur Entrée pour l'envoyer.${suffix}`);
      else setToast(`Prompt copié — colle-le dans ${t.label}.${suffix}`);
    } finally {
      launchingRef.current = false;
    }
  };

  const copyOnly = async () => {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setToast('Prompt copié.'); }
    catch { setToast('Copie impossible — sélectionne le texte de l\'aperçu.'); setPreview(true); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Simuler avec ton IA" ref={dialogRef} tabIndex={-1}
        className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-lg space-y-4 overflow-y-auto rounded-t-2xl p-4 outline-none sm:inset-auto sm:left-1/2 sm:top-[8vh] sm:-translate-x-1/2 sm:rounded-2xl">
        <div>
          <div className="label">Simuler avec ton IA</div>
          <h2 className="text-lg font-bold">{c.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {/* Les mots de bascule ne sont dits qu'une fois, dans les étapes
                numérotées une fois copié (pense-bête au bon moment) — avant
                la copie, ils restent ici pour ne pas laisser l'en-tête vide. */}
            Le personnage est prêt.{!copied ? ` ${switchWords}` : ''}
          </p>
        </div>

        <div role="radiogroup" aria-label="IA" className="flex flex-wrap gap-2">
          {order.map((id) => AI_TARGETS.find((x) => x.id === id)!).map((x) => (
            <label key={x.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm [&:has(:focus-visible)]:ring-2 ring-brand-400 ${x.id === target ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
              <input type="radio" name="ai" className="sr-only" aria-label={x.label} checked={x.id === target} onChange={() => setTarget(x.id)} />
              {x.label}
            </label>
          ))}
        </div>

        <div role="radiogroup" aria-label="Portée" className="grid grid-cols-3 gap-2 text-sm">
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <label key={s} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center [&:has(:focus-visible)]:ring-2 ring-brand-400 ${s === scope ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
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

        {copied && (
          <ol className="space-y-1 rounded-xl border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <li><span className="font-semibold">1.</span> Colle le prompt</li>
            <li><span className="font-semibold">2.</span> Envoie</li>
            <li><span className="font-semibold">3.</span> Active le mode vocal et salue le patient
              <p className="text-[11.5px] text-slate-400">{t.voiceHint}</p>
            </li>
            <li><span className="font-semibold">4.</span> {switchWords}</li>
          </ol>
        )}

        <button type="button" onClick={() => setPreview((p) => !p)} className="btn-ghost min-h-11 text-sm">
          {preview ? 'Masquer l\'aperçu' : 'Voir ce que ton IA recevra'} · ≈ {sizeK} k caractères
        </button>
        {preview && <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">{prompt}</pre>}

        {toast && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{toast}</p>}

        <div className="flex flex-wrap justify-between gap-2">
          <button type="button" onClick={close} className="btn-outline min-h-11">Fermer</button>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyOnly} className="btn-outline min-h-11">Copier le prompt</button>
            <button type="button" onClick={go} className="btn-primary min-h-11"><Icon name="spark" className="h-4 w-4" />{goLabel}</button>
          </div>
        </div>
      </div>
    </>
  );
}
