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

/** Como os valores marcados de um MESMO tópico se combinam. */
export type Combine = 'any' | 'all';

/**
 * Um TÓPICO de filtro.
 *
 * Tópico e não "filtro de campo": o `id` é a identidade, e o campo é detalhe de como o
 * tópico lê o dado. O custo em ações não tem campo único — lê `costKind` e `costCount`
 * juntos — e é justamente por isso que a identidade não pode ser o campo.
 *
 * As opções saem do próprio dado, sempre. Não há lista fixa em lugar nenhum, então um
 * traço novo numa versão futura do Foundry aparece sozinho.
 *
 * Um tópico novo é um caso novo nesta união mais um caso no desenhista da UI, e o
 * compilador cobra o segundo. Nenhuma das doze telas precisa mudar por causa dele.
 */
export type FilterSpec =
  /** Campo de valor único: grupo, categoria, livro. Vários marcados é OU. */
  | { readonly kind: 'options'; readonly id: string; readonly field: string }
  /** Campo de sim/não. */
  | { readonly kind: 'boolean'; readonly id: string; readonly field: string }
  /**
   * Campo que guarda uma LISTA — traços. Aqui o par E/OU faz diferença de verdade, e
   * `combine` é o padrão com que o tópico abre.
   */
  | {
      readonly kind: 'list';
      readonly id: string;
      readonly field: string;
      readonly combine: Combine;
    }
  /** O custo em ações, desenhado com os glifos: ◆ ◆◆ ◆◆◆ ◇ ↩ —. */
  | { readonly kind: 'cost'; readonly id: string };

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
      { kind: 'options', id: 'group', field: 'group' },
      { kind: 'boolean', id: 'valued', field: 'valued' },
      { kind: 'options', id: 'source', field: 'source.title' },
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
      { kind: 'cost', id: 'cost' },
      { kind: 'options', id: 'sector', field: 'sector' },
      { kind: 'options', id: 'category', field: 'category' },
      /*
       * Traços só aparecem agora porque só agora existe a espécie `list`. Antes um filtro
       * `options` sobre `traits` enxergava as 766 ações como "sem valor" — `fieldValue`
       * devolve string vazia para array.
       *
       * Abre em OU: quem clica em dois traços quase sempre quer "um ou outro". Quem quer
       * a interseção vira a chave, e aí "concentrate E manipulate" recorta de 250 para 20
       * (medido nas 766 ações do pf2e-8.5.0).
       */
      { kind: 'list', id: 'traits', field: 'traits', combine: 'any' },
      { kind: 'options', id: 'rarity', field: 'rarity' },
      { kind: 'options', id: 'source', field: 'source.title' },
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
