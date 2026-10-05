// Les bornes d'un jour, lues dans le fuseau DU PLAN (training-journal.md §12.3 `jourDe`, §12.4 m11) — jamais celui de l'appareil.
import { describe, it, expect, afterEach } from 'vitest';
import { debutJour, finJour, fuseauValide, jourDe } from './fuseau';

const TZ_ORIGINE = process.env.TZ;
afterEach(() => { if (TZ_ORIGINE === undefined) delete process.env.TZ; else process.env.TZ = TZ_ORIGINE; });

describe('jourDe — le jour d’un instant, au fuseau demandé', () => {
  const t = Date.parse('2026-10-05T22:30:00Z');       // 5 oct. 22 h 30 UTC
  it.each([
    ['Europe/Berlin', '2026-10-06'],                  // 00 h 30 le 6
    ['UTC', '2026-10-05'],
    ['America/Los_Angeles', '2026-10-05'],            // 15 h 30
    ['Pacific/Auckland', '2026-10-06'],               // 11 h 30 le 6
    ['Asia/Tokyo', '2026-10-06'],
  ])('%s', (tz, jour) => expect(jourDe(t, tz)).toBe(jour));

  it('le fuseau de l’APPAREIL ne change rien quand le plan dit le sien', () => {
    for (const appareil of ['Europe/Paris', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = appareil;
      expect(jourDe(t, 'Europe/Berlin'), `appareil ${appareil}`).toBe('2026-10-06');
    }
  });
  it('sans fuseau (plan série 3) : le fuseau local', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(jourDe(t)).toBe('2026-10-06');
    process.env.TZ = 'America/Los_Angeles';
    expect(jourDe(t)).toBe('2026-10-05');
  });
  it('23 h 59 et 0 h 01 tombent de part et d’autre de minuit, dans le fuseau du plan', () => {
    const minuit = debutJour('2026-10-06', 'Europe/Berlin');
    expect(jourDe(minuit - 60_000, 'Europe/Berlin')).toBe('2026-10-05');
    expect(jourDe(minuit, 'Europe/Berlin')).toBe('2026-10-06');
    expect(jourDe(minuit + 60_000, 'Europe/Berlin')).toBe('2026-10-06');
  });
});

describe('debutJour / finJour — minuit local du fuseau du plan', () => {
  it('Europe/Berlin : minuit local = 22 h UTC la veille (heure d’été)', () => {
    expect(new Date(debutJour('2026-10-05', 'Europe/Berlin')).toISOString()).toBe('2026-10-04T22:00:00.000Z');
  });
  it('finJour(D) = debutJour(D + 1), y compris un jour de 25 h (retour à l’heure d’hiver, 25 oct. 2026) et de 23 h (29 mars)', () => {
    expect(finJour('2026-10-25', 'Europe/Berlin') - debutJour('2026-10-25', 'Europe/Berlin')).toBe(25 * 3600_000);
    expect(finJour('2026-03-29', 'Europe/Berlin') - debutJour('2026-03-29', 'Europe/Berlin')).toBe(23 * 3600_000);
    expect(finJour('2026-10-05', 'Europe/Berlin')).toBe(debutJour('2026-10-06', 'Europe/Berlin'));
  });
  it('un fuseau à décalage négatif et un fuseau à demi-heure', () => {
    expect(new Date(debutJour('2026-10-05', 'America/Los_Angeles')).toISOString()).toBe('2026-10-05T07:00:00.000Z');
    expect(new Date(debutJour('2026-10-05', 'Asia/Kolkata')).toISOString()).toBe('2026-10-04T18:30:00.000Z');
  });
  it('indépendant du fuseau de l’appareil', () => {
    const attendu = debutJour('2026-10-05', 'Europe/Berlin');
    for (const appareil of ['Asia/Tokyo', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = appareil;
      expect(debutJour('2026-10-05', 'Europe/Berlin'), appareil).toBe(attendu);
    }
  });
  it('sans fuseau : minuit local de l’appareil', () => {
    process.env.TZ = 'Europe/Paris';
    expect(debutJour('2026-10-05')).toBe(new Date(2026, 9, 5).getTime());
  });
  it('la frontière appartient au jour qui commence', () => {
    for (const tz of ['Europe/Berlin', 'Pacific/Auckland', 'America/Los_Angeles']) {
      const d = debutJour('2026-10-12', tz);
      expect(jourDe(d, tz)).toBe('2026-10-12');
      expect(jourDe(d - 1, tz)).toBe('2026-10-11');
      expect(jourDe(finJour('2026-10-12', tz) - 1, tz)).toBe('2026-10-12');
    }
  });
});

describe('fuseauValide — un fuseau venu de la synchro n’est pas cru sur parole', () => {
  it('accepte un identifiant IANA, refuse le reste', () => {
    expect(fuseauValide('Europe/Berlin')).toBe(true);
    for (const mauvais of ['Mars/Olympus', '', 42, null, undefined, 'x'.repeat(80)]) expect(fuseauValide(mauvais)).toBe(false);
  });
  it('jourDe retombe sur le fuseau local plutôt que de lever', () => {
    process.env.TZ = 'Asia/Tokyo';
    expect(jourDe(Date.parse('2026-10-05T22:30:00Z'), 'Mars/Olympus')).toBe('2026-10-06');
  });
});
