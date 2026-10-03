import { useEffect, useRef } from 'react';
import { useUi } from '@/store/ui';
import { useCase } from '@/hooks/useData';
import { TeilAiPanel } from './ai/TeilAiLauncher';

// Feuille « Simuler avec ton IA » — montée une fois dans Shell, ouverte par
// useUi.openExternalAi(caseId) hors du runner (fiche du cas, écran amont,
// résultat). Sans Teil d'ancrage, elle joue l'Anamnese (contrat ai-bridge
// §3.1). Dans le runner, c'est TeilAiLauncher qui porte le Teil courant.
export function ExternalAiSheet() {
  const caseId = useUi((s) => s.externalAiCaseId);
  const close = useUi((s) => s.closeExternalAi);
  const c = useCase(caseId ?? undefined);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!caseId) return;
    dialogRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [caseId, close]);

  if (!caseId || !c) return null;
  return (
    <>
      <div className="animate-fade-in-fast fixed inset-0 z-40 bg-slate-900/20" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Simuler avec ton IA" ref={dialogRef} tabIndex={-1}
        className="glass glass-edge animate-pop fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-md space-y-4 overflow-y-auto rounded-t-2xl p-5 outline-none sm:inset-auto sm:left-1/2 sm:top-[10vh] sm:-translate-x-1/2 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label">Simuler avec ton IA</div>
            <h2 className="text-lg font-bold tracking-tightish">{c.name}</h2>
          </div>
          <button type="button" onClick={close} className="btn-ghost -mr-2 -mt-1 min-h-9 px-2.5 text-sm">Fermer</button>
        </div>
        <TeilAiPanel caseId={caseId} teil="anamnese" />
      </div>
    </>
  );
}
