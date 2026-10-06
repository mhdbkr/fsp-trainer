// ============================================================================
// « Est-ce que je tiens ma semaine ? » (S4-5) — un point par cas prévu, rempli quand il est joué. Un cas entamé est
// à moitié plein, jamais « manqué » (INV-52). Les jours off sont neutres : ils ne cassent rien. Un jour à venir montre
// sa projection, non figée. Les points sont un dessin : l'étiquette du jour dit tout (la couleur n'est jamais seule).
// ============================================================================
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EtatPoint, JourSemaine } from '@/lib/program/pageProgramme';

const POINT: Record<EtatPoint, string> = {
  fait: 'bg-brand-600 dark:bg-brand-300',
  entame: 'border-[1.5px] border-brand-600 bg-[linear-gradient(90deg,theme(colors.brand.600)_50%,transparent_50%)] dark:border-brand-300 dark:bg-[linear-gradient(90deg,theme(colors.brand.300)_50%,transparent_50%)]',
  prevu: 'border-[1.5px] border-brand-500 dark:border-brand-300',
  projete: 'border-[1.5px] border-slate-300 dark:border-slate-600',
  'hors-plan': 'bg-brand-600 dark:bg-brand-300',
};
const MOT: Record<EtatPoint, string> = { fait: 'fait', entame: 'entamé', prevu: 'à faire', projete: 'en projection', 'hors-plan': 'joué hors plan' };

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`;

/** « mercredi 14 oct., aujourd'hui : 2 cas prévus, 1 entamé » — ce que les points dessinent, en mots. */
export function etiquetteJour(j: JourSemaine, today: string): string {
  const jour = `${format(parseISO(j.date), 'EEEE d MMM', { locale: fr })}${j.date === today ? ', aujourd\'hui' : ''}`;
  if (j.off) return `${jour} : off`;
  if (!j.points.length) return `${jour} : aucun cas prévu`;
  const n = (e: EtatPoint) => j.points.filter((p) => p.etat === e).length;
  const prevus = j.points.length - n('hors-plan') - n('projete'), faits = n('fait'), entames = n('entame'), hors = n('hors-plan'), projetes = n('projete');
  const parts = [
    ...(prevus ? [pluriel(prevus, 'cas prévu')] : []), ...(faits ? [pluriel(faits, 'fait')] : []), ...(entames ? [pluriel(entames, 'entamé')] : []),
    ...(projetes ? [`${projetes} cas en projection, non figée`] : []), ...(hors ? [`${hors} cas joué${hors > 1 ? 's' : ''} hors plan`] : []),
  ];
  return `${jour} : ${parts.join(', ')}`;
}

export function SemaineProgramme({ jours, today }: { jours: JourSemaine[]; today: string }) {
  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">La semaine</h2>
      <ol className="grid grid-cols-7 gap-1">
        {jours.map((j) => {
          const auj = j.date === today;
          return (
            <li key={j.date}
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-0.5 py-2 ${auj ? 'border-brand-500 dark:border-brand-400' : 'border-slate-200 dark:border-slate-800'} ${j.date < today ? 'opacity-80' : ''}`}>
              <span className="sr-only">{etiquetteJour(j, today)}</span>
              <span aria-hidden="true" className={`text-center text-[11px] font-medium capitalize leading-tight ${auj ? 'text-brand-700 dark:text-brand-200' : 'text-slate-500 dark:text-slate-400'}`}>
                {format(parseISO(j.date), 'EEEEEE', { locale: fr })}<span className="block text-center tnum">{format(parseISO(j.date), 'd')}</span>
              </span>
              <span aria-hidden="true" className="flex min-h-[10px] flex-wrap justify-center gap-[3px]">
                {j.off
                  ? <span className="text-[10px] leading-none text-slate-400">off</span>
                  : j.points.map((p, k) => <i key={k} title={`${p.label} · ${MOT[p.etat]}`} className={`block h-[9px] w-[9px] rounded-full ${POINT[p.etat]}`} />)}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
