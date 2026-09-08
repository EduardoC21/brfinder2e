import { describe, expect, it } from 'vitest';

import {
  applyFilters,
  facetBase,
  topicMatters,
  castRank,
  castToken,
  costToken,
  defenseTokens,
  fieldList,
  fieldValue,
  numericExtent,
  optionsFor,
  readBounds,
  sortByName,
  writeBound,
  type BrowseEntity,
} from './query';
import type { DefenseFields, FilterSpec } from './spec';

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

/* ── Magias: o custo de conjurar, a defesa e as faixas numéricas ── */

const magia = (key: string, cast: string, extra: Record<string, unknown> = {}): BrowseEntity =>
  entity(key, { name: key, cast: { from: {}, to: null, raw: cast }, ...extra });

describe('castToken', () => {
  it('é o texto CRU, em caixa baixa — nada de agrupar', () => {
    expect(castToken(magia('a', '2'), 'cast')).toBe('2');
    expect(castToken(magia('b', '10 minutes'), 'cast')).toBe('10 minutes');
    expect(castToken(magia('c', '1 to 3'), 'cast')).toBe('1 to 3');
  });

  /** `Reaction` com R maiúsculo existe em UMA magia, contra 95 em minúscula. */
  it('junta a maiúscula solta da fonte com as outras', () => {
    expect(castToken(magia('d', 'Reaction'), 'cast')).toBe('reaction');
  });

  it('sem o campo, token vazio', () => {
    expect(castToken(entity('x', { name: 'x' }), 'cast')).toBe('');
  });
});

describe('castRank', () => {
  it('ações contadas primeiro, na ordem', () => {
    expect(castRank('1')).toBeLessThan(castRank('2'));
    expect(castRank('2')).toBeLessThan(castRank('3'));
  });

  it('as faixas de ações vêm DEPOIS das contagens simples', () => {
    expect(castRank('3')).toBeLessThan(castRank('1 to 2'));
    expect(castRank('1 to 2')).toBeLessThan(castRank('1 to 3'));
    expect(castRank('1 to 3')).toBeLessThan(castRank('2 or 3'));
  });

  it('livre e reação fecham o grupo do turno', () => {
    expect(castRank('2 or 3')).toBeLessThan(castRank('free'));
    expect(castRank('free')).toBeLessThan(castRank('reaction'));
  });

  it('o que leva tempo vem por último, ordenado pela DURAÇÃO', () => {
    expect(castRank('reaction')).toBeLessThan(castRank('2 to 2 rounds'));
    expect(castRank('2 to 2 rounds')).toBeLessThan(castRank('1 minute'));
    expect(castRank('1 minute')).toBeLessThan(castRank('10 minutes'));
    expect(castRank('10 minutes')).toBeLessThan(castRank('1 hour'));
    expect(castRank('8 hours')).toBeLessThan(castRank('1 day'));
    expect(castRank('1 day')).toBeLessThan(castRank('1 week'));
  });

  /** `1 week` e `7 days` são a mesma duração: quem desempata é o texto, no `ordenar`. */
  it('mede a duração de verdade, e não a unidade escrita', () => {
    expect(castRank('7 days')).toBe(castRank('1 week'));
  });
});

const DEFESA: DefenseFields = {
  field: 'save',
  passiveField: 'passiveDefense',
  traitsField: 'traits',
  attackTrait: 'attack',
};

const comDefesa = (
  key: string,
  save: unknown,
  passiva: string,
  traits: readonly string[] = [],
): BrowseEntity => entity(key, { name: key, save, passiveDefense: passiva, traits });

describe('defenseTokens', () => {
  it('o salvamento, quando é só ele', () => {
    expect(defenseTokens(comDefesa('a', { statistic: 'will', basic: false }, ''), DEFESA)).toEqual([
      'will',
    ]);
  });

  /*
   * A regra que faltava: em 82 magias a CA existe SÓ no traço. Phase Bolt tem
   * `defense: null` e o texto diz "spell attack roll against your target's AC".
   */
  it('o traço `attack` sozinho já diz CA', () => {
    expect(defenseTokens(comDefesa('b', null, '', ['attack', 'cantrip']), DEFESA)).toEqual(['ac']);
  });

  /** Pulverizing Wake, no AoN: "Defense AC and basic Fortitude". Ataca E pede salvamento. */
  it('ataque e salvamento SOMAM, não se excluem', () => {
    expect(
      defenseTokens(
        comDefesa('c', { statistic: 'fortitude', basic: true }, '', ['attack']),
        DEFESA,
      ),
    ).toEqual(['ac', 'fortitude']);
  });

  /** Murderous Vine ataca a CD de Fortitude, e o AoN escreve "Defesa Fortitude". */
  it('a CD passiva SUBSTITUI a CA, e dobra no salvamento de mesmo nome', () => {
    expect(defenseTokens(comDefesa('d', null, 'fortitude-dc', ['attack']), DEFESA)).toEqual([
      'fortitude',
    ]);
    expect(defenseTokens(comDefesa('e', null, 'reflex-dc', ['attack']), DEFESA)).toEqual([
      'reflex',
    ]);
  });

  it('a CA declarada não vira duas vezes a mesma coisa', () => {
    expect(defenseTokens(comDefesa('f', null, 'ac', ['attack']), DEFESA)).toEqual(['ac']);
  });

  it('sem nada disso, lista vazia', () => {
    expect(defenseTokens(comDefesa('g', null, '', ['concentrate']), DEFESA)).toEqual([]);
  });
});

