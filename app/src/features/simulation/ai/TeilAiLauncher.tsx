// ============================================================================
// TeilAiLauncher — jouer le Teil courant avec une IA externe (ChatGPT, Gemini).
//
// CONTRAT DE MONTAGE (en-tête du runner, à côté d'Aufklärung et Fachbegriffe) :
//   <TeilAiLauncher caseId={c.id} teil={part} />
//   - à rendre SEULEMENT si part === 'anamnese' || part === 'fallvorstellung'
//     (contrat ai-bridge §3.1) ; jamais pendant dokumentation / aufklaerung ;
//   - le parent fournit une ligne d'outils : le composant rend une puce
//     « IA » ; son panneau flotte sous le déclencheur (au-dessus s'il est
//     près du bas) dans un portail (fixed, z-50, tenu à 16 px des bords,
//     hauteur bornée à l'espace disponible) ;
//   - aucune dépendance au store : il lit le cas (Dexie), la cible mémorisée
//     (`meta.externalAi.target`) et pose la trace `meta.externalAi.pending`
//     avec le Teil — la PendingExternalSimCard la reprend au retour ;
//   - la puce d'en-tête globale du runner (« Continuer avec ton IA ») devient
//     inutile et se retire au montage (contrat §3.1).
// Le corps (`TeilAiPanel`) sert aussi la feuille ExternalAiSheet (fiche du cas,
// écran amont), où le Teil vaut 'anamnese'.
//
// Promesse tenue (contrat §1) : le libellé vient de launchPlan(), pur. Au
// niveau 2 — celui des deux cibles aujourd'hui — on copie dans le geste, on
// ouvre l'app par un vrai lien, et la confirmation n'apparaît qu'une fois la
// copie réussie.
// ============================================================================
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useCase } from '@/hooks/useData';
import { Icon } from '@/components/icons';
import { Portal } from '@/components/Portal';
import { buildPromptPaket, promptText, type AnkerTeil } from '@/lib/externalAi/prompt';
import { AI_TARGETS, copyText, launchPlan, loadTarget, saveTarget, setPending, type TargetId } from '@/lib/externalAi/targets';
import './teilAi.css';

const STEPS: Record<AnkerTeil, { text: string; icon: string }[]> = {
  anamnese: [
    { text: 'On prépare le patient', icon: 'id' },
    { text: "L'IA l'incarne", icon: 'spark' },
    { text: "Tu mènes l'entretien", icon: 'handshake' },
  ],
  fallvorstellung: [
    { text: "On prépare l'Oberarzt", icon: 'id' },
    { text: "L'IA le joue", icon: 'spark' },
    { text: 'Tu présentes le cas', icon: 'handshake' },
  ],
};

interface Outcome { copied: boolean; level: 1 | 2; via: 'open' | 'copy'; teil: AnkerTeil; label: string }

/** Ce qu'on dit après l'action — pur. Au niveau 1 ouvert, le prompt est déjà
 *  dans l'IA : la copie n'est qu'un filet, son échec ne change rien. */
export function launchStatus(o: Outcome): { ok: boolean; text: string } {
  const suite = o.teil === 'anamnese' ? 'écris ta salutation, envoie.' : "envoie : l'Oberarzt ouvre.";
  if (o.via === 'open' && o.level === 1) return { ok: true, text: `Le prompt est en place dans ${o.label} — ${suite}` };
  if (!o.copied) return { ok: false, text: `Copie impossible — sélectionne le texte ci-dessous et colle-le dans ${o.label}.` };
  return { ok: true, text: `Prompt copié — colle-le dans ${o.label}${o.teil === 'anamnese' ? ', écris ta salutation, envoie.' : " et envoie : l'Oberarzt ouvre."}` };
}

