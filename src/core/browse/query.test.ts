import { describe, expect, it } from 'vitest';

import {
  applyFilters,
  costToken,
  fieldList,
  fieldValue,
  optionsFor,
  sortByName,
  type BrowseEntity,
} from './query';
import type { FilterSpec } from './spec';

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

/* Ações, para exercitar traços (lista) e custo (dois campos num token só). */
const acoes: BrowseEntity[] = [
  entity('t1', {
    name: 'Trip',
    traits: ['attack'],
    costKind: 'action',
    costCount: 1,
  }),
  entity('t2', {
    name: 'Cast a Spell',
    traits: ['concentrate', 'manipulate'],
    costKind: 'action',
    costCount: 2,
  }),
  entity('t3', {
    name: 'Ready',
    traits: ['concentrate'],
    costKind: 'action',
    costCount: 2,
  }),
  entity('t4', { name: 'Shield Block', traits: [], costKind: 'reaction', costCount: null }),
  entity('t5', { name: 'Treat Wounds', traits: ['manipulate'], costKind: 'passive' }),
];

const grupo: FilterSpec = { kind: 'options', id: 'group', field: 'group' };
const fonte: FilterSpec = { kind: 'options', id: 'source', field: 'source.title' };
const tracos: FilterSpec = { kind: 'list', id: 'traits', field: 'traits', combine: 'any' };
const custo: FilterSpec = { kind: 'cost', id: 'cost' };

describe('fieldList', () => {
  /* Era daqui que vinha o filtro de traços quebrado: fieldValue devolve '' para array. */
  it('lê o array que fieldValue não sabe ler', () => {
    expect(fieldList(acoes[1]!, 'traits')).toEqual(['concentrate', 'manipulate']);
    expect(fieldValue(acoes[1]!, 'traits')).toBe('');
  });

  it('campo ausente ou de outro tipo vira lista vazia', () => {
    expect(fieldList(acoes[0]!, 'inexistente')).toEqual([]);
    expect(fieldList(acoes[0]!, 'name')).toEqual([]);
  });
});

describe('costToken', () => {
  it('a contagem vira o token nas ações contadas', () => {
    expect(costToken(acoes[0]!)).toBe('1');
    expect(costToken(acoes[1]!)).toBe('2');
  });

  it('reação e passiva são o próprio tipo', () => {
    expect(costToken(acoes[3]!)).toBe('reaction');
    expect(costToken(acoes[4]!)).toBe('passive');
  });
});

describe('optionsFor', () => {
  it('descobre os valores do próprio dado, com contagem', () => {
    expect(optionsFor(conditions, grupo)).toEqual([
      { value: 'senses', count: 2 },
      { value: '', count: 2 },
    ]);
  });

  it('deixa "sem valor" por último e o resto em ordem alfabética', () => {
    expect(optionsFor(conditions, fonte).map((o) => o.value)).toEqual([
      'Player Core',
      'Player Core 2',
    ]);
  });

  it('numa lista, uma entrada conta em cada valor que ela tem', () => {
    // A soma passa do total de entradas, e está certo: a contagem responde
    // "quantas entradas têm este traço".
    expect(optionsFor(acoes, tracos)).toEqual([
      { value: 'attack', count: 1 },
      { value: 'concentrate', count: 2 },
      { value: 'manipulate', count: 2 },
    ]);
  });

  it('o custo aparece como token único', () => {
    expect(optionsFor(acoes, custo).map((o) => o.value)).toEqual(['1', '2', 'reaction', 'passive']);
  });

  /*
   * A ORDEM é a do jogo, e não a do alfabeto. Este teste guardava o contrário até agora:
   * alfabeticamente `passive` vem antes de `reaction`, e o traço aparecia no meio da lista
   * em vez de fechá-la. Só ficou visível em talentos, onde passiva são 3.977 de 6.284.
   */
  it('o custo segue ◆ ◆◆ ◆◆◆ ◇ ↩ —, e não o alfabeto', () => {
    const todos = [
      entity('c1', { costKind: 'passive', costCount: null }),
      entity('c2', { costKind: 'reaction', costCount: null }),
      entity('c3', { costKind: 'free', costCount: null }),
      entity('c4', { costKind: 'action', costCount: 3 }),
      entity('c5', { costKind: 'action', costCount: 1 }),
    ];
    expect(optionsFor(todos, custo).map((o) => o.value)).toEqual([
      '1',
      '3',
      'free',
      'reaction',
      'passive',
    ]);
  });
});

describe('applyFilters', () => {
  const specs: readonly FilterSpec[] = [grupo, { kind: 'boolean', id: 'valued', field: 'valued' }];

  it('sem seleção, devolve tudo', () => {
    expect(applyFilters(conditions, specs, {})).toHaveLength(4);
    expect(applyFilters(conditions, specs, { group: { values: [] } })).toHaveLength(4);
  });

  it('valores do mesmo tópico somam como OU', () => {
    expect(applyFilters(conditions, specs, { group: { values: ['senses', ''] } })).toHaveLength(4);
  });

  it('tópicos diferentes somam como E', () => {
    const r = applyFilters(conditions, specs, {
      group: { values: [''] },
      valued: { values: ['true'] },
    });
    expect(r.map((e) => e.key)).toEqual(['c']);
  });

  it('filtrar por "sem grupo" funciona', () => {
    expect(applyFilters(conditions, specs, { group: { values: [''] } }).map((e) => e.key)).toEqual([
      'b',
      'c',
    ]);
  });

  /*
   * O par E/OU só faz diferença aqui, e a diferença é grande: medido na tela, nas 766
   * ações do pf2e-8.5.0, "concentrate OU manipulate" dá 250 e o E dá 20.
   */
  it('numa lista, OU pega quem tem qualquer um dos marcados', () => {
    const r = applyFilters(acoes, [tracos], {
      traits: { values: ['concentrate', 'manipulate'], combine: 'any' },
    });
    expect(r.map((e) => e.key)).toEqual(['t2', 't3', 't5']);
  });

  it('numa lista, E exige TODOS os marcados', () => {
    const r = applyFilters(acoes, [tracos], {
      traits: { values: ['concentrate', 'manipulate'], combine: 'all' },
    });
    expect(r.map((e) => e.key)).toEqual(['t2']);
  });

  it('sem escolha do usuário, vale o padrão declarado no descritor', () => {
    const comAnd: FilterSpec = { ...tracos, combine: 'all' };
    const r = applyFilters(acoes, [comAnd], {
      traits: { values: ['concentrate', 'manipulate'] },
    });
    expect(r.map((e) => e.key)).toEqual(['t2']);
  });

  it('o custo filtra pelo token, juntando os dois campos', () => {
    const r = applyFilters(acoes, [custo], { cost: { values: ['2', 'reaction'] } });
    expect(r.map((e) => e.key)).toEqual(['t2', 't3', 't4']);
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
