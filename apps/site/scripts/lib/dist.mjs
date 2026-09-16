import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
export function listHtml(dir) {
  const out = [];
  for (const e of readdirSync(dir)) { const p = join(dir, e); if (statSync(p).isDirectory()) out.push(...listHtml(p)); else if (e.endsWith('.html')) out.push(p); }
  return out.sort();
}
export function textOf(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
export function report(errs, label) {
  if (errs.length) { for (const e of errs) console.error(`✗ ${e}`); console.error(`✗ ${label}: ${errs.length} manquement(s)`); process.exitCode = 1; }
  else console.log(`✓ ${label}`);
}