function Explainer({ teil }: { teil: AnkerTeil }) {
  return (
    <ol className="relative grid grid-cols-3 gap-1 pt-1" aria-label="Comment ça marche">
      {/* La piste relie le centre des trois étapes. */}
      <span aria-hidden className="tal-track absolute left-[16.66%] right-[16.66%] top-[17px] h-px bg-brand-300/70 dark:bg-brand-700" />
      <span aria-hidden className="tal-signal absolute top-[14px] h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-signal-400" />
      {STEPS[teil].map((s) => (
        <li key={s.text} className="tal-step flex flex-col items-center gap-1.5 text-center">
          <span className="tal-node relative grid h-[34px] w-[34px] place-items-center rounded-full border border-brand-200 bg-paper text-brand-600 dark:border-brand-800 dark:bg-ink-800 dark:text-brand-300">
            <Icon name={s.icon} className="h-[17px] w-[17px]" title="" />
          </span>
          <span className="tal-cap text-[12px] leading-snug text-slate-600 dark:text-slate-300">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function TeilAiPanel({ caseId, teil, autoFocus = false }: { caseId: string; teil: AnkerTeil; autoFocus?: boolean }) {
  const c = useCase(caseId);
  const text = useMemo(() => (c ? promptText(buildPromptPaket(c, teil)) : ''), [c, teil]);
  // undefined = la mémoire n'est pas encore lue : on ne rend pas les cibles,
  // pour qu'elles ne sautent pas de ChatGPT à la cible mémorisée.
  const [remembered, setRemembered] = useState<TargetId | null | undefined>(undefined);
  const [target, setTarget] = useState<TargetId>('chatgpt');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [preview, setPreview] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    loadTarget().then((r) => { if (!alive) return; setRemembered(r); if (r) setTarget(r); }).catch(() => alive && setRemembered(null));
    return () => { alive = false; };
  }, []);
  const groupRef = useRef<HTMLDivElement>(null);
  // Une fois les cibles rendues, le clavier part de la cible cochée.
  useEffect(() => {
    if (autoFocus && remembered !== undefined) groupRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
  }, [autoFocus, remembered]);
  useEffect(() => {
    if (result && !result.ok) { areaRef.current?.focus(); areaRef.current?.select(); }
  }, [result]);

  const t = AI_TARGETS.find((x) => x.id === target)!;
  const plan = launchPlan(t, text);

  const choose = (id: TargetId) => {
    if (id === target) return;
    setTarget(id); setResult(null); setCopiedFlash(false);
    saveTarget(id).catch(() => {});
  };
  const record = () => {
    Promise.all([saveTarget(target), setPending({ caseId, targetId: target, teil, at: Date.now() })]).catch(() => {});
  };
  const settle = (copied: boolean, via: Outcome['via']) => {
    const r = launchStatus({ copied, level: plan.level, via, teil, label: t.label });
    setResult(r);
    setCopiedFlash(copied);
    if (!r.ok) setPreview(true);
  };
  // Le lien s'ouvre de lui-même (geste natif, lien universel de l'app) ; la
  // copie part dans le même geste, avant que la page ne perde le focus.
  const onOpen = (e: React.MouseEvent) => {
    if (!text) { e.preventDefault(); return; } // `pointer-events-none` n'arrête pas le clavier
    const copying = copyText(text);
    record();
    copying.then((ok) => settle(ok, 'open')).catch(() => settle(false, 'open'));
  };
  const onCopy = async () => { const ok = await copyText(text); record(); settle(ok, 'copy'); };

  const status = result?.text;
  const sizeK = (text.length / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 });
  const index = AI_TARGETS.findIndex((x) => x.id === target);

  return (
    <div className="space-y-4">
      <Explainer teil={teil} />

      <div className="space-y-1.5">
        <div className="flex h-4 items-baseline justify-between">
          <span className="label">Ton IA</span>
          {remembered && remembered === target && <span className="animate-fade-in-fast text-[11.5px] text-slate-400">comme la dernière fois</span>}
        </div>
        {remembered === undefined ? (
          <div className="h-11 rounded-full bg-slate-100 dark:bg-ink-700" aria-hidden />
        ) : (
          <div
            ref={groupRef} role="radiogroup" aria-label="Ton IA"
            className="relative grid grid-cols-2 rounded-full bg-slate-100 p-1 dark:bg-ink-700"
            onKeyDown={(e) => {
              const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
              if (!step) return;
              e.preventDefault();
              const next = AI_TARGETS[(index + step + AI_TARGETS.length) % AI_TARGETS.length];
              choose(next.id);
              (e.currentTarget.querySelector(`[data-id="${next.id}"]`) as HTMLElement | null)?.focus();
            }}
          >
            <span
              aria-hidden
              className="tal-thumb absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-brand-50 ring-1 ring-brand-500/25 dark:bg-brand-900/50 dark:ring-brand-400/25"
              style={{ transform: `translateX(${index * 100}%)` }}
            />
            {AI_TARGETS.map((x) => (
              <button
                key={x.id} type="button" role="radio" data-id={x.id}
                aria-checked={x.id === target} tabIndex={x.id === target ? 0 : -1}
                onClick={() => choose(x.id)}
                className={`relative z-10 min-h-9 rounded-full text-sm font-semibold tracking-tightish transition-colors duration-200 ${x.id === target ? 'text-brand-700 dark:text-brand-200' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {x.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <a
          href={plan.url} target="_blank" rel="noopener noreferrer" onClick={onOpen}
          className={`btn-primary min-h-11 flex-1 justify-center gap-2 ${text ? '' : 'pointer-events-none opacity-50'}`}
          aria-disabled={!text}
        >
          {plan.label}
          <Icon name="external" className="h-4 w-4 opacity-80" title="" />
        </a>
        <button type="button" onClick={() => { onCopy().catch(() => settle(false, 'copy')); }} disabled={!text}
          className="btn-outline min-h-11 min-w-11 justify-center gap-2 px-3 sm:w-[6.5rem]" aria-label={copiedFlash ? 'Copié' : 'Copier'}>
          <span className="relative grid h-4 w-4 place-items-center" aria-hidden>
            <span className={`tal-glyph absolute inset-0 ${copiedFlash ? 'scale-50 opacity-0' : 'opacity-100'}`}><Icon name="copy" className="h-4 w-4" title="" /></span>
            {copiedFlash && <span className="tal-tick absolute inset-0 text-brand-600 dark:text-brand-300"><Icon name="check" className="h-4 w-4" title="" /></span>}
          </span>
          <span className="hidden text-sm sm:inline">{copiedFlash ? 'Copié' : 'Copier'}</span>
        </button>
      </div>

      {status && (
        <p role="status" key={status} className={`animate-fade-in-fast flex items-start gap-2 text-sm ${result?.ok ? 'text-brand-700 dark:text-brand-200' : 'text-signal-700 dark:text-signal-300'}`}>
          <Icon name={result?.ok ? 'check' : 'copy'} className="mt-0.5 h-4 w-4 shrink-0" title="" />
          <span>{status}</span>
        </p>
      )}

      <div>
        <button type="button" onClick={() => setPreview((p) => !p)} aria-expanded={preview} className="text-[12px] text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200">
          {preview ? 'Masquer le texte' : `Voir le texte · ${sizeK} k caractères`}
        </button>
        {preview && (
          <textarea
            ref={areaRef} readOnly value={text} aria-label="Texte du prompt"
            className="animate-fade-in-fast mt-2 h-48 w-full resize-none rounded-xl border border-slate-200 bg-paper p-3 text-xs leading-relaxed text-slate-700 outline-none dark:border-ink-600 dark:bg-ink-800 dark:text-slate-200"
          />
        )}
      </div>
    </div>
  );
}

const GUTTER = 16;
const MIN_PANEL = 320; // hauteur sous laquelle on préfère ouvrir au-dessus

export function TeilAiLauncher({ caseId, teil }: { caseId: string; teil: AnkerTeil }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; maxHeight: number; top?: number; bottom?: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  // Le panneau vit dans un portail (un ancêtre transformé ferait dériver un
  // `fixed`) et se cale sous le déclencheur, sans jamais sortir de l'écran.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.min(368, window.innerWidth - 2 * GUTTER);
      const left = Math.max(GUTTER, Math.min(r.left, window.innerWidth - width - GUTTER));
      // Sous le bouton par défaut ; au-dessus s'il reste trop peu de place en
      // bas et davantage en haut. La hauteur est bornée à l'espace disponible.
      const below = window.innerHeight - r.bottom - 8 - GUTTER;
      const above = r.top - 8 - GUTTER;
      setPos(below < MIN_PANEL && above > below
        ? { left, width, bottom: window.innerHeight - r.top + 8, maxHeight: above }
        : { left, width, top: r.bottom + 8, maxHeight: below });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!panelRef.current?.contains(n) && !btnRef.current?.contains(n)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}
        aria-label="Avec ton IA" title="Jouer cette partie avec ton IA"
        className={`chip shrink-0 bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 ${open ? 'ring-1 ring-brand-500/40' : ''}`}
      >
        <Icon name="spark" className="h-3.5 w-3.5" title="" />IA
      </button>
      {open && pos && (
        <Portal>
          <div
            ref={panelRef} id={panelId} role="dialog"
            aria-label={teil === 'anamnese' ? 'Jouer l\'anamnèse avec ton IA' : 'Jouer la Fallvorstellung avec ton IA'}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxHeight }}
            className={`glass glass-edge animate-pop fixed z-50 overflow-y-auto rounded-2xl p-4 ${pos.bottom !== undefined ? 'origin-bottom-left' : 'origin-top-left'}`}
          >
            <TeilAiPanel caseId={caseId} teil={teil} autoFocus />
          </div>
        </Portal>
      )}
    </>
  );
}
