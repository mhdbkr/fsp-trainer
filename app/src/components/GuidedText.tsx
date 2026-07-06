import React, { useMemo } from 'react';
import { AutoLink } from '@/components/AutoLink';

// ============================================================================
// GuidedText — surligne les mots-clés du guide ET auto-linke les Fachbegriffe.
// Les segments "mot-clé" sont mis en évidence (<mark>) ; les segments restants
// passent par AutoLink (terme → glossaire). Combine les deux sans conflit.
// ============================================================================

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function GuidedText({ text, keywords }: { text: string; keywords?: string[] }) {
  const segments = useMemo(() => {
    if (!keywords?.length) return [{ t: text, kw: false }];
    const valid = keywords.filter((k) => k && k.length >= 2).map(escapeRe);
    if (!valid.length) return [{ t: text, kw: false }];
    const re = new RegExp(`(${valid.join('|')})`, 'gi');
    const out: { t: string; kw: boolean }[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), kw: false });
      out.push({ t: m[0], kw: true });
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (last < text.length) out.push({ t: text.slice(last), kw: false });
    return out;
  }, [text, keywords]);

  return (
    <>
      {segments.map((s, i) =>
        s.kw ? (
          <mark key={i} className="rounded bg-brand-100 px-0.5 font-semibold text-brand-800 dark:bg-brand-500/25 dark:text-brand-200">
            {s.t}
          </mark>
        ) : (
          <React.Fragment key={i}><AutoLink>{s.t}</AutoLink></React.Fragment>
        ),
      )}
    </>
  );
}
