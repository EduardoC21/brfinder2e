/**
 * A ESPECIFICAÇÃO de uma listagem, como dado.
 *
 * O objetivo é que acrescentar um tipo novo (talento, magia, equipamento) seja escrever um
 * descritor, não uma tela. Por isso coluna e filtro são declarados como dado aqui, e a
 * camada de UI tem um desenhista por `kind`.
 *
 * A regra da fronteira obriga isso de qualquer jeito — `core/` não pode importar React, e
 * portanto não pode devolver um componente. O que parecia limitação virou o seam certo:
 * o `core` diz O QUE mostrar, a UI diz COMO.
 *
 * Acrescentar uma coluna nova é um caso novo na união e um caso novo no desenhista. O
 * compilador cobra o segundo assim que você escreve o primeiro.
 */

export type Align = 'start' | 'end';

interface ColumnBase {
  /** `end` empurra para a direita. O grupo da condição vive na borda direita. */
  readonly align?: Align;
}

/**
 * As colunas que existem hoje. A lista é curta de propósito: `condition` é o tipo mais
 * pobre da base (sem nível, sem traço, sem raridade, sem custo em ações), e inventar
 * colunas para os outros tipos antes de ter o dado deles seria adivinhação.
 */
export type ColumnSpec =
  /** O nome da entrada. Sempre em inglês, como veio do pack (briefing 8.1). */
  | ({ readonly kind: 'name' } & ColumnBase)
  /** Um valor curto em forma de chip. Texto vazio ou nulo não desenha nada. */
  | ({ readonly kind: 'chip'; readonly field: string } & ColumnBase);

/**
 * Os filtros que existem hoje.
 *
 * `options` descobre os valores a partir do próprio dado — não há lista fixa em lugar
 * nenhum, então um grupo novo numa versão futura do Foundry aparece sozinho.
 */
export type FilterSpec =
  | { readonly kind: 'options'; readonly field: string }
  | { readonly kind: 'boolean'; readonly field: string };

/**
 * Os campos do cabeçalho do detalhe.
 *
 * Mesma ideia das colunas: dado, não componente, com um desenhista por espécie na UI.
 * `cost` e `frequency` são conceitos de Pathfinder, e é assim mesmo — o que queremos
 * genérico é "acrescentar um tipo é escrever um descritor", não uma UI sem domínio.
 */
export type DetailFieldSpec =
  | { readonly kind: 'text'; readonly field: string }
  | { readonly kind: 'boolean'; readonly field: string }
  | { readonly kind: 'chips'; readonly field: string }
  | { readonly kind: 'frequency'; readonly field: string }
  | { readonly kind: 'cost' }
  | { readonly kind: 'source' };

export interface SourceSpec {
  /** Identificador estável. É a chave do texto em `i18n` e da rota depois. */
  readonly id: string;
  /**
   * O tipo de entidade em `base/`. `null` enquanto não houver receita — a fonte aparece
   * no trilho, apagada, para a tela mostrar sua forma final desde já.
   */
  readonly entityType: string | null;
  /** `cards` é a Classe, que no mockup é outra tela. Nenhuma fonte `cards` hoje. */
  readonly mode: 'list' | 'cards';
  readonly columns: readonly ColumnSpec[];
  readonly filters: readonly FilterSpec[];
  /** Campos que a busca indexa, em ordem de peso — o primeiro pesa mais. */
  readonly searchFields: readonly string[];
  /** O cabeçalho do detalhe. A descrição vem sempre, e não se declara. */
  readonly detail: readonly DetailFieldSpec[];
}

/**
 * O catálogo do mockup "Forja PF2e — Consulta": onze fontes, mais `actions`, que a escada
 * do briefing traz na Etapa 6 e o mockup não listou.
 *
 * Os rótulos NÃO moram aqui — são texto de interface, e vivem em `i18n` (briefing 8.1).
 * Aqui fica só o que é estrutura.
 */
export const SOURCES: readonly SourceSpec[] = [
  {
    id: 'conditions',
    entityType: 'condition',
    mode: 'list',
    columns: [{ kind: 'name' }, { kind: 'chip', field: 'group', align: 'end' }],
    filters: [
      { kind: 'options', field: 'group' },
      { kind: 'boolean', field: 'valued' },
      { kind: 'options', field: 'source.title' },
    ],
    searchFields: ['name', 'summary'],
    detail: [
      { kind: 'text', field: 'summary' },
      { kind: 'text', field: 'group' },
      { kind: 'boolean', field: 'valued' },
      { kind: 'chips', field: 'overrides' },
      { kind: 'source' },
    ],
  },
  {
    id: 'actions',
    entityType: 'action',
    mode: 'list',
    // Mesmas duas espécies de coluna da condição: nenhum tipo novo foi preciso, o que era
    // o teste do descritor. A coluna de traços com orçamento de 26 caracteres é a Etapa 10.
    columns: [{ kind: 'name' }, { kind: 'chip', field: 'sector', align: 'end' }],
    filters: [
      { kind: 'options', field: 'sector' },
      { kind: 'options', field: 'costKind' },
      { kind: 'options', field: 'category' },
      { kind: 'options', field: 'source.title' },
    ],
    searchFields: ['name'],
    detail: [
      { kind: 'cost' },
      { kind: 'text', field: 'sector' },
      { kind: 'text', field: 'category' },
      { kind: 'chips', field: 'traits' },
      { kind: 'text', field: 'rarity' },
      { kind: 'frequency', field: 'frequency' },
      { kind: 'source' },
    ],
  },
  {
    id: 'feats',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'spells',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'equipment',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'ancestries',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'backgrounds',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'archetypes',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'classes',
    entityType: null,
    mode: 'cards',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'companions',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'familiars',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'skills',
    entityType: null,
    mode: 'list',
    columns: [],
    filters: [],
    searchFields: [],
    detail: [],
  },
];

export function findSource(id: string): SourceSpec | undefined {
  return SOURCES.find((source) => source.id === id);
}

/** A primeira fonte com receita pronta. É onde a tela abre. */
export function firstReadySource(): SourceSpec | undefined {
  return SOURCES.find((source) => source.entityType !== null);
}
