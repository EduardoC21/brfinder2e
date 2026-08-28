import { describe, expect, it } from 'vitest';

import { parseDurationCode } from './duration';

/* Os seis códigos abaixo são todos os que aparecem nas 177 ações com frequência. */

describe('parseDurationCode', () => {
  it('a palavra solta vale um', () => {
    expect(parseDurationCode('day')).toEqual({ count: 1, unit: 'day' });
    expect(parseDurationCode('round')).toEqual({ count: 1, unit: 'round' });
    expect(parseDurationCode('turn')).toEqual({ count: 1, unit: 'turn' });
  });

  it('PT1H é uma hora — era isto que aparecia cru na tela do True Shapeshift', () => {
    expect(parseDurationCode('PT1H')).toEqual({ count: 1, unit: 'hour' });
  });

  it('o M depois do T é minuto; antes do T é mês', () => {
    expect(parseDurationCode('PT10M')).toEqual({ count: 10, unit: 'minute' });
    expect(parseDurationCode('PT1M')).toEqual({ count: 1, unit: 'minute' });
    expect(parseDurationCode('P1M')).toEqual({ count: 1, unit: 'month' });
  });

  it('o código que não reconhecemos devolve nulo, e a tela mostra o cru', () => {
    expect(parseDurationCode('sempre-que-quiser')).toBeNull();
    expect(parseDurationCode('')).toBeNull();
  });

  it('duração de zero é sintaxe válida e duração nenhuma', () => {
    expect(parseDurationCode('PT0S')).toBeNull();
  });
});
