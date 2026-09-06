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
  /**
   * Identidade da coluna, e é o que fica gravado na preferência do usuário.
   *
   * Separada do campo porque a preferência sobrevive a mudanças no descritor: se amanhã a
   * coluna `setor` passar a ler outro caminho, quem já a tinha escolhida continua com ela.
   */
  readonly id: string;
  /** `end` empurra para a direita. O grupo da condição vive na borda direita. */
  readonly align?: Align;
}

/**
 * As colunas que existem hoje. A lista é curta de propósito: `condition` é o tipo mais
 * pobre da base (sem nível, sem traço, sem raridade, sem custo em ações), e inventar
 * colunas para os outros tipos antes de ter o dado deles seria adivinhação.
 *
 * O NOME não está aqui: ele é sempre a primeira coluna, sempre visível, e não se escolhe.
 * Uma linha de resultado sem nome não identifica nada.
 */
export type ColumnSpec =
  /** Um valor curto em forma de chip. Texto vazio ou nulo não desenha nada. */
  | ({ readonly kind: 'chip'; readonly field: string } & ColumnBase)
  /** O custo em ações, com os glifos — o mesmo componente do detalhe e do filtro. */
  | ({ readonly kind: 'cost' } & ColumnBase)
  /**
   * Sim/não. Desenha ✓ quando verdadeiro e NADA quando falso.
   *
   * Espécie própria, e não um `text` que farejasse a string "true": farejando, qualquer
   * campo de texto que por acaso valesse "true" viraria um check. A espécie declara a
   * intenção no descritor, e espelha o `boolean` que o detalhe já tinha.
   */
  | ({ readonly kind: 'boolean'; readonly field: string } & ColumnBase)
  /** A frequência de uso, pelo mesmo desenhista do detalhe: "1× por dia". */
  | ({ readonly kind: 'frequency'; readonly field: string } & ColumnBase)
  /** Texto simples, sem moldura de chip. Para valores mais longos que um rótulo. */
  | ({ readonly kind: 'text'; readonly field: string } & ColumnBase);

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

/**
 * As colunas ESPECIAIS de uma fonte, quando ela tem o dado.
 *
 * Separadas de `columns` porque não disputam o mesmo espaço: elas pertencem ao nome —
 * nível antes, raridade colada, traços logo depois — e por isso ficam FORA do teto de
 * colunas personalizadas. Vêm ligadas por padrão, e podem ser desligadas.
 *
 * `null` significa "esta fonte não tem esse dado", e aí a opção nem aparece no seletor.
 * Condição não tem nível, raridade nem traço; ação tem raridade e traço, mas não nível.
 */
export interface SpecialColumns {
  /** Campo numérico do nível. Vira uma calha antes do nome. */
  readonly level: string | null;
  /** Campo da raridade. Só o não-comum desenha. */
  readonly rarity: string | null;
  /** Campo de lista com os traços. */
  readonly traits: string | null;
}