describe('o filtro de defesa', () => {
  const spec: FilterSpec = { kind: 'defense', id: 'save', ...DEFESA };
  const magias = [
    comDefesa('ataque', null, '', ['attack']),
    comDefesa('vontade', { statistic: 'will', basic: false }, '', []),
    comDefesa('ambos', { statistic: 'fortitude', basic: true }, '', ['attack']),
    comDefesa('nenhuma', null, '', []),
  ];

  it('conta a que tem duas defesas NAS DUAS opções', () => {
    expect(optionsFor(magias, spec)).toEqual([
      { value: 'ac', count: 2 },
      { value: 'fortitude', count: 1 },
      { value: 'will', count: 1 },
      { value: '', count: 1 },
    ]);
  });

  it('marcar CA acha a que só ataca e a que ataca e pede salvamento', () => {
    const recorte = applyFilters(magias, [spec], { save: { values: ['ac'] } });
    expect(recorte.map((e) => e.key)).toEqual(['ataque', 'ambos']);
  });

  it('"sem valor" acha quem não tem defesa nenhuma', () => {
    const recorte = applyFilters(magias, [spec], { save: { values: [''] } });
    expect(recorte.map((e) => e.key)).toEqual(['nenhuma']);
  });
});

describe('os limites numéricos', () => {
  it('lê `min:` e `max:` de dentro dos valores marcados', () => {
    expect(readBounds(['burst', 'min:10', 'max:60'])).toEqual({ min: 10, max: 60 });
    expect(readBounds(['burst'])).toEqual({ min: null, max: null });
  });

  it('escrever um limite não mexe no outro nem nas opções marcadas', () => {
    expect(writeBound(['burst', 'min:10'], 'max', 60)).toEqual(['burst', 'min:10', 'max:60']);
    expect(writeBound(['burst', 'min:10'], 'min', null)).toEqual(['burst']);
  });
});

const alcance = (key: string, range: string): BrowseEntity => entity(key, { name: key, range });

const distancia: FilterSpec = { kind: 'number', id: 'range', field: 'range', unit: 'feet' };

describe('o filtro de FAIXA numérica', () => {
  const magias = [
    alcance('toque', 'touch'),
    alcance('curto', '30 feet'),
    alcance('longo', '120 feet'),
    alcance('milha', '1 mile'),
    alcance('vago', 'planetary'),
  ];

  it('não oferece opção nenhuma: o que ele tem são dois campos', () => {
    expect(optionsFor(magias, distancia)).toEqual([]);
  });

  it('recorta pelo piso e pelo teto, em pés', () => {
    const recorte = applyFilters(magias, [distancia], {
      range: { values: ['min:30', 'max:120'] },
    });
    expect(recorte.map((e) => e.key)).toEqual(['curto', 'longo']);
  });

  /** Não dá para afirmar que `planetary` passa de 30 pés — então ele fica de fora. */
  it('quem não tem número sai quando há limite marcado', () => {
    const recorte = applyFilters(magias, [distancia], { range: { values: ['min:0'] } });
    expect(recorte.map((e) => e.key)).not.toContain('vago');
    expect(recorte.map((e) => e.key)).toContain('toque');
  });

  it('a dica mostra o que EXISTE no dado', () => {
    expect(numericExtent(magias, distancia)).toEqual({ min: 0, max: 5280 });
  });
});

const comArea = (key: string, type: string | null, value: number | null): BrowseEntity =>
  entity(key, { name: key, area: type === null ? null : { type, value, details: null } });

const areaSpec: FilterSpec = { kind: 'area', id: 'area', field: 'area', unit: 'feet' };

describe('o filtro de ÁREA, que junta tipo e tamanho', () => {
  const magias = [
    comArea('explosao10', 'burst', 10),
    comArea('explosao30', 'burst', 30),
    comArea('cone15', 'cone', 15),
    comArea('sem', null, null),
  ];

  it('as opções são os TIPOS', () => {
    expect(optionsFor(magias, areaSpec).map((o) => o.value)).toEqual(['burst', 'cone', '']);
  });

  it('tipo e tamanho se SOMAM: explosões de até 20', () => {
    const recorte = applyFilters(magias, [areaSpec], {
      area: { values: ['burst', 'max:20'] },
    });
    expect(recorte.map((e) => e.key)).toEqual(['explosao10']);
  });

  it('só o tipo, sem limite, não exige tamanho nenhum', () => {
    const recorte = applyFilters(magias, [areaSpec], { area: { values: ['cone'] } });
    expect(recorte.map((e) => e.key)).toEqual(['cone15']);
  });
});

