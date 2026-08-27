import { describe, expect, it } from 'vitest';

import { parseMarkup, roundTrips } from './parse';
import type { Token } from './types';

const kinds = (text: string): string[] => parseMarkup(text).map((token) => token.kind);
const only = (text: string): Token => {
  const tokens = parseMarkup(text);
  expect(tokens).toHaveLength(1);
  return tokens[0]!;
};

describe('o invariante de ida e volta', () => {
  /**
   * É o critério da Etapa 7 e o que sustenta a camada inteira: enquanto ele valer, o texto
   * original pode ser reconstruído a partir dos tokens, byte a byte.
   */
  const casos = [
    '',
    'texto puro sem marcação',
    '<p>HTML <strong>com</strong> tags</p>',
    '@UUID[Compendium.pf2e.conditionitems.Item.TkIya]{Dazzled}',
    '@Damage[2d6[fire]]',
    '[[/r 2d6[fire]]]',
    'antes @Check[will|dc:20] meio [[/act trip]] depois',
    'um @ solto',
    'um [ sem fecha',
    '@UUID[sem fecha',
    '[[/r sem fecha',
    '@Desconhecido[algo]{rótulo}',
    '@Damage[(4d6+@actor.abilities.str.mod)[bludgeoning]|options:area-damage]',
    '@UUID[a]{b}@UUID[c]{d}',
    'chaves } soltas { no meio',
  ];

  for (const caso of casos) {
    it(`vale para ${JSON.stringify(caso.slice(0, 48))}`, () => {
      expect(roundTrips(caso)).toBe(true);
    });
  }
});

describe('@UUID', () => {
  it('separa alvo e rótulo', () => {
    const token = only('@UUID[Compendium.pf2e.conditionitems.Item.TkIya]{Dazzled}');
    expect(token).toMatchObject({
      kind: 'uuid',
      target: 'Compendium.pf2e.conditionitems.Item.TkIya',
      label: 'Dazzled',
    });
  });

  it('sem rótulo, o campo fica nulo', () => {
    expect(only('@UUID[Compendium.pf2e.x.Item.Y]')).toMatchObject({ kind: 'uuid', label: null });
  });
});

describe('colchete aninhado — a armadilha do briefing 7.6', () => {
  /**
   * Uma expressão regular ingênua (`\[[^\]]*\]`) pararia no primeiro `]` e devolveria
   * `@Damage[2d6[fire]` — token cortado no meio, e o resto virando texto. O texto
   * continuaria aparecendo na tela, então ninguém perceberia.
   */
  it('@Damage com tipo de dano dentro', () => {
    expect(only('@Damage[2d6[fire]]')).toMatchObject({ kind: 'damage', body: '2d6[fire]' });
  });

  it('rolagem com tipo de dano dentro', () => {
    expect(only('[[/r 2d6[fire]]]')).toMatchObject({
      kind: 'roll',
      command: 'r',
      body: ' 2d6[fire]',
    });
  });

  it('caso real, com fórmula e parâmetros', () => {
    const real = '@Damage[(4d6+@actor.abilities.str.mod)[bludgeoning]|options:area-damage]';
    expect(only(real)).toMatchObject({
      kind: 'damage',
      body: '(4d6+@actor.abilities.str.mod)[bludgeoning]|options:area-damage',
    });
  });

  it('dois níveis de aninhamento', () => {
    expect(only('@Damage[a[b[c]d]e]')).toMatchObject({ body: 'a[b[c]d]e' });
  });
});

describe('rolagens', () => {
  it('reconhece os quatro comandos', () => {
    expect(kinds('[[/r 1d20]] [[/act trip]] [[/gmr 1d4]] [[/br 1d6]]')).toEqual([
      'roll',
      'text',
      'roll',
      'text',
      'roll',
      'text',
      'roll',
    ]);
  });

  it('lê o rótulo depois do fecha duplo', () => {
    expect(only('[[/act trip]]{Derrubar}')).toMatchObject({
      kind: 'roll',
      command: 'act',
      label: 'Derrubar',
    });
  });
});

describe('o desconhecido não se perde', () => {
  /**
   * Briefing 7.6: token desconhecido cai como texto cru — melhor feio na tela que perdido.
   * Aqui ele ganha um tipo próprio, que desenha igual e ainda permite CONTAR: uma sintaxe
   * nova numa versão futura do Foundry aparece no relatório em vez de se esconder.
   */
  it('@Nome desconhecido vira token unknown, com o raw inteiro', () => {
    const token = only('@Inventado[algo]{rótulo}');
    expect(token).toMatchObject({ kind: 'unknown', opener: '@Inventado' });
    expect(token.raw).toBe('@Inventado[algo]{rótulo}');
  });

  it('comando de rolagem desconhecido também', () => {
    expect(only('[[/xyz 1d4]]')).toMatchObject({ kind: 'unknown', opener: '[[/xyz' });
  });

  it('marcação sem fecha vira texto, e não some', () => {
    expect(kinds('@UUID[nunca fecha')).toEqual(['text']);
    expect(roundTrips('@UUID[nunca fecha')).toBe(true);
  });
});

describe('texto ao redor', () => {
  it('preserva o que vem antes e depois', () => {
    const tokens = parseMarkup('<p>Anula @UUID[x]{Dazzled}.</p>');
    expect(tokens.map((token) => token.kind)).toEqual(['text', 'uuid', 'text']);
    expect(tokens[0]?.raw).toBe('<p>Anula ');
    expect(tokens[2]?.raw).toBe('.</p>');
  });

  it('tokens colados não geram texto vazio entre eles', () => {
    expect(kinds('@UUID[a]{b}@UUID[c]{d}')).toEqual(['uuid', 'uuid']);
  });
});
