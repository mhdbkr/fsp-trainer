import { createContext, useContext } from 'react';

/** Cas courant (page du cas, runner) : la hover-card et le panneau y attachent
 *  `caseId` aux ★ (F2a D6 : référence libre, événement porte le contexte). */
export const CaseContext = createContext<string | null>(null);
export const useCaseId = () => useContext(CaseContext);
