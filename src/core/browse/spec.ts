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

/**
 * De onde a DEFESA de uma magia é lida — quatro campos, porque a fonte a espalha em quatro.
 *
 * Espalhado nos três lugares que desenham defesa (coluna, filtro e detalhe) com `...`, para
 * a definição ser UMA. Ver `defenseTokens` em `query.ts` para o modelo, e a nota no
 * descritor de magias para as quatro entradas em que a fonte erra o traço.
 */
export interface DefenseFields {
  /** O salvamento: `{statistic, basic}`. */
  readonly field: string;
  /** A defesa passiva contra a qual o ataque rola: `ac`, `fortitude-dc`, `reflex-dc`. */
  readonly passiveField: string;
  /** A lista de traços, onde mora o sinal de que a magia ATACA. */
  readonly traitsField: string;
  /** O traço que diz "esta magia rola ataque": `attack`. */
  readonly attackTrait: string;
}

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
  /**
   * A que Tipos esta coluna se aplica. Ausente: a TODOS.
   *
   * É o que impede as vinte e duas colunas de equipamento de aparecerem juntas. Ver
   * `browse/scope.ts` para a regra — universal ∪ interseção dos Tipos marcados.
   */
  readonly kinds?: readonly string[];
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
  /** Uma LISTA de valores curtos, cada um em sua caixinha. Tradições, por exemplo. */
  | ({ readonly kind: 'chips'; readonly field: string } & ColumnBase)
  /**
   * O custo de CONJURAR, que não é o custo em ações das outras fontes: pode ser uma faixa
   * (`◆ a ◆◆◆`) ou um tempo (`10 minutos`). Ver `normalization/cast.ts`.
   */
  | ({ readonly kind: 'cast'; readonly field: string } & ColumnBase)
  /** A área: `Explosão 6 m`. Lê `{type, value, details}`. */
  | ({ readonly kind: 'area'; readonly field: string } & ColumnBase)
  /**
   * A defesa contra a magia, na linha do livro: "CA", "Vontade básico", "CA e Fortitude
   * básico". Ver `defenseTokens` — são quatro campos, e uma magia pode ter DUAS defesas.
   */
  | ({ readonly kind: 'defense' } & DefenseFields & ColumnBase)
  /** A duração do efeito, com "sustentada" junto quando for o caso. */
  | ({ readonly kind: 'duration'; readonly field: string } & ColumnBase)
  /**
   * Um PREÇO em peças de cobre, desenhado na moeda maior que couber: `1 po`, `5 pp`.
   *
   * Espécie própria e não `text` porque o dado é um número e o desenho é uma frase — e
   * porque a largura da coluna se mede pela frase, não pelo número.
   */
  | ({ readonly kind: 'price'; readonly field: string } & ColumnBase)
  /** O VOLUME na escala do jogo: `0` some, `0,1` vira `L`, o resto é o número. */
  | ({ readonly kind: 'bulk'; readonly field: string } & ColumnBase)
  /** O dano: `1d6 B` na coluna, `1d6 Bludgeoning` no detalhe. */
  | ({ readonly kind: 'damage'; readonly field: string } & ColumnBase)
  /**
   * Um número da ficha do item, escrito como o livro escreve.
   *
   * Espécie própria e não `text` porque número cru mente: o limite de Destreza é `+5` e não
   * `5`, e a penalidade de deslocamento é `-5 ft.` e não `-5`. Conferido nas tabelas de
   * armadura e escudo do Archives of Nethys.
   */
  | ({ readonly kind: 'stat'; readonly field: string } & StatFormat & ColumnBase)
  /** Texto simples, sem moldura de chip. Para valores mais longos que um rótulo. */
  | ({ readonly kind: 'text'; readonly field: string } & ColumnBase);

/** Como os valores marcados de um MESMO tópico se combinam. */
export type Combine = 'any' | 'all';

/**
 * O que todo tópico de filtro tem além do que a espécie dele pede.
 *
 * `kinds` segue a mesma regra das colunas: ausente vale para todos os Tipos; presente, só
 * aparece quando os Tipos marcados estão contidos nele. Ver `browse/scope.ts`.
 */
