import { describe, expect, it } from 'vitest';

import { columnWidth, fitTraits, isMarkedRarity, rarityLetter, traitSpace } from './columns';

/* Largura de um traço: comprimento × 6,6 + 20 de recheio. `fire` custa 46px. */

describe('fitTraits', () => {
  it('cabendo tudo, não sobra nada e não reserva espaço à toa', () => {
    expect(fitTraits(['fire'], 60)).toEqual({ shown: ['fire'], hidden: 0 });
  });

  it('corta no espaço e conta o resto', () => {
    // concentrate 92,6 + manipulate 86 + reserva do +N 39,8 = 218,4, que cabe em 225.
    // Depois, attack levaria a 238,2 e não cabe.
    expect(fitTraits(['concentrate', 'manipulate', 'attack'], 225)).toEqual({
      shown: ['concentrate', 'manipulate'],
      hidden: 1,
    });
  });

  it('mais espaço mostra mais traços — é o que faz a lista responder à tela', () => {
    const todos = ['fire', 'water', 'earth', 'air'];
    expect(fitTraits(todos, 100).shown).toHaveLength(1);
    expect(fitTraits(todos, 400).shown).toHaveLength(4);
  });

  /*
   * A informação "tem mais" é a que menos pode faltar: sem reserva, o último traço a caber
   * empurraria o +N para fora e a linha mentiria por omissão.
   */
  it('guarda espaço para o +N quando ainda sobra traço', () => {
    const r = fitTraits(['fire', 'water', 'earth'], 100);
    expect(r.hidden).toBeGreaterThan(0);
    expect(r.shown).toHaveLength(1);
  });

  /*
   * Nem um traço cabendo, a linha fica só com o `+N`. O `+3` sozinho já diz "esta entrada
   * tem traços, abra para ver", enquanto um traço espremido até as reticências não diz nem
   * isso e ainda empurra o nome.
   */
  it('sem espaço para nenhum, sobra só o +N', () => {
    expect(fitTraits(['brandish', 'commander'], 10)).toEqual({ shown: [], hidden: 2 });
  });

  it('um traço enorme sozinho também não força a barra', () => {
    const enorme = 'um-traco-absurdamente-comprido';
    expect(fitTraits([enorme], 10)).toEqual({ shown: [], hidden: 1 });
  });

  it('sem traços, nada a mostrar e nada escondido', () => {
    expect(fitTraits([], 500)).toEqual({ shown: [], hidden: 0 });
  });
});

describe('traitSpace', () => {
  it('nome comprido deixa menos espaço para traço', () => {
    expect(traitSpace(600, 'Trip', false)).toBeGreaterThan(
      traitSpace(600, 'Demoralizing Charge of the Endless Night', false),
    );
  });

  it('a etiqueta de raridade cobra o espaço dela', () => {
    expect(traitSpace(600, 'Trip', true)).toBeLessThan(traitSpace(600, 'Trip', false));
  });

  /*
   * A ORDEM de quem cede. O nome toma o espaço que precisar e só para no piso do `+N`:
   * "esta entrada tem traços" cabe em 40px e não tem substituto, enquanto um traço
   * espremido não diz nem isso.
   */
  it('nome enorme empurra o traço até o piso do +N, e não além', () => {
    const espaco = traitSpace(600, 'x'.repeat(500), false);
    expect(espaco).toBeGreaterThan(0);
    expect(espaco).toBeLessThan(45);
  });

  /* E com nome curto o traço fica com tudo que sobra, sem teto artificial. */
  it('nome curto deixa mais que 60% da trilha para o traço', () => {
    expect(traitSpace(600, 'Trip', false)).toBeGreaterThan(600 * 0.6);
  });

  it('trilha estreita nunca devolve espaço negativo', () => {
    expect(traitSpace(10, 'Trip', true)).toBe(0);
  });
});

describe('rarityLetter', () => {
  it('comum não desenha nada', () => {
    expect(rarityLetter('common')).toBeNull();
    expect(rarityLetter('')).toBeNull();
    expect(rarityLetter('inventada')).toBeNull();
  });

  it('as três marcadas têm letra própria', () => {
    expect(rarityLetter('uncommon')).toBe('I');
    expect(rarityLetter('rare')).toBe('R');
    expect(rarityLetter('unique')).toBe('U');
  });

  it('isMarkedRarity concorda com rarityLetter', () => {
    expect(isMarkedRarity('rare')).toBe(true);
    expect(isMarkedRarity('common')).toBe(false);
  });
});

describe('columnWidth', () => {
  const muitos = (n: number, tamanho: number): string[] =>
    Array.from({ length: n }, () => 'x'.repeat(tamanho));

  it('o cabeçalho é piso: coluna não fica mais estreita que o próprio título', () => {
    // "Valorada" tem 8 letras: 8 × 7,48 + 14 = 73,84.
    expect(columnWidth(['a'], 8)).toBe(74);
  });

  /*
   * O caso que motivou o percentil: um valor gigante entre muitos curtos. `Paizo Blog:
   * Foolish Housekeeping and Other Articles` tem 52 caracteres contra uma mediana de 12,
   * e dimensionar pelo maior deixaria a coluna vazia por causa de uma entrada.
   */
  it('um valor gigante não estica a coluna inteira', () => {
    const valores = [...muitos(99, 10), 'x'.repeat(52)];
    const pelo90 = columnWidth(valores, 0);
    const peloMaior = 52 * 6.6 + 14 + 14;
    expect(pelo90).toBeLessThan(peloMaior / 2);
  });

  it('quando quase tudo é grande, a coluna acompanha', () => {
    expect(columnWidth(muitos(100, 30), 0)).toBeGreaterThan(columnWidth(muitos(100, 10), 0));
  });

  it('o percentil corta onde foi pedido', () => {
    // 80 valores de 5 e 20 de 40: o percentil 90 cai na faixa grande, o 50 não.
    const mistos = [...muitos(80, 5), ...muitos(20, 40)];
    expect(columnWidth(mistos, 0, 0.5)).toBeLessThan(columnWidth(mistos, 0, 0.9));
  });

  it('sem valor nenhum, sobra o cabeçalho', () => {
    expect(columnWidth([], 5)).toBe(Math.ceil(5 * 7.48 + 14));
  });
});
