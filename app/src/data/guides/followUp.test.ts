import { describe, expect, it } from 'vitest';
import { groupFollowUps, parseFollowUp } from './followUp';

describe('parseFollowUp', () => {
  it('« Falls verstorben » est un choix leben noch / verstorben, pas verstorben / nein (FB2-J3)', () => {
    const c = parseFollowUp('Falls verstorben: Woran, und wann?');
    expect(c).toMatchObject({ kind: 'wahl', options: ['leben noch', 'verstorben'], match: 'verstorben' });
  });
  it('« Falls ja » reste un toggle ja/nein', () => {
    expect(parseFollowUp('Falls ja: Seit wann?')).toMatchObject({ kind: 'ja', label: 'ja' });
  });
});

describe('groupFollowUps', () => {
  it('« Falls ja » + « Falls aufgehört » deviennent un seul contrôle à trois branches', () => {
    const g = groupFollowUps(['Falls ja: Seit wann?', 'Falls aufgehört: Wann?']);
    expect(g).toHaveLength(1);
    expect(g[0].control).toMatchObject({ kind: 'zweig', options: ['ja', 'aufgehört', 'nie'] });
    expect((g[0].control as { branches: Record<string, string[]> }).branches.aufgehört).toEqual(['Wann?']);
  });
});