interface FilterBase {
  readonly id: string;
  readonly kinds?: readonly string[];
}

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
  | ({ readonly kind: 'options'; readonly field: string } & FilterBase)
  /** Campo de sim/não. */
  | ({ readonly kind: 'boolean'; readonly field: string } & FilterBase)
  /**
   * Campo que guarda uma LISTA — traços. Aqui o par E/OU faz diferença de verdade, e
   * `combine` é o padrão com que o tópico abre.
   */
  | ({ readonly kind: 'list'; readonly field: string; readonly combine: Combine } & FilterBase)
  /** O custo em ações, desenhado com os glifos: ◆ ◆◆ ◆◆◆ ◇ ↩ —. */
  | ({ readonly kind: 'cost' } & FilterBase)
  /**
   * A raridade. Espécie própria por três motivos que `options` não atende: o domínio é
   * fechado e ordenado pelo JOGO (comum → única, e não alfabético), os valores têm
   * tradução fixa, e as quatro aparecem mesmo com zero resultados.
   */
  | ({ readonly kind: 'rarity'; readonly field: string } & FilterBase)
  /**
   * A frequência de uso. As opções são pares `max:per` (`1:day`), ordenados pela DURAÇÃO e
   * não pelo alfabeto — "por rodada" antes de "por dia" é a ordem em que a pessoa pensa.
   */
  | ({ readonly kind: 'frequency'; readonly field: string } & FilterBase)
  /**
   * O custo de CONJURAR. Uma opção por FORMATO do dado — as 26 que existem —, ordenadas
   * pela conta em `castRank`: ◆, ◆◆, ◆◆◆, as faixas, ◇, ↩, e o que leva tempo, do mais
   * curto para o mais longo.
   */
  | ({ readonly kind: 'cast'; readonly field: string } & FilterBase)
  /**
   * A DEFESA contra a magia: salvamento, defesa passiva e ATAQUE no mesmo tópico.
   *
   * Uma pergunta só — "contra o que esta magia trabalha?" —, e o livro a escreve numa linha
   * só. MULTIVALOR, como `list`: 6 magias atacam a CA e ainda pedem salvamento, e cada uma
   * conta nas duas opções. Sem o par E/OU, que aqui não teria uso.
   */
  | ({ readonly kind: 'defense' } & DefenseFields & FilterBase)
  /**
   * Uma FAIXA numérica preenchível: "de 30 a 60 pés". Sem opções — dois campos.
   *
   * Existe porque alcance tem 57 valores distintos e área tem 72: como lista de opções,
   * qualquer um dos dois é mais longo que a tela, e a pergunta que se faz não é "quais têm
   * exatamente 120 pés", é "quais chegam a pelo menos 60".
   *
   * O campo pode guardar PROSA (`30 feet`, `1 mile`, `touch`) — ver `distanceFeet`.
   */
  | ({ readonly kind: 'number'; readonly field: string; readonly unit: Unit } & FilterBase)
  /**
   * A ÁREA: o TIPO (opções) e o TAMANHO (faixa) no mesmo tópico, somados.
   *
   * Juntos e não em dois botões porque são a mesma pergunta partida ao meio — "explosão de
   * até 20 pés". Dois tópicos chamados "área" na barra obrigariam a abrir os dois para
   * descobrir qual é qual.
   */
  | ({ readonly kind: 'area'; readonly field: string; readonly unit: Unit } & FilterBase);

/**
 * Como um número da ficha se escreve.
 *
 * `signed` põe o `+` no positivo — um limite de Destreza `+5`, e não `5`. `unit` cola a
 * unidade do livro. `hideZero` some com o zero, e vale para PENALIDADE: "sem penalidade" se
 * diz não dizendo nada, e `-0 ft.` seria ruído em 117 das 211 armaduras. Um bônus zero, ao
 * contrário, é informação: a armadura destreinada dá CA `0`, e o AoN escreve o zero.
 */
export interface StatFormat {
  readonly signed?: boolean;
  readonly unit?: string;
  readonly hideZero?: boolean;
  /**
   * Mostra a METADE entre parênteses: `20 (10)`.
   *
   * É o Limiar de Quebra do escudo, que o livro sempre escreve assim — e ele não é um
   * campo que falta na fonte, é uma CONTA: vale sempre metade dos pontos de vida.
   * Conferido nos 126 escudos, e os 126 têm PV par, então a metade é exata.
   */
  readonly half?: boolean;
}

/** A unidade de uma faixa numérica: pés de distância, cobre de preço, e o Volume. */
export type Unit = 'feet' | 'copper' | 'bulk';

