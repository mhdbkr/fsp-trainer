import { describe, expect, it } from 'vitest';
import { parseFollowUp } from './followUp';

describe('parseFollowUp', () => {
  it('« Falls verstorben » est un choix leben noch / verstorben, pas verstorben / nein (FB2-J3)', () => {
    const c = parseFollowUp('Falls verstorben: Woran, und wann?');
    expect(c).toMatchObject({ kind: 'wahl', options: ['leben noch', 'verstorben'], match: 'verstorben' });
  });
  it('« Falls ja » reste un toggle ja/nein', () => {
    expect(parseFollowUp('Falls ja: Seit wann?')).toMatchObject({ kind: 'ja', label: 'ja' });
  });
});
