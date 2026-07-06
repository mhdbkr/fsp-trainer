import type { SketchNotes } from '@/db/types';

// ============================================================================
// Canvas de notes "croquis" structuré par rubrique. UNE SEULE SAISIE qui
// alimente ensuite Doku ET Fallvorstellung (méthode du livre). Les rubriques
// sont exactement celles du Arztbrief pour ancrer le réflexe.
// ============================================================================

const FIELDS: { key: keyof SketchNotes; label: string; placeholder: string; group: 'anamnese' | 'assessment' }[] = [
  { key: 'aktuell', label: 'Aktuelle Beschwerden', placeholder: 'Leitsymptom, Schmerzanalyse (OPQRST)…', group: 'anamnese' },
  { key: 'vegetativ', label: 'Vegetative Anamnese', placeholder: 'Fieber, Gewicht, Appetit, Stuhl/Miktion, Schlaf…', group: 'anamnese' },
  { key: 'vorerkrankungen', label: 'Vorerkrankungen / OP', placeholder: 'chron. Erkrankungen, Z. n. …', group: 'anamnese' },
  { key: 'medikamente', label: 'Medikamente', placeholder: 'Name mg 0-0-0…', group: 'anamnese' },
  { key: 'allergien', label: 'Allergien', placeholder: 'Medikamente, Nahrung…', group: 'anamnese' },
  { key: 'noxen', label: 'Noxen', placeholder: 'Tabak … py, Alkohol, Drogen', group: 'anamnese' },
  { key: 'familie', label: 'Familienanamnese', placeholder: 'chron. Erkrankungen der Familie…', group: 'anamnese' },
  { key: 'sozial', label: 'Sozialanamnese', placeholder: 'Familienstand, Beruf, Wohnen…', group: 'anamnese' },
  { key: 'verdacht', label: 'Verdachtsdiagnose', placeholder: 'V. a. …', group: 'assessment' },
  { key: 'dd', label: 'Differenzialdiagnosen', placeholder: 'DD1, DD2, DD3…', group: 'assessment' },
  { key: 'diagnostik', label: 'Diagnostik', placeholder: 'Labor, Sono, CT, ÖGD…', group: 'assessment' },
  { key: 'therapie', label: 'Therapie / Procedere', placeholder: 'konservativ / interventionell / chirurgisch…', group: 'assessment' },
];

// Dictionnaire d'abréviations FSP auto-suggéré au survol du label.
const ABBR_HINT = 'Kürzel: Z. n. · V. a. · b. B. · o. g. · py · AZ/EZ';

export function NotesCanvas({ notes, onChange, compact = false }: {
  notes: SketchNotes; onChange: (n: SketchNotes) => void; compact?: boolean;
}) {
  const set = (key: keyof SketchNotes, val: string) => onChange({ ...notes, [key]: val });
  const groups = compact ? (['anamnese'] as const) : (['anamnese', 'assessment'] as const);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="mb-1.5 flex items-center justify-between">
            <div className="label">{g === 'anamnese' ? 'Anamnese-Notizen' : 'Einschätzung'}</div>
            {g === 'anamnese' && <span className="text-[10px] text-slate-400" title={ABBR_HINT}>ⓘ Kürzel</span>}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {FIELDS.filter((f) => f.group === g).map((f) => (
              <label key={f.key} className="block">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{f.label}</span>
                <textarea
                  value={notes[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={2}
                  className="input mt-0.5 resize-y font-mono text-[13px] leading-snug"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Générateurs de sortie : les mêmes notes → Arztbrief (Konjunktiv I) OU
// trame Fallvorstellung. Matérialise « une saisie, deux formats ».
// ---------------------------------------------------------------------------
export function notesToArztbrief(notes: SketchNotes, patientName = 'Der/die Patient/in'): string {
  const L: string[] = [];
  L.push('Sehr geehrte Frau Kollegin, sehr geehrter Herr Kollege,');
  L.push('');
  L.push(`wir berichten Ihnen nachfolgend über ${patientName}, die/der sich in unserer Notaufnahme vorstellte.`);
  L.push('');
  if (notes.aktuell) L.push(`Der/die Patient/in stellte sich mit ${notes.aktuell} vor.`);
  if (notes.vegetativ) L.push(`Vegetative Anamnese: ${notes.vegetativ}.`);
  if (notes.vorerkrankungen) L.push(`Der/die Patient/in leide an ${notes.vorerkrankungen}.`);
  if (notes.medikamente) L.push(`An Medikamenten nehme der/die Patient/in ${notes.medikamente} ein.`);
  if (notes.allergien) L.push(`Allergien: ${notes.allergien}.`);
  if (notes.noxen) L.push(`Noxen: ${notes.noxen}.`);
  if (notes.familie) L.push(`Familienanamnese: ${notes.familie}.`);
  if (notes.sozial) L.push(`Sozialanamnese: ${notes.sozial}.`);
  L.push('');
  if (notes.verdacht) L.push(`Die Anamnese deutet auf ${notes.verdacht} hin.`);
  if (notes.dd) L.push(`Differenzialdiagnostisch kommen in Betracht: ${notes.dd}.`);
  if (notes.diagnostik) L.push(`Es wurde folgende Diagnostik veranlasst: ${notes.diagnostik}.`);
  if (notes.therapie) L.push(`Therapie/Procedere: ${notes.therapie}.`);
  L.push('');
  L.push('Für weitere Fragen stehen wir Ihnen gern zur Verfügung.');
  L.push('Mit freundlichen kollegialen Grüßen');
  return L.join('\n');
}

export function notesToFallvorstellung(notes: SketchNotes, patientName = 'Der/die Patient/in'): string {
  const L: string[] = [];
  L.push(`Guten Tag. Wir haben einen neuen Fall: ${patientName}. Darf ich vorstellen?`);
  if (notes.aktuell) L.push(`Der/die Patient/in stellte sich mit ${notes.aktuell} vor.`);
  if (notes.vegetativ) L.push(`Die vegetative Anamnese: ${notes.vegetativ}.`);
  if (notes.vorerkrankungen) L.push(`Vorerkrankungen: ${notes.vorerkrankungen}.`);
  if (notes.medikamente) L.push(`Medikation: ${notes.medikamente}.`);
  if (notes.noxen) L.push(`Noxen: ${notes.noxen}.`);
  if (notes.verdacht) L.push(`Die Anamnese deutet auf ${notes.verdacht} hin.`);
  if (notes.dd) L.push(`Differenzialdiagnostisch kommen in Betracht: ${notes.dd}.`);
  if (notes.diagnostik) L.push(`Wir haben folgende Diagnostik angemeldet: ${notes.diagnostik}.`);
  if (notes.therapie) L.push(`Therapie: ${notes.therapie}.`);
  L.push('Das war zunächst alles. Des Weiteren möchte ich den Fall gern mit Ihnen besprechen.');
  return L.join('\n');
}