/**
 * Os campos do cabeçalho do detalhe.
 *
 * Mesma ideia das colunas: dado, não componente, com um desenhista por espécie na UI.
 * `cost` e `frequency` são conceitos de Pathfinder, e é assim mesmo — o que queremos
 * genérico é "acrescentar um tipo é escrever um descritor", não uma UI sem domínio.
 */
export type DetailFieldSpec =
  | { readonly kind: 'text'; readonly field: string }
  /**
   * O custo de conjurar. SEMPRE desenha, inclusive quando é só um glifo.
   *
   * Tentei a regra do livro aqui — o glifo ao lado do nome, e a linha de "Execução" só
   * quando o custo passa de um turno — e ela não sobreviveu ao uso: ao lado do nome o
   * glifo fica sem rótulo, e quem varre o cabeçalho procurando "Execução" não acha em 1.711
   * das 1.994. Ao lado do nome fica só a raridade, que identifica a entrada; o custo é
   * campo, e campo mora no `<dl>`.
   */
  | { readonly kind: 'cast'; readonly field: string }
  | { readonly kind: 'area'; readonly field: string }
  | ({ readonly kind: 'defense' } & DefenseFields)
  | { readonly kind: 'price'; readonly field: string }
  | { readonly kind: 'bulk'; readonly field: string }
  | ({ readonly kind: 'stat'; readonly field: string } & StatFormat)
  /**
   * A SUB-LISTA de ações de uma perícia, e ela é clicável.
   *
   * Primeira espécie de campo que não desenha um valor: desenha uma PONTE. Cada ação é uma
   * referência `@UUID` para uma entrada que já existe na fonte de Ações, e clicar abre o
   * detalhe dela — o mesmo que se veria lá. Nada é duplicado.
   */
  | { readonly kind: 'actions'; readonly field: string; readonly trained: string }
  /** `1d8 cortante`. Ver `EquipmentDamage` na receita. */
  | { readonly kind: 'damage'; readonly field: string }
  | { readonly kind: 'duration'; readonly field: string }
  /** Quem mais precisa ajudar no ritual, e com que teste. */
  | { readonly kind: 'ritual'; readonly field: string }
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
  /**
   * O id do filtro que faz o papel de TIPO nesta fonte, ou `null` se ela não tem um.
   *
   * É ele que comanda o recorte de colunas e filtros (ver `browse/scope.ts`). Em quase toda
   * fonte é o `sector`, que vem da pasta do compêndio; em equipamento é o `kind`, porque lá
   * 5.706 dos 5.869 não têm pasta.
   */
  readonly typeFilter: string | null;
  /**
   * Esta fonte APONTA para entradas de outras — e por isso a tela precisa de todas as bases
   * carregadas, e não só da dela.
   *
   * Só perícia hoje: as ações dela moram em Ações. Sem isto, o clique numa ação não abriria
   * nada, porque a base de ações não estaria em memória.
   */
  readonly crossReferences?: boolean;
  /**
   * Quais colunas ligam sozinhas quando UM Tipo está marcado, por valor de Tipo.
   *
   * O modelo é a tabela do Archives of Nethys: cada categoria tem suas colunas, e elas já
   * vêm postas. Ausente para um Tipo: cai em `defaultColumns`, como a visão geral.
   */
  readonly presets?: Readonly<Record<string, readonly string[]>>;
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
/**
 * De onde sai a defesa de uma magia. Uma definição, espalhada na coluna, no filtro e no
 * detalhe — três cópias divergiriam no primeiro ajuste.
 */
const DEFESA_DE_MAGIA: DefenseFields = {
  field: 'save',
  passiveField: 'passiveDefense',
  traitsField: 'traits',
  attackTrait: 'attack',
};

