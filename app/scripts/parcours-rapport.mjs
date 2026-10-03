// ============================================================================
// Le rapport « direction » du candidat synthétique : jour par jour, ce que la
// persona a fait, ce que l'app a montré, chaque invariant OK/KO — avec la
// capture quand il est KO. Écrit en français, lisible sans avoir lu le code.
// ============================================================================
import fs from 'node:fs';

export class Rapport {
  constructor(meta) {
    this.meta = meta;
    this.jours = [];
    this.observations = new Map();     // ce qu'aucune assertion ne tranche : pour l'agent de jugement (texte → { premier, n })
    this.cur = null;
  }

  /** Ouvre un jour. `etiquette` : « jour 3 · lundi 12 octobre ». */
  jour(etiquette, contexte = '') {
    this.cur = { etiquette, contexte, fait: [], vu: [], checks: [] };
    this.jours.push(this.cur);
    return this.cur;
  }
  fait(s) { this.cur.fait.push(s); }
  vu(s) { this.cur.vu.push(s); }
  observation(s) {
    const o = this.observations.get(s);
    if (o) o.n++; else this.observations.set(s, { premier: this.cur?.etiquette ?? '', n: 1 });
  }

  /** Enregistre le verdict d'un invariant. `shot` : chemin d'une capture (KO seulement). */
  check(id, titre, ok, detail, shot) {
    this.cur.checks.push({ id, titre, ok: !!ok, detail: detail ?? '', shot: ok ? undefined : shot });
  }

  tousLesChecks() { return this.jours.flatMap((j) => j.checks.map((c) => ({ ...c, jour: j.etiquette }))); }
  echecs() { return this.tousLesChecks().filter((c) => !c.ok); }

  markdown() {
    const all = this.tousLesChecks();
    const ko = all.filter((c) => !c.ok);
    const ids = [...new Set(all.map((c) => c.id))];
    const L = [];
    L.push(`# Candidat synthétique — parcours de ${this.meta.nbJours} jours (${this.meta.date})`, '');
    L.push(`> Généré par \`app/scripts/parcours-candidat.mjs\` — ne pas éditer à la main.`, '');
    L.push(`**Verdict : ${ko.length === 0 ? 'tous les invariants tiennent' : `${ko.length} invariant(s) KO sur ${all.length} vérifications`}.** `
      + `Durée du parcours : ${this.meta.dureeS} s. ${all.length - ko.length}/${all.length} vérifications OK.`, '');
    L.push('', `- **Persona** : ${this.meta.persona}`);
    L.push(`- **Build** : \`${this.meta.build}\` servi par \`vite preview\` (jamais le dev server) · **Base** : Supabase local (${this.meta.supabase})`);
    L.push(`- **Horloge** : injectée dans le navigateur (\`page.clock\`) — du ${this.meta.premierJour} au ${this.meta.dernierJour}, le code de l'app lit l'heure par \`lib/clock\`, donc Playwright la pilote sans toucher \`src/\`.`);
    L.push(`- **Contenu** : ${this.meta.contenu}`, '');

    if (ko.length) {
      L.push('## Bugs réels trouvés', '');
      L.push('Chaque ligne est un invariant violé par l\'app telle qu\'elle est construite — pas une erreur du harnais (le harnais est prouvé par mutation, voir `parcours-mutations.mjs`).', '');
      for (const c of ko) L.push(`- **${c.id}** — ${c.titre} (${c.jour}) : ${c.detail}${c.shot ? ` · capture : \`${c.shot}\`` : ''}`);
      L.push('');
    }

    L.push('## Invariants, vus depuis le DOM', '');
    L.push('| Invariant | Ce qu\'il garde | Vérifié | KO |', '|---|---|---|---|');
    for (const id of ids) {
      const xs = all.filter((c) => c.id === id);
      L.push(`| ${id} | ${xs[0].titre} | ${xs.length} | ${xs.filter((c) => !c.ok).length || '0'} |`);
    }
    L.push('');

    if (this.observations.size) {
      L.push('## Observations pour l\'agent de jugement', '');
      L.push('Ce qu\'aucune assertion ne tranche — à lire avec `ux-user-advocate` : ça donne envie ? ça s\'explique ? ça respecte l\'intention ?', '');
      for (const [t, o] of this.observations) L.push(`- ${t} _(${o.n === 1 ? o.premier : `vu ${o.n} fois, dès ${o.premier}`})_`);
      L.push('');
    }

    L.push('## Jour par jour', '');
    for (const j of this.jours) {
      L.push(`### ${j.etiquette}`, '');
      if (j.contexte) L.push(`_${j.contexte}_`, '');
      if (j.fait.length) { L.push('**Ce que la candidate a fait**', ''); for (const f of j.fait) L.push(`- ${f}`); L.push(''); }
      if (j.vu.length) { L.push('**Ce que l\'app a montré**', ''); for (const v of j.vu) L.push(`- ${v}`); L.push(''); }
      if (j.checks.length) {
        L.push('**Invariants**', '');
        for (const c of j.checks) L.push(`- ${c.ok ? 'OK' : '**KO**'} · ${c.id} — ${c.titre}${c.detail ? ` : ${c.detail}` : ''}${c.shot ? ` · capture \`${c.shot}\`` : ''}`);
        L.push('');
      }
    }
    return L.join('\n');
  }

  write(file) { fs.writeFileSync(file, this.markdown()); }
}
