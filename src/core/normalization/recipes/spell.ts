/**
 * Receita de `spell` — 1.994 entradas no pack `spells`.
 *
 * Quarta receita, e a mais RICA: dezenove campos contra os quinze do talento e os onze da
 * ação. Magia não é uma linha com um custo, é uma ficha inteira — alcance, alvo, área,
 * duração, salvamento, material, requisito.
 *
 * Um pack só, e todas as 1.994 com pasta. Nada da ambiguidade dos sete packs que o tipo
 * `feat` mistura: aqui o tipo do Foundry corresponde a uma coisa só.
 *
 * ⚠️ O QUE VAI PARA O CABEÇALHO É O INVERSO DO TALENTO, e isso foi medido antes de decidir.
 * Nos talentos, frequência e pré-requisito já vinham escritos na descrição, e por isso
 * ficaram de fora. Aqui é ao contrário — de 1.994 descrições:
 *
 *   alcance    tem o campo em 1.358, e a descrição repete em      9
 *   alvo       tem em 1.003, e a descrição repete em              1
 *   duração    tem em 1.310, e a descrição repete em              0
 *   salvamento tem em   762, e a descrição repete em              7
 *   ritual     tem em   167, e a descrição repete em              1
 *
 * Sem esses campos a magia fica ilegível. O único que segue o padrão do talento é o
 * `Heightened`: 1.134 descrições já o trazem escrito contra 610 com o campo estruturado —
 * o texto cobre MAIS que o dado, então o dado fica adiado.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 06/09/2026.
 */

import { parseCastTime, type SpellCast } from '../cast';
import { bool, html, int, nullable, optional, shape, text, textList } from '../decoders';
import { from, fromSector } from '../field';
import { recipe } from '../recipe';

/** A área que a magia cobre. `details` é a prosa que descreve melhor que o par. */
export interface SpellArea {
  /** `burst` 204, `emanation` 133, `cone` 52, `line` 26, `cylinder` 17, `square` 12, `cube` 9. */
  readonly type: string;
  /** Em pés. */
  readonly value: number;
  /**
   * A descrição em prosa, em 20 das 453 com área. Vale mais que o par quando existe:
   * `20-foot burst adjacent to a flat surface` diz o que `burst 20` não diz.
   */
  readonly details: string | null;
}

/** O salvamento contra a magia. `basic` é o "salvamento básico" do PF2e. */
export interface SpellSave {
  /** `will` 288, `fortitude` 266, `reflex` 208. */
  readonly statistic: string;
  /** 236 básicos contra 526 comuns. */
  readonly basic: boolean;
}

/** Quem mais precisa ajudar a conjurar, e com que teste. Só os 167 rituais têm. */
export interface SpellRitual {
  readonly primaryCheck: string;
  /**
   * Quantos conjuradores secundários. `number | null`, e a distinção é do dado:
   * ZERO é valor real, em 33 rituais — o ritual existe e não precisa de ajuda. NULO é
   * outra coisa, "não especificado", e são 4: `The World's a Stage`, `Borrow Time`,
   * `Asmodean Wager` e `Glance of the Divine`. Colapsar os dois em 0 apagaria a diferença.
   */
  readonly secondaryCasters: number | null;
  /** O teste dos secundários. Vazio em 23 dos 167. */
  readonly secondaryChecks: string;
}

export interface SpellBase {
  readonly name: string;
  readonly slug: string;

  /**
   * O POSTO da magia, 1 a 10. Nunca 0.
   *
   * `rank` e não `level`: o Remaster renomeou "spell level" para "spell rank" justamente
   * para não confundir com o nível do personagem. O dado ainda vem em `system.level.value`
   * porque o Foundry não renomeou a chave.
   *
   * NÃO há posto 0. Truque é o traço `cantrip`, e são 120 — mas atenção, porque eu escrevi
   * "truque é posto 1" antes de medir e o teste me pegou: só 102 dos 120 são posto 1. Os
   * outros 18 são as cantigas (`Dirge of Doom` posto 3, `Allegro` posto 7…), que são truques
   * de posto alto. Traço e posto são eixos diferentes.
   *
   * Distribuição: 1 tem 499, 4 tem 299, 3 tem 286, 2 tem 266, 5 tem 227, e daí decrescendo
   * até 42 no posto 10.
   */
  readonly rank: number;

  /**
   * O custo de conjurar, decodificado dos 27 formatos de `system.time.value`.
   *
   * É o único campo de magia sem paralelo nas outras receitas: ação e talento trazem o par
   * `actionType`/`actions`, magia traz uma string livre que mistura contagem de ações,
   * FAIXA de ações e DURAÇÃO. Ver `normalization/cast.ts`, onde a conta mora.
   */
  readonly cast: SpellCast;

  /**
   * A pasta RAIZ, e ela não é organização: é ESPÉCIE de magia.
   *
   * `Spells` 1277, `Focus` 545, `Rituals` 167, `Impossible Spells` 5. Magia de foco se
   * gasta em Pontos de Foco, ritual leva horas e vários conjuradores — são coisas
   * diferentes que a fonte separa por pasta, e é a única marca que as separa.
   */
  readonly sector: string;

  /** 96 traços distintos. `concentrate` 1632 e `manipulate` 1605 estão em quase todas. */
  readonly traits: readonly string[];

