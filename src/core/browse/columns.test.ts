import { describe, expect, it } from 'vitest';

import { budgetTraits, isMarkedRarity, rarityLetter } from './columns';

describe('budgetTraits', () => {
  it('cabendo tudo, não sobra nada', () => {
    expect(budgetTraits(['fire'])).toEqual({ shown: ['fire'], hidden: 0 });
  });

  it('corta no orçamento e conta o resto', () => {
    // 'concentrate' 11 + ' ' + 'manipulate' 10 = 22; 'attack' levaria a 29, passa de 26.
    expect(budgetTraits(['concentrate', 'manipulate', 'attack', 'aura'])).toEqual({
      shown: ['concentrate', 'manipulate'],
      hidden: 2,
    });
  });

  /*
   * Uma linha com `+3` e nenhum traço não diz nada, e o primeiro é quase sempre o mais
   * característico da entrada.
   */
  it('mostra ao menos um, mesmo que ele sozinho estoure', () => {
    const enorme = 'um-traco-absurdamente-comprido';
    expect(budgetTraits([enorme, 'fire'])).toEqual({ shown: [enorme], hidden: 1 });
  });

  it('sem traços, nada a mostrar e nada escondido', () => {
    expect(budgetTraits([])).toEqual({ shown: [], hidden: 0 });
  });

  it('o orçamento é ajustável, para a coluna caber em telas diferentes', () => {
    expect(budgetTraits(['concentrate', 'manipulate'], 12)).toEqual({
      shown: ['concentrate'],
      hidden: 1,
    });
  });
});

describe('rarityLetter', () => {
  it('comum não desenha nada', () => {
    // 87% dos talentos e 46% das magias são comuns: etiqueta em quase toda linha é ruído.
    expect(rarityLetter('common')).toBeNull();
    expect(rarityLetter('')).toBeNull();
    expect(rarityLetter('inventada')).toBeNull();
  });

  it('as três marcadas têm letra própria', () => {
    expect(rarityLetter('uncommon')).toBe('I');
    expect(rarityLetter('rare')).toBe('R');
    expect(rarityLetter('unique')).toBe('Ú');
  });

  it('isMarkedRarity concorda com rarityLetter', () => {
    expect(isMarkedRarity('rare')).toBe(true);
    expect(isMarkedRarity('common')).toBe(false);
  });
});