export const NO_SPECIAL_COLUMNS: SpecialColumns = { level: null, rarity: null, traits: null };

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
  /**
   * TODAS as colunas que esta fonte sabe oferecer, na ordem canônica do seletor.
   *
   * Não é o que aparece na tela: o que aparece é `defaultColumns`, ou o que o usuário
   * escolheu. Separar as duas coisas é o que permite oferecer uma coluna nova sem
   * empurrá-la para quem já configurou as dele.
   */
  readonly columns: readonly ColumnSpec[];
  /**
   * Ids visíveis quando o usuário nunca mexeu.
   *
   * VAZIO em todas as fontes, de propósito: o padrão é a lista limpa, com nome e os dados
   * fixos que a fonte tiver. Coluna é escolha, não herança — quem quer `setor` marca.
   */
  readonly defaultColumns: readonly string[];
  /** Nível, raridade e traços — fora do teto, ligadas por padrão. */
  readonly special: SpecialColumns;
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
    columns: [
      { kind: 'chip', id: 'group', field: 'group', align: 'end' },
      { kind: 'text', id: 'valued', field: 'valued' },
      { kind: 'text', id: 'source', field: 'source.title' },
    ],
    defaultColumns: [],
    // Condição não tem nível, raridade nem traço: o dado simplesmente não existe.
    special: NO_SPECIAL_COLUMNS,
    filters: [
      { kind: 'options', id: 'group', field: 'group' },
      { kind: 'boolean', id: 'valued', field: 'valued' },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    searchFields: ['name', 'summary'],
    /*
     * A ordem é do autor, e é a ordem de LEITURA de uma condição: o que ela é, se leva
     * número, o que ela anula, e de onde veio.
     *
     * `summary` saiu: ele repete na íntegra a primeira frase da descrição, que está logo
     * abaixo.
     */
    detail: [
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
    /*
     * Sete colunas oferecidas, uma visível por padrão. O resto é escolha do usuário, e a
     * escolha dele fica gravada por fonte.
     *
     * A coluna de traços com orçamento de 26 caracteres continua sendo a Etapa 10: ela
     * precisa de uma espécie própria que corte a lista, e não de mais um `chip`.
     */
    columns: [
      { kind: 'cost', id: 'cost' },
      { kind: 'chip', id: 'sector', field: 'sector', align: 'end' },
      { kind: 'text', id: 'category', field: 'category' },
      { kind: 'text', id: 'source', field: 'source.title' },
    ],
    defaultColumns: [],
    /*
     * Ação não tem nível — isso é de talento e de magia. Raridade e traço tem, e os dois
     * saem da coluna comum: `traits` deixa de ser oferecido como `chip` porque agora é
     * especial, com orçamento de caracteres.
     */
    special: { level: null, rarity: 'rarity', traits: 'traits' },
    filters: [
      { kind: 'options', id: 'rarity', field: 'rarity' },
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
      { kind: 'cost', id: 'cost' },
      { kind: 'options', id: 'category', field: 'category' },
      { kind: 'options', id: 'sector', field: 'sector' },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    searchFields: ['name'],
    /*
     * A ordem é do autor, e segue a da ficha do jogo: o que a ação É (traços), quanto
     * custa, com que frequência, e só então de onde ela vem.
     *
     * Raridade NÃO é campo: vira etiqueta ao lado do nome, como na lista.
     */
    detail: [
      { kind: 'chips', field: 'traits' },
      { kind: 'cost' },
      { kind: 'text', field: 'sector' },
      { kind: 'text', field: 'category' },
      { kind: 'source' },
    ],
  },
  {
    id: 'feats',
    entityType: 'feat',
    mode: 'list',
    columns: [
      { kind: 'cost', id: 'cost' },
      { kind: 'chip', id: 'sector', field: 'sector', align: 'end' },
      { kind: 'frequency', id: 'frequency', field: 'frequency' },
      { kind: 'boolean', id: 'onlyLevel1', field: 'onlyLevel1' },
      { kind: 'text', id: 'source', field: 'source.title' },
    ],
    defaultColumns: [],
    /* A primeira fonte com NÍVEL: a calha existe desde a Etapa 8 sem dado que a usasse. */
    special: { level: 'level', rarity: 'rarity', traits: 'traits' },
    filters: [
      { kind: 'options', id: 'level', field: 'level' },
      { kind: 'options', id: 'rarity', field: 'rarity' },
      { kind: 'list', id: 'traits', field: 'traits', combine: 'any' },
      { kind: 'cost', id: 'cost' },
      { kind: 'options', id: 'sector', field: 'sector' },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    searchFields: ['name'],
    /*
     * Ordem do autor. Fora daqui ficam `prerequisites`, `maxTakable`, `onlyLevel1` e
     * `frequency`: os quatro já vêm escritos na descrição logo abaixo, e repeti-los no
     * cabeçalho gastaria linha para dizer duas vezes a mesma coisa. `frequency` e
     * `onlyLevel1` seguem disponíveis como COLUNA, onde não há descrição para consultar.
     *
     * Raridade não é campo: vira etiqueta ao lado do nome, como em ações.
     */
    detail: [
      { kind: 'text', field: 'level' },
      { kind: 'chips', field: 'traits' },
      { kind: 'cost' },
      { kind: 'text', field: 'sector' },
      { kind: 'source' },
    ],
  },
  {
    id: 'spells',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'equipment',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'ancestries',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'backgrounds',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'archetypes',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'classes',
    entityType: null,
    mode: 'cards',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'companions',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'familiars',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    searchFields: [],
    detail: [],
  },
  {
    id: 'skills',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
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