  /**
   * common 925, uncommon 868, rare 191, **unique 10**.
   *
   * 53,6% não-comuns — a fonte que mais exercita a etiqueta de raridade, e a PRIMEIRA com
   * `unique`: a letra `U` existe desde a Etapa 8 sem nada para desenhar.
   */
  readonly rarity: string;

  /**
   * Quais tradições podem conjurar: `arcane`, `divine`, `occult`, `primal`.
   *
   * VAZIO em 709, e não é falha do dado: magia de foco pertence a uma classe, não a uma
   * tradição. Quem filtra por tradição não quer ver essas.
   */
  readonly traditions: readonly string[];

  /** `30 feet` 468, `touch` 263, `60 feet` 191… 57 formatos, e vazio em 636. */
  readonly range: string;

  /** `1 creature` 357 e mais 389 formas. Texto livre; vazio em 991. */
  readonly target: string;

  readonly area: SpellArea | null;

  /** `1 minute` 642, `varies` 103, `10 minutes` 101… Vazio em 684. */
  readonly duration: string;

  /** Sustentada enquanto se concentra: 275 de 1.994. */
  readonly sustained: boolean;

  readonly save: SpellSave | null;

  /**
   * Quando a magia é resistida por um valor PASSIVO em vez de um salvamento: `ac`,
   * `fortitude-dc`, `reflex-dc`. São 11 — em outras 3 a chave `passive` existe valendo nula,
   * e por isso `14` era o número errado. Nas 10 que só têm isto o salvamento vem nulo: as
   * duas coisas são alternativas, não complementos.
   *
   * VAZIO e não nulo, como `range` e `materialCost`: campo de texto ausente é `''` em toda
   * esta receita, e a tela já esconde o vazio sozinha.
   */
  readonly passiveDefense: string;

  /** O material que se gasta, em prosa. 140 magias; vazio nas outras. */
  readonly materialCost: string;

  /** `You have a deity.` e afins. 45 magias; vazio nas outras. */
  readonly requirements: string;

  /** Serve para dissipar outra magia: 57 de 1.994. */
  readonly counteraction: boolean;

  readonly ritual: SpellRitual | null;

  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface SpellDesc {
  /** HTML cru. Traz o `Heightened` escrito em 1.134 das 1.994. */
  readonly main: string;
}

export const spellRecipe = recipe<SpellBase, SpellDesc>({
  type: 'spell',
  packs: [{ name: 'spells-srd' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    rank: from('system.level.value', int),
    cast: from('system.time.value', text).map<SpellCast>(parseCastTime),
    sector: fromSector(),
    traits: from('system.traits.value', textList),
    rarity: from('system.traits.rarity', text),
    traditions: from('system.traits.traditions', textList),
    range: from('system.range.value', text),
    target: from('system.target.value', text),
    area: from('system.area', nullable(shape({ type: text, value: int, details: optional(text) }))),
    duration: from('system.duration.value', text),
    sustained: from('system.duration.sustained', bool),
    /*
     * O caminho é `system.defense.save`, e ele é nulo de DUAS formas: `defense` inteiro
     * ausente em 1.222, e `defense.save` nulo em 10 — as que se defendem por valor passivo.
     */
    save: from(
      'system.defense.save',
      optional(nullable(shape({ statistic: text, basic: bool }))),
    ).withDefault(null),
    passiveDefense: from('system.defense.passive.statistic', text).withDefault(''),
    materialCost: from('system.cost.value', text),
    requirements: from('system.requirements', text),
    counteraction: from('system.counteraction', bool),
    ritual: from(
      'system.ritual',
      nullable(
        shape({
          primary: shape({ check: text }),
          secondary: shape({ casters: nullable(int), checks: text }),
        }),
      ),
    )
      .withDefault(null)
      .map((cru) =>
        cru === null
          ? null
          : {
              primaryCheck: cru.primary.check,
              secondaryCasters: cru.secondary.casters,
              secondaryChecks: cru.secondary.checks,
            },
      ),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'ícone da escola no Foundry; o zip não traz imagem',
    effects: 'active effects do VTT; vazio nas 1.994',
    'system._migration': 'controle interno de migração do Foundry',
    'system.traits.selected':
      'cache de interface do Foundry que vazou para o compêndio (30 das 1.994), o mesmo ' +
      'lixo já visto em ações e talentos',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules': 'rule elements — mecânica pura de VTT. Continua em raw/.',
    'system.heightening':
      'a ESCALA por posto, em números (610 magias). Fica de fora porque o TEXTO cobre ' +
      'mais: 1.134 descrições já trazem o "Heightened" escrito. Vira essencial quando a ' +
      'ficha precisar calcular o dano de uma magia elevada.',
    'system.damage':
      'a fórmula do dano, por tipo e material (1.459 magias). É o que o VTT rola; a ' +
      'descrição já conta em texto o que ela faz.',
    'system.description.gm':
      'texto que só o mestre deveria ver (5 das 1.994). Mostrá-lo sem distinguir quem está ' +
      'olhando entregaria resposta ao jogador — mesma decisão da receita de `action`.',
    'system.overlays':
      'as VARIANTES da magia — 72 têm. Cada uma muda área, dano ou tempo em relação à ' +
      'base. Merece tela própria, e não uma linha no cabeçalho.',
  },
});
