import { describe, expect, it } from 'vitest';

import { applyFilters, fieldValue, optionsFor, sortByName, type BrowseEntity } from './query';

const entity = (key: string, base: unknown): BrowseEntity => ({ key, uuid: key, base });

const conditions: BrowseEntity[] = [
  entity('a', {
    name: 'Blinded',
    group: 'senses',
    valued: false,
    source: { title: 'Player Core' },
  }),
  entity('b', { name: 'Prone', group: null, valued: false, source: { title: 'Player Core' } }),
  entity('c', { name: 'Frightened', group: null, valued: true, source: { title: 'Player Core' } }),
  entity('d', {
    name: 'Dazzled',
    group: 'senses',
    valued: false,
    source: { title: 'Player Core 2' },
  }),
];

describe('fieldValue', () => {
  it('lê caminho aninhado', () => {
    expect(fieldValue(conditions[0]!, 'source.title')).toBe('Player Core');
  });

  it('booleano vira texto, para o filtro tratar tudo igual', () => {
    expect(fieldValue(conditions[2]!, 'valued')).toBe('true');
    expect(fieldValue(conditions[0]!, 'valued')).toBe('false');
  });

  /** 20 das 43 condições têm grupo nulo: "sem grupo" é opção de filtro, não buraco. */
  it('nulo e ausente viram a string vazia', () => {
    expect(fieldValue(conditions[1]!, 'group')).toBe('');
    expect(fieldValue(conditions[1]!, 'inexistente')).toBe('');
  });
});

describe('optionsFor', () => {
  it('descobre os valores do próprio dado, com contagem', () => {
    expect(optionsFor(conditions, 'group')).toEqual([
      { value: 'senses', count: 2 },
      { value: '', count: 2 },
    ]);
  });

  it('deixa "sem valor" por último e o resto em ordem alfabética', () => {
    const opcoes = optionsFor(conditions, 'source.title');
    expect(opcoes.map((o) => o.value)).toEqual(['Player Core', 'Player Core 2']);
  });
});

describe('applyFilters', () => {
  const specs = [
    { kind: 'options', field: 'group' },
    { kind: 'boolean', field: 'valued' },
  ] as const;

  it('sem seleção, devolve tudo', () => {
    expect(applyFilters(conditions, specs, {})).toHaveLength(4);
    expect(applyFilters(conditions, specs, { group: [] })).toHaveLength(4);
  });

  it('valores do mesmo campo somam como OU', () => {
    const r = applyFilters(conditions, specs, { group: ['senses', ''] });
    expect(r).toHaveLength(4);
  });

  it('campos diferentes somam como E', () => {
    const r = applyFilters(conditions, specs, { group: [''], valued: ['true'] });
    expect(r.map((e) => e.key)).toEqual(['c']);
  });

  it('filtrar por "sem grupo" funciona', () => {
    expect(applyFilters(conditions, specs, { group: [''] }).map((e) => e.key)).toEqual(['b', 'c']);
  });
});

describe('sortByName', () => {
  it('ordena sem mexer no array original', () => {
    expect(sortByName(conditions).map((e) => fieldValue(e, 'name'))).toEqual([
      'Blinded',
      'Dazzled',
      'Frightened',
      'Prone',
    ]);
    expect(conditions[0]?.key).toBe('a');
  });

  it('ignora acento e caixa', () => {
    const acentuadas = [entity('x', { name: 'Ébrio' }), entity('y', { name: 'Eco' })];
    expect(sortByName(acentuadas).map((e) => fieldValue(e, 'name'))).toEqual(['Ébrio', 'Eco']);
  });
});
