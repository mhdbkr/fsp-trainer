// ============================================================================
// Modèles de l'assistant — module FEUILLE (aucun import d'app) : partagé par
// onlineAi.ts et par scripts/evalDoctopus.mjs, pour que l'évaluation mesure
// exactement ce que l'app envoie.
// ============================================================================
export interface AiProvider {
  id: string;
  label: string;
  endpoint: string;
  model: string;
  keyUrl: string;   // page pour obtenir une clé gratuite
}

export const PROVIDERS: AiProvider[] = [
  { id: 'groq', label: 'Groq (rapide, gratuit)', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant', keyUrl: 'https://console.groq.com/keys' },
  { id: 'groq-70b', label: 'Groq 70B (meilleure qualité)', endpoint: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys' },
  // Gemma 4 26B en principal : le jeu de référence (scripts/evalDoctopus.mjs)
  // a montré que LFM 2.5 (2,6 B) invente des posologies et conseille le « du »
  // au patient — pas le niveau d'un examinateur. LFM reste en dernier repli.
  { id: 'openrouter', label: 'OpenRouter — Gemma 4 26B (gratuit)', endpoint: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemma-4-26b-a4b-it:free', keyUrl: 'https://openrouter.ai/keys' },
];

// Modèles gratuits de repli : les modèles ":free" d'OpenRouter tournent sur
// une capacité partagée et échouent transitoirement (« Provider returned
// error », 502/503). Plutôt que de changer de modèle par défaut à chaque
// panne, on donne à OpenRouter une LISTE : il essaie le premier, et bascule
// lui-même sur le suivant si le fournisseur amont échoue — c'est son routage
// natif (`models`), pas une boucle de retry codée ici.
export const OPENROUTER_FALLBACKS = [
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'liquid/lfm-2.5-2.6b:free',
];
