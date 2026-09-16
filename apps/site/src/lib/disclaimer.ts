import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.cwd(), '../../docs/legal/disclaimer.md');

export function shortDisclaimerDe(): string {
  const md = readFileSync(file, 'utf8');
  const m = md.match(/^## Version courte pour le footer \(DE\)\s*\n([\s\S]*?)(?=^## )/m);
  if (!m) throw new Error('disclaimer.md : section « Version courte pour le footer (DE) » introuvable');
  return m[1].replace(/\s+/g, ' ').trim();
}