export const SOURCES: readonly SourceSpec[] = [
  {
    id: 'conditions',
    entityType: 'condition',
    mode: 'list',
    columns: [
      { kind: 'chip', id: 'group', field: 'group' },
      { kind: 'boolean', id: 'valued', field: 'valued' },
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
    /* Condição não tem Tipo: a fonte inteira é uma coisa só. */
    typeFilter: null,
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
    /*
     * O TIPO abre as duas listas, e a ordem das colunas ESPELHA a dos filtros depois dele.
     *
     * Ele vem primeiro porque é o corte mais grosso que existe: separa magia de foco de
     * ritual, talento de classe de talento de ancestralidade. Quem chega numa fonte de
     * 6.284 entradas escolhe primeiro DE QUE ESPÉCIE, e só então afina. Estava no fim, ao
     * lado do livro, como se fosse procedência.
     *
     * Espelhar o resto existe porque as duas listas falam das mesmas coisas, e ordens
     * diferentes obrigavam a reaprender onde cada uma está.
     */
    columns: [
      { kind: 'chip', id: 'sector', field: 'sector' },
      { kind: 'cost', id: 'cost' },
      { kind: 'frequency', id: 'frequency', field: 'frequency' },
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
      { kind: 'options', id: 'sector', field: 'sector' },
      { kind: 'rarity', id: 'rarity', field: 'rarity' },
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
      { kind: 'frequency', id: 'frequency', field: 'frequency' },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    /* O Tipo desta fonte vem da pasta do compêndio. Ver `browse/scope.ts`. */
    typeFilter: 'sector',
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
      { kind: 'source' },
    ],
  },
  {
    id: 'feats',
    entityType: 'feat',
    mode: 'list',
    /* Tipo primeiro, resto espelhando os filtros — ver a nota em `actions`. */
    columns: [
      { kind: 'chip', id: 'sector', field: 'sector' },
      { kind: 'cost', id: 'cost' },
      { kind: 'frequency', id: 'frequency', field: 'frequency' },
      { kind: 'boolean', id: 'onlyLevel1', field: 'onlyLevel1' },
      { kind: 'text', id: 'source', field: 'source.title' },
    ],
    defaultColumns: [],
    /* A primeira fonte com NÍVEL: a calha existe desde a Etapa 8 sem dado que a usasse. */
    special: { level: 'level', rarity: 'rarity', traits: 'traits' },
    filters: [
      { kind: 'options', id: 'sector', field: 'sector' },
      { kind: 'options', id: 'level', field: 'level' },
      { kind: 'rarity', id: 'rarity', field: 'rarity' },
      { kind: 'list', id: 'traits', field: 'traits', combine: 'any' },
      { kind: 'cost', id: 'cost' },
      { kind: 'frequency', id: 'frequency', field: 'frequency' },
      { kind: 'boolean', id: 'onlyLevel1', field: 'onlyLevel1' },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    /* O Tipo desta fonte vem da pasta do compêndio. Ver `browse/scope.ts`. */
    typeFilter: 'sector',
    searchFields: ['name'],
    /*
     * Ordem do autor. Fora daqui ficam `prerequisites`, `maxTakable`, `onlyLevel1` e
     * `frequency`: os quatro já vêm escritos na descrição logo abaixo, e repeti-los no
     * cabeçalho gastaria linha para dizer duas vezes a mesma coisa. `frequency` e
     * `onlyLevel1` seguem disponíveis como COLUNA e como FILTRO, onde não há descrição
     * para consultar.
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
    entityType: 'spell',
    mode: 'list',
    /* Tipo primeiro, resto espelhando os filtros — ver a nota em `actions`. */
    columns: [
      { kind: 'chip', id: 'sector', field: 'sector' },
      { kind: 'cast', id: 'cast', field: 'cast' },
      { kind: 'chips', id: 'traditions', field: 'traditions' },
      { kind: 'text', id: 'range', field: 'range' },
      { kind: 'area', id: 'area', field: 'area' },
      { kind: 'defense', id: 'save', ...DEFESA_DE_MAGIA },
      { kind: 'duration', id: 'duration', field: 'duration' },
      { kind: 'text', id: 'source', field: 'source.title' },
    ],
    defaultColumns: [],
    /*
     * O POSTO ocupa a calha do nível. Magia não tem nível — o Remaster renomeou para
     * "rank" —, mas na tela ele faz o mesmo trabalho: um número curto antes do nome, que
     * ordena e que o olho usa para varrer.
     */
    special: { level: 'rank', rarity: 'rarity', traits: 'traits' },
    filters: [
      { kind: 'options', id: 'sector', field: 'sector' },
      { kind: 'options', id: 'rank', field: 'rank' },
      { kind: 'rarity', id: 'rarity', field: 'rarity' },
      { kind: 'list', id: 'traits', field: 'traits', combine: 'any' },
      { kind: 'cast', id: 'cast', field: 'cast' },
      { kind: 'list', id: 'traditions', field: 'traditions', combine: 'any' },
      { kind: 'number', id: 'range', field: 'range', unit: 'feet' },
      { kind: 'area', id: 'area', field: 'area', unit: 'feet' },
      { kind: 'defense', id: 'save', ...DEFESA_DE_MAGIA },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    /* O Tipo desta fonte vem da pasta do compêndio. Ver `browse/scope.ts`. */
    typeFilter: 'sector',
    searchFields: ['name'],
    /*
     * A ORDEM é a do livro, confirmada no AoN:
     *
     *   traços → tradição → EXECUÇÃO (tempo, custo, requisitos)
     *          → DISTÂNCIA, ÁREA E ALVOS → DEFESA E DURAÇÃO → (descrição) → elevada
     *
     * `cast` desenha SEMPRE. A regra do livro — glifo no nome, linha de Execução só quando
     * passa de um turno — deixava 1.711 das 1.994 sem a linha que se procura.
     *
     * `counteraction` saiu dos três lugares (coluna, filtro e detalhe): é o "pode ser usada
     * para anular outra magia", e sem a regra escrita ao lado ninguém sabe o que a marca
     * quer dizer. O campo continua normalizado, esperando ter onde ser explicado.
     *
     * `heightening` não é campo: 1.134 das 1.994 descrições já trazem o "Heightened"
     * escrito, contra 610 com o dado estruturado — o texto cobre mais.
     *
     * Os dois últimos são sempre setor e livro.
     */
    detail: [
      { kind: 'chips', field: 'traits' },
      { kind: 'chips', field: 'traditions' },
      { kind: 'cast', field: 'cast' },
      { kind: 'text', field: 'materialCost' },
      { kind: 'text', field: 'requirements' },
      { kind: 'text', field: 'range' },
      { kind: 'area', field: 'area' },
      { kind: 'text', field: 'target' },
      { kind: 'defense', ...DEFESA_DE_MAGIA },
      { kind: 'duration', field: 'duration' },
      { kind: 'ritual', field: 'ritual' },
      { kind: 'text', field: 'sector' },
      { kind: 'source' },
    ],
  },
  {
    id: 'equipment',
    entityType: 'equipment',
    mode: 'list',
    /*
     * A fonte com MAIS colunas do projeto — vinte —, e é consequência do dado: nove
     * espécies de item num catálogo só, cada uma com números que as outras não têm. Uma
     * poção não tem grupo de arma; uma espada não tem limite de Destreza.
     *
     * Isso funciona porque coluna é ESCOLHA: o padrão é nenhuma, e quem procura armadura
     * liga as cinco de armadura. O modelo é a tabela do Archives of Nethys, que troca de
     * colunas conforme a categoria — a diferença é que aqui quem troca é a pessoa.
     *
     * Tipo primeiro, resto espelhando os filtros — ver a nota em `actions`.
     */
    columns: [
      { kind: 'chip', id: 'kind', field: 'kind' },
      {
        kind: 'chip',
        id: 'category',
        field: 'category',
        kinds: ['consumable', 'weapon', 'treasure', 'armor'],
      },
      { kind: 'chip', id: 'group', field: 'group', kinds: ['weapon', 'armor'] },
      { kind: 'chip', id: 'weaponType', field: 'weaponType', kinds: ['weapon'] },
      { kind: 'damage', id: 'damage', field: 'damage', kinds: ['weapon', 'consumable'] },
      {
        kind: 'chip',
        id: 'hands',
        field: 'hands',
        kinds: ['equipment', 'consumable', 'weapon', 'backpack'],
      },
      { kind: 'stat', id: 'range', field: 'range', unit: 'ft.', kinds: ['weapon'] },
      { kind: 'chip', id: 'reload', field: 'reload', kinds: ['weapon'] },
      { kind: 'price', id: 'price', field: 'price' },
      { kind: 'bulk', id: 'bulk', field: 'bulk' },
      {
        kind: 'chip',
        id: 'carry',
        field: 'carry',
        kinds: ['equipment', 'consumable', 'weapon', 'backpack'],
      },
      {
        kind: 'text',
        id: 'usage',
        field: 'usage',
        kinds: ['equipment', 'consumable', 'weapon', 'backpack'],
      },
      { kind: 'stat', id: 'acBonus', field: 'acBonus', kinds: ['armor', 'shield'] },
      { kind: 'stat', id: 'dexCap', field: 'dexCap', signed: true, kinds: ['armor'] },
      {
        kind: 'stat',
        id: 'checkPenalty',
        field: 'checkPenalty',
        signed: true,
        hideZero: true,
        kinds: ['armor'],
      },
      {
        kind: 'stat',
        id: 'speedPenalty',
        field: 'speedPenalty',
        signed: true,
        unit: 'ft.',
        hideZero: true,
        kinds: ['armor', 'shield'],
      },
      { kind: 'stat', id: 'strength', field: 'strength', kinds: ['armor'] },
      { kind: 'stat', id: 'hardness', field: 'hardness', kinds: ['shield'] },
      { kind: 'stat', id: 'hitPoints', field: 'hitPoints', kinds: ['shield'] },
      { kind: 'stat', id: 'uses', field: 'uses', kinds: ['consumable', 'ammo'] },
      { kind: 'chip', id: 'family', field: 'family' },
      { kind: 'text', id: 'source', field: 'source.title' },
    ],
    /* A visão geral mostra só o Tipo: é a única em que uma coluna pode estar vazia em 90%
       das linhas. Ver `browse/scope.ts`. */
    defaultColumns: ['kind'],
    /*
     * O que liga sozinho quando UM Tipo está marcado — copiado das tabelas do Archives of
     * Nethys, uma por categoria. Três no máximo, que é o teto de colunas da lista.
     */
    presets: {
      weapon: ['group', 'damage', 'hands'],
      armor: ['category', 'acBonus', 'dexCap'],
      shield: ['acBonus', 'hardness', 'hitPoints'],
      consumable: ['category', 'usage'],
      ammo: ['uses'],
      equipment: ['carry', 'usage'],
      treasure: ['category'],
      backpack: ['usage'],
    },
    special: { level: 'level', rarity: 'rarity', traits: 'traits' },
    /*
     * O TIPO aqui é o `kind` — o `type` do próprio documento do Foundry —, e não a pasta.
     * Medido: 5.706 dos 5.869 não têm pasta nenhuma. Ver a receita.
     */
    filters: [
      { kind: 'options', id: 'kind', field: 'kind' },
      { kind: 'options', id: 'level', field: 'level' },
      { kind: 'rarity', id: 'rarity', field: 'rarity' },
      { kind: 'list', id: 'traits', field: 'traits', combine: 'any' },
      {
        kind: 'options',
        id: 'category',
        field: 'category',
        kinds: ['consumable', 'weapon', 'treasure', 'armor'],
      },
      { kind: 'options', id: 'group', field: 'group', kinds: ['weapon', 'armor'] },
      { kind: 'options', id: 'weaponType', field: 'weaponType', kinds: ['weapon'] },
      {
        kind: 'options',
        id: 'hands',
        field: 'hands',
        kinds: ['equipment', 'consumable', 'weapon', 'backpack'],
      },
      { kind: 'options', id: 'reload', field: 'reload', kinds: ['weapon'] },
      { kind: 'number', id: 'price', field: 'price', unit: 'copper' },
      { kind: 'number', id: 'bulk', field: 'bulk', unit: 'bulk' },
      { kind: 'number', id: 'range', field: 'range', unit: 'feet', kinds: ['weapon'] },
      /*
       * `carry` e não `usage`: são as mesmas 5.161 respostas em OITO opções em vez de 120.
       * Vinte e sete grafias de "vestido" numa lista de filtro não respondem "o que é
       * vestido". O `usage` cru continua sendo o que a tela ESCREVE.
       */
      {
        kind: 'options',
        id: 'carry',
        field: 'carry',
        kinds: ['equipment', 'consumable', 'weapon', 'backpack'],
      },
      { kind: 'options', id: 'family', field: 'family' },
      { kind: 'options', id: 'source', field: 'source.title' },
    ],
    /*
     * O Tipo é o `kind`, e não a pasta: 5.706 dos 5.869 não têm pasta nenhuma.
     * É ele que comanda quais colunas e filtros aparecem. Ver `browse/scope.ts`.
     */
    typeFilter: 'kind',
    searchFields: ['name'],
    /*
     * A ordem é a do bloco de item do AoN, conferida nos prints do autor:
     *
     *   Battle Lute → Price 7 gp; Damage 1d4 B; Bulk 1 / Hands 1
     *                 Type Melee; Category Simple; Group Club
     *
     * Depois vêm os números que só armadura e escudo têm, e por fim de onde o item veio.
     * Nível e raridade NÃO são campos: viram a calha e a etiqueta ao lado do nome.
     */
    /*
     * A ORDEM é a dos blocos do próprio Archives of Nethys, lidos um a um. Seis blocos, e
     * uma sequência que serve aos seis:
     *
     *   Full Plate        Preço · CA · Des · testes · deslocamento · Força · Volume · categoria · grupo
     *   Steel Shield      Preço · CA · deslocamento · Volume · dureza · PV
     *   Javelin           Preço · dano · Volume · mãos · alcance · tipo · categoria · grupo
     *   Arrows            Preço · Volume · mãos · tipo · categoria · grupo
     *   Bag of Holding    Uso · Volume
     *   Alchemist's Fire  Uso · Volume
     *
     * O que os itens sem preço no cabeçalho mostram primeiro é o USO — por isso ele vem
     * logo depois do preço, e não lá embaixo, onde eu o tinha posto.
     *
     * Os dois últimos são o Tipo e o livro, como em toda fonte.
     */
    detail: [
      { kind: 'chips', field: 'traits' },
      { kind: 'price', field: 'price' },
      { kind: 'text', field: 'usage' },
      { kind: 'damage', field: 'damage' },
      { kind: 'stat', field: 'acBonus', signed: true },
      { kind: 'stat', field: 'dexCap', signed: true },
      { kind: 'stat', field: 'checkPenalty', signed: true, hideZero: true },
      { kind: 'stat', field: 'speedPenalty', signed: true, unit: 'ft.', hideZero: true },
      { kind: 'stat', field: 'strength', signed: true },
      { kind: 'bulk', field: 'bulk' },
      { kind: 'stat', field: 'hardness' },
      { kind: 'stat', field: 'hitPoints', half: true },
      { kind: 'text', field: 'hands' },
      { kind: 'stat', field: 'range', unit: 'ft.' },
      { kind: 'text', field: 'reload' },
      { kind: 'text', field: 'weaponType' },
      { kind: 'text', field: 'category' },
      { kind: 'text', field: 'group' },
      { kind: 'stat', field: 'uses' },
      { kind: 'text', field: 'family' },
      /*
       * O TIPO é o PENÚLTIMO, antes do livro — a mesma posição que ele tem em ação,
       * talento e magia. Ele abre a lista de filtros e a de colunas porque ali é recorte;
       * aqui a ordem é a de LEITURA da entrada.
       */
      { kind: 'text', field: 'kind' },
      { kind: 'source' },
    ],
  },
  {
    id: 'ancestries',
    entityType: null,
    mode: 'list',
    columns: [],
    defaultColumns: [],
    special: NO_SPECIAL_COLUMNS,
    filters: [],
    typeFilter: null,
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
    typeFilter: null,
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
    typeFilter: null,
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
    typeFilter: null,
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
    typeFilter: null,
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
    typeFilter: null,
    searchFields: [],
    detail: [],
  },
  {
    id: 'skills',
    entityType: 'skill',
    mode: 'list',
    /*
     * A fonte mais MAGRA do projeto: dezessete entradas, uma coluna.
     *
     * Perícia não tem nível, raridade, traço, livro nem descrição — nada disso existe no
     * pacote do Foundry (ver a receita). O que ela tem é o atributo-chave e as ações, e as
     * ações são o corpo da entrada, não uma coluna.
     */
    crossReferences: true,
    columns: [{ kind: 'chip', id: 'attribute', field: 'attribute' }],
    defaultColumns: ['attribute'],
    special: NO_SPECIAL_COLUMNS,
    filters: [{ kind: 'options', id: 'attribute', field: 'attribute' }],
    typeFilter: null,
    searchFields: ['name'],
    /*
     * O detalhe é a sub-lista: atributo em cima, e as ações separadas entre o que qualquer
     * um tenta e o que exige treinamento. Clicar numa abre a ação.
     */
    detail: [
      { kind: 'text', field: 'attribute' },
      { kind: 'actions', field: 'untrained', trained: 'trained' },
    ],
  },
];

export function findSource(id: string): SourceSpec | undefined {
  return SOURCES.find((source) => source.id === id);
}

/** A primeira fonte com receita pronta. É onde a tela abre. */
export function firstReadySource(): SourceSpec | undefined {
  return SOURCES.find((source) => source.entityType !== null);
}
