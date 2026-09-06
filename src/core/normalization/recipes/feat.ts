/**
 * Receita de `feat` — 6.284 entradas no pack `feats-srd`.
 *
 * Terceira receita do projeto, e a maior: sozinha ela é oito vezes o que `condition` e
 * `action` somam. É também a primeira com NÍVEL de verdade — a coluna existe desde a
 * Etapa 8 e até agora não tinha dado nenhum para mostrar.
 *
 * ⚠️ EXISTEM 7.633 DOCUMENTOS DO TIPO `feat` NA BASE, e esta receita lê 6.284.
 *
 * O tipo do Foundry mistura sete coisas diferentes, e `system.category` as separa sem
 * ambiguidade nenhuma — medido no `pf2e-8.5.0`:
 *
 *   feats-srd                  6284   class 4303, ancestry 1586, skill 338, general 40,
 *                                     bonus 14, classfeature 3
 *   classfeatures               874   classfeature 856, calling 18
 *   boons-and-curses            240   deityboon 123, curse 117
 *   pathfinder-society-boons    157   pfsboon 157
 *   ancestryfeatures             55   ancestryfeature 55
 *   adventure-specific-actions   16   deityboon 16
 *   campaign-effects              7   deityboon 7
 *
 * (Nome DECLARADO no manifesto, que não é o nome do arquivo: `feats-srd` mora em
 * `packs/feats.json`, `classfeatures` em `packs/class-features.json`. Quem casa é o
 * declarado — escrevi `feats` na primeira vez e o pack "sumiu do manifesto".)
 *
 * Só o primeiro entra, e a razão é do usuário e não do dado: talento é o que a pessoa
 * ESCOLHE. Traço de classe e de ancestralidade são CONCEDIDOS, bênção e maldição de
 * divindade são do mestre, prêmio de PFS é de jogo organizado. Listá-los juntos faria a
 * tela "Talentos" mentir sobre o que ela lista.
 *
 * Trazê-los depois, como tipos próprios, é declarar o pack e filtrar por `category` — não
 * há nada aqui que precise ser desfeito para isso.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 05/09/2026.
 */

import { bool, html, int, listOf, nullable, shape, text, textList } from '../decoders';
import { from, fromSector } from '../field';
import { recipe } from '../recipe';

/**
 * Com que frequência o talento pode ser usado.
 *
 * 634 têm a chave, mas só 625 trazem objeto: em 9 a chave existe valendo NULA —
 * `Reloading Trick`, `Quick Recognition`, `Look Again` e mais seis. Chave nula e chave
 * ausente significam a mesma coisa aqui (não há limite de uso), e é por isso que o campo
 * é `nullable(...)` COM padrão nulo, e não só opcional.
 *
 * `per` medido nas 625: day 298, PT1H 135, PT10M 92, round 44, PT1M 39, turn 9, P1W 5, P1M 2,
 * P1Y 1. Os três últimos NÃO aparecem em ações, e `parseDurationCode` já os lê — semana,
 * mês e ano estavam na tabela desde a Etapa 8, sem dado que os exercitasse.
 */
export interface FeatFrequency {
  readonly max: number;
  readonly per: string;
}

export interface FeatBase {
  readonly name: string;
  readonly slug: string;

  /**
   * 0 a 20, e a chave existe nos 6.284 — nenhum talento sem nível.
   *
   * Distribuição medida, e ela tem forma: os níveis ímpares acima de 2 são vales (3 tem
   * 19, 5 tem 352, 7 tem 77) porque a classe concede talento em nível par. Nível 0 são
   * 14, e é onde moram os de ancestralidade concedidos na criação.
   */
  readonly level: number;

  /**
   * O par de custo, fiel ao dado, e a mesma união exata das ações — medido nos 6.284:
   *
   *   passive + null  3977      reaction + null  472
   *   action + 1       948      free + null      216
   *   action + 2       521
   *   action + 3       150
   *
   * `action` SEMPRE tem contagem; todo o resto é SEMPRE nulo. Dois terços são passivos,
   * contra 13% das ações — talento em geral não se "usa", se tem.
   */
  readonly costKind: string;
  readonly costCount: number | null;

  /**
   * Que espécie de talento é: `class` 4303, `ancestry` 1586, `skill` 338, `general` 40,
   * `bonus` 14, `classfeature` 3.
   *
   * É o eixo que separa os sete packs do tipo `feat` (ver o cabeçalho), e por isso está
   * na base mesmo com 68% de um valor só. Os 3 `classfeature` perdidos aqui dentro são
   * `Deathless Servant`, `Mystic Life Force` e `One Among the Masses` — do pack errado,
   * defeito do dado do pf2e, e não vale filtrar por eles: some com a próxima versão.
   */
  readonly category: string;

  /**
   * A pasta RAIZ do compêndio. Existe nos 6.284 — aqui não há o caso `Adventure` das
   * ações, em que a ausência da chave é que carimbava.
   *
   * Medido: Archetype 2340, Class 1993, Ancestry 1561, Skill 228, Miscellaneous 72,
   * Mythic 49, General 41.
   */
  readonly sector: string;

  /** 215 traços distintos, média de 1,70 por talento e máximo de 10. */
  readonly traits: readonly string[];

