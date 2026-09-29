import { describe, it, expect } from 'vitest';
import { registerLine } from './TermRegister';

describe('registerLine', () => {
  it('parole du patient si registre, sinon Bedeutung', () => {
    expect(registerLine({ translationSimple: 'Bauchwasser', register: { patient: 'Wasser im Bauch', vorstellung: 'v', anamnese: 'a?' } })).toBe('Wasser im Bauch');
    expect(registerLine({ translationSimple: 'x' })).toBe('x');
  });
});