/*
 * ⚠️ A CONTAGEM ENGANOSA, e o conserto dela.
 *
 * Com "arma" e "uma mão" marcados, a opção "marcial" mostrava o total de marciais da base,
 * mas clicar nela devolvia só as marciais de uma mão. O número respondia uma pergunta que
 * ninguém tinha feito.
 */
const itens: BrowseEntity[] = [
  entity('i1', { name: 'Longsword', kind: 'weapon', category: 'martial', hands: '1' }),
  entity('i2', { name: 'Greataxe', kind: 'weapon', category: 'martial', hands: '2' }),
  entity('i3', { name: 'Club', kind: 'weapon', category: 'simple', hands: '1' }),
  entity('i4', { name: 'Potion', kind: 'consumable', category: 'potion', hands: '1' }),
];

const tipo: FilterSpec = { kind: 'options', id: 'kind', field: 'kind' };
const categoria: FilterSpec = { kind: 'options', id: 'category', field: 'category' };
const maos: FilterSpec = { kind: 'options', id: 'hands', field: 'hands' };
const todos = [tipo, categoria, maos];

describe('facetBase — a base de UM tópico', () => {
  it('aplica os outros tópicos, e não o próprio', () => {
    const estado = { kind: { values: ['weapon'] }, hands: { values: ['1'] } };
    const base = facetBase(itens, todos, estado, categoria);
    // Arma E uma mão: sobram a espada marcial e a clava simples.
    expect(base.map((item) => fieldValue(item, 'name'))).toEqual(['Longsword', 'Club']);
    // E é sobre ESSAS duas que a contagem de "marcial" é feita: 1, e não 2.
    expect(optionsFor(base, categoria)).toEqual([
      { value: 'martial', count: 1 },
      { value: 'simple', count: 1 },
    ]);
  });

  /*
   * O próprio tópico fica DE FORA para que a contagem responda "quantas sobram se ESTA for
   * a marcada aqui". Mantendo a seleção, marcar uma segunda opção faria todos os números
   * crescerem, e a lista deixaria de ser comparável consigo mesma.
   */
  it('o que já está marcado no tópico não estreita a própria contagem', () => {
    const estado = { category: { values: ['martial'] } };
    const base = facetBase(itens, todos, estado, categoria);
    expect(base).toHaveLength(4);
  });

  /* No modo E dos traços, marcar mais RESTRINGE — e aí a seleção fica. */
  it('no modo E, a seleção do próprio tópico continua valendo', () => {
    const tracos: FilterSpec = { kind: 'list', id: 'traits', field: 'traits', combine: 'all' };
    const comTracos: BrowseEntity[] = [
      entity('x', { traits: ['concentrate', 'manipulate'] }),
      entity('y', { traits: ['concentrate'] }),
      entity('z', { traits: ['manipulate'] }),
    ];
    const estado = { traits: { values: ['concentrate'], combine: 'all' as const } };
    const base = facetBase(comTracos, [tracos], estado, tracos);
    expect(base).toHaveLength(2);
    // "manipulate" mostra 1: é o que sobra ao SOMAR o traço, que é o que o modo E faz.
    expect(optionsFor(base, tracos)).toContainEqual({ value: 'manipulate', count: 1 });
  });
});

describe('topicMatters — o tópico ainda pode mudar alguma coisa?', () => {
  it('não, quando todas respondem igual', () => {
    const so = itens.filter((item) => fieldValue(item, 'kind') === 'consumable');
    expect(topicMatters(so, categoria)).toBe(false);
  });

  it('sim, quando há mais de uma resposta', () => {
    const armas = itens.filter((item) => fieldValue(item, 'kind') === 'weapon');
    expect(topicMatters(armas, categoria)).toBe(true);
  });

  it('não, quando não há resposta nenhuma', () => {
    expect(topicMatters(itens, { kind: 'options', id: 'x', field: 'inexistente' })).toBe(false);
  });

  /* Faixa numérica não tem opção: o que ela precisa é de pelo menos um número. */
  it('a faixa depende de haver número no recorte', () => {
    const faixa: FilterSpec = { kind: 'number', id: 'price', field: 'price', unit: 'copper' };
    expect(topicMatters(itens, faixa)).toBe(false);
    expect(topicMatters([entity('p', { price: 100 })], faixa)).toBe(true);
  });
});
