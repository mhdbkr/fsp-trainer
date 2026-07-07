import type { PatientSheet } from '@/db/types';

// Fiche patient JOUABLE — conçue pour le partenaire (l'épouse) qui joue le rôle
// sans connaissances médicales. Pas d'auto-link ici : c'est le script du patient,
// on ne veut pas transformer ça en cours. Répliques difficiles mises en avant.
export function PatientSheetView({ sheet, caseSpecificQuestions, examinerQuestions }: {
  sheet: PatientSheet; caseSpecificQuestions: string[]; examinerQuestions: string[];
}) {
  const p = sheet.personalia;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
        🎭 <b>Rôle patient</b> — Réponds seulement aux questions posées, dans ce cadre. Tu peux déclencher les répliques difficiles pour corser l'exercice.
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Personalia">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Field k="Name" v={p.name} />
            <Field k="Alter" v={`${p.age} Jahre`} />
            {p.groesseCm && <Field k="Größe" v={`${p.groesseCm} cm`} />}
            {p.gewichtKg && <Field k="Gewicht" v={`${p.gewichtKg} kg`} />}
            {p.beruf && <Field k="Beruf" v={p.beruf} />}
            {p.hausarzt && <Field k="Hausarzt" v={p.hausarzt} />}
            {p.familienstand && <Field k="Familienstand" v={p.familienstand} />}
            {p.wohnsituation && <Field k="Wohnen" v={p.wohnsituation} />}
          </dl>
        </Card>

        <Card title="Leitsymptome (Grund des Besuchs)" accent>
          <List items={sheet.leitsymptome} />
          {sheet.schmerz && (
            <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs dark:bg-slate-800/60">
              <b>Schmerz:</b> {[sheet.schmerz.ort, sheet.schmerz.charakter, sheet.schmerz.intensitaet && `${sheet.schmerz.intensitaet}/10`, sheet.schmerz.ausstrahlung && `→ ${sheet.schmerz.ausstrahlung}`, sheet.schmerz.beginn].filter(Boolean).join(' · ')}
            </div>
          )}
        </Card>

        <Card title="Begleitsymptome"><List items={sheet.begleitsymptome} /></Card>
        <Card title="Vegetative Anamnese"><List items={sheet.vegetativeAnamnese.length ? sheet.vegetativeAnamnese : ['unauffällig']} /></Card>
        {sheet.negativeFindings && sheet.negativeFindings.length > 0 && (
          <Card title="Verneint (« Non » — si le médecin demande)">
            <ul className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
              {sheet.negativeFindings.map((it, i) => (
                <li key={i} className="flex gap-2"><span className="mt-0.5 shrink-0 text-rose-400">✗</span>{it}</li>
              ))}
            </ul>
          </Card>
        )}
        <Card title="Vorerkrankungen"><List items={sheet.vorerkrankungen} /></Card>
        <Card title="Voroperationen"><List items={sheet.voroperationen} /></Card>
        <Card title="Medikamente"><List items={sheet.medikamente} /></Card>
        <Card title="Allergien / Unverträglichkeiten"><List items={[...sheet.allergien, ...(sheet.unvertraeglichkeiten ?? [])]} /></Card>
        <Card title="Noxen">
          <dl className="space-y-1 text-sm">
            {sheet.noxen.tabak && <Field k="Tabak" v={sheet.noxen.tabak} />}
            {sheet.noxen.alkohol && <Field k="Alkohol" v={sheet.noxen.alkohol} />}
            {sheet.noxen.drogen && <Field k="Drogen" v={sheet.noxen.drogen} />}
          </dl>
        </Card>
        <Card title="Familien- + Sozialanamnese">
          <List items={[...sheet.familienanamnese, ...sheet.sozialanamnese]} />
        </Card>
      </div>

      {sheet.frageAntworten.length > 0 && (
        <Card title="Réponses type (si le médecin demande…)">
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {sheet.frageAntworten.map((qa, i) => (
              <li key={i} className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-3">
                <span className="text-slate-400 sm:w-1/2">« {qa.frage} »</span>
                <span className="font-medium sm:w-1/2">→ {qa.antwort}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {sheet.schwierigeReaktionen && sheet.schwierigeReaktionen.length > 0 && (
        <div className="card border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-900/10">
          <div className="label mb-2 text-rose-600 dark:text-rose-300">🎭 Répliques difficiles à déclencher</div>
          <List items={sheet.schwierigeReaktionen} />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {caseSpecificQuestions.length > 0 && (
          <Card title="Fallspezifische Fragen (que le médecin devrait poser)">
            <List items={caseSpecificQuestions} />
          </Card>
        )}
        {examinerQuestions.length > 0 && (
          <Card title="Fragen für Teil 3 (Prüfer-Rolle)" accent>
            <List items={examinerQuestions} />
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? 'border-brand-200 dark:border-brand-900/40' : ''}`}>
      <div className="label mb-2">{title}</div>
      {children}
    </div>
  );
}
function Field({ k, v }: { k: string; v: string }) {
  return <><dt className="text-slate-400">{k}</dt><dd className="font-medium">{v}</dd></>;
}
function List({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-slate-400">—</p>;
  return (
    <ul className="space-y-1 text-sm">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />{it}</li>
      ))}
    </ul>
  );
}