  /**
   * common 5467, uncommon 613, rare 204 — 13,0% marcados, contra 0,3% das ações.
   *
   * É este tipo que finalmente exercita a etiqueta de raridade em volume. `unique` segue
   * com zero ocorrências na base inteira.
   */
  readonly rarity: string;

  /**
   * O que o talento exige, como a Paizo escreveu: 3.895 dos 6.284 têm ao menos um, e são
   * 4.635 exigências no total.
   *
   * TEXTO LIVRE, e de propósito. No dado vem `[{ value: 'spirit instinct' }]` — sem tipo,
   * sem referência, sem estrutura. Tentar interpretar ("é um talento? uma perícia? um
   * nível?") seria inventar semântica que a fonte não tem. A ficha, um dia, vai precisar
   * disso resolvido; a consulta só precisa mostrar.
   */
  readonly prerequisites: readonly string[];

  readonly frequency: FeatFrequency | null;

  /**
   * Quantas vezes se pode pegar. Ausente em 6.147, e o padrão do sistema é 1.
   *
   * `null` NÃO é ausência: 74 declaram nulo, e nulo quer dizer SEM LIMITE — são os
   * `Terrain Expertise`, `Order Explorer`, `Advanced Qi Spells` da vida, que se repetem à
   * vontade. Os outros 63 trazem número: 3 (24 talentos), 2 (35), 5 (2), 4 (2).
   *
   * Por isso `number | null` com padrão 1, e não `number`: os três estados são
   * diferentes e a tela precisa distinguir "uma vez", "até N vezes" e "quantas quiser".
   */
  readonly maxTakable: number | null;

  /** Só na criação do personagem. 64 declaram, e todos com `true`. */
  readonly onlyLevel1: boolean;

  readonly source: {
    readonly license: string;
    readonly title: string;
    /** 98 livros distintos. 4.733 Remaster, 1.551 legado. */
    readonly remaster: boolean;
  };
}

export interface FeatDesc {
  /** HTML cru, nunca modificado. A Etapa 7 é quem o transforma em texto legível. */
  readonly main: string;
}

export const featRecipe = recipe<FeatBase, FeatDesc>({
  type: 'feat',
  packs: [{ name: 'feats-srd' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    level: from('system.level.value', int),
    costKind: from('system.actionType.value', text),
    costCount: from('system.actions.value', nullable(int)),
    category: from('system.category', text),
    sector: fromSector(),
    traits: from('system.traits.value', textList),
    rarity: from('system.traits.rarity', text),
    /*
     * O `{ value }` de cada item é embrulho do Foundry, não informação. Desembrulha aqui
     * para a tela receber uma lista de frases — se ela recebesse os objetos, todo
     * consumidor teria que conhecer o formato do VTT.
     */
    prerequisites: from('system.prerequisites.value', listOf(shape({ value: text }))).map((items) =>
      items.map((item) => item.value),
    ),
    frequency: from('system.frequency', nullable(shape({ max: int, per: text }))).withDefault(null),
    maxTakable: from('system.maxTakable', nullable(int)).withDefault(1),
    onlyLevel1: from('system.onlyLevel1', bool).withDefault(false),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'ícone do custo em ações; o zip não traz imagem, e o custo já vem de costKind/costCount',
    effects: 'active effects do VTT; vazio nos 6.284',
    'system._migration': 'controle interno de migração do Foundry',
    'system.frequency.value':
      'quantos usos restam AGORA; estado de ficha, não de consulta (41 dos 6.284)',
    'system.rarity':
      'chave morta que CONTRADIZ a viva. Existe em 10 talentos — as máscaras de ' +
      'Vigilant Mask a Tireless Guide\'s Mask — e nos 10 diz "common" enquanto ' +
      'system.traits.rarity, que existe nos 6.284, diz "rare". A autoridade é a que o ' +
      'sistema lê; esta é resto de migração.',
    'system.traits.selected':
      'cache de interface do Foundry que vazou para o compêndio (2 dos 6.284), o mesmo ' +
      'lixo já visto nas ações',
    'system.identified': 'se o item foi identificado; estado de mesa, e só 2 o trazem',
    'system.level.taken': 'em que nível a pessoa PEGOU o talento; estado de ficha (2)',
    'system.location': 'a qual item da ficha este está preso; estado de ficha (15)',
    'system.duration': 'sobra de outro tipo de item; existe em 1 talento e não significa nada aqui',
    'system.start': 'idem — 1 talento',
    'system.target': 'idem — 1 talento',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules':
      'rule elements — mecânica pura de VTT, essencial se a ficha aplicar regras. ' +
      'Continua em raw/.',
    'system.subfeatures':
      'o que o talento CONCEDE em números: proficiência (966), sentido (975) e as ' +
      'features que ele suprime (978). É a metade mecânica do talento, e a descrição já ' +
      'conta em texto o que ela faz. Vira essencial na ficha.',
    'system.selfEffect': 'o efeito que o talento aplica em quem o usa (259). Mecânica de ficha.',
    'system.traits.otherTags':
      'etiquetas internas de agrupamento do sistema (81). Vira útil se a ficha precisar ' +
      'agrupar talentos por linhagem.',
  },
});
