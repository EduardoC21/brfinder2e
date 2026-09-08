/**
 * Receita de `equipment` — 5.869 entradas no pack `equipment`.
 *
 * Quinta receita, e a primeira que atravessa VÁRIOS tipos do Foundry. As quatro anteriores
 * casavam uma para um: o pack `spells-srd` só tem documentos `spell`. Aqui são nove tipos
 * num pack só, medidos no `pf2e-8.5.0`:
 *
 *   equipment  2394   consumable 1703   weapon  1018   ammo      216   armor 211
 *   treasure    153   shield      126   backpack  46   kit         2
 *
 * E eles são a MESMA coisa para quem consulta: um item, com nível, preço, volume e traços.
 * Nove receitas dariam nove fontes no trilho para responder "quanto custa uma espada
 * longa?", e a busca de uma fonte deixaria de achar as outras oito. Por isso `accepts`
 * existe no motor, e o que separa os nove vira DADO, no campo `kind`.
 *
 * ⚠️ O SETOR NÃO VEM DA PASTA, e é a primeira receita assim. Medido: **5.706 dos 5.869 não
 * têm pasta nenhuma** — as 163 que têm são famílias de item mágico (`Aeon Stones` 35,
 * `Spellhearts` 25, `Staves` 22…). A pasta responde 3% da base, e "que espécie de coisa é
 * esta" é respondido pelo `type` do documento, que responde 100%. Então o Tipo da tela é o
 * `kind`, e a pasta vira `family`, um campo próprio.
 *
 * ⚠️ METADE DOS CAMPOS DESTE TIPO É ESTADO DE INVENTÁRIO, não catálogo. `equipped`,
 * `quantity`, `containerId`, `hp.value`, `runes`, `grade`, `size`, `material` descrevem UM
 * item na mochila de UM personagem — o Foundry usa o mesmo documento para o item do
 * compêndio e para a cópia que o jogador carrega. Nada disso é regra, e tudo está em
 * `ignore` com o motivo escrito.
 *
 * Decidida contra o JSON real do `pf2e-8.5.0`, em 08/09/2026.
 */

import {
  bool,
  decimal,
  html,
  int,
  nullable,
  optional,
  raw,
  shape,
  text,
  textList,
} from '../decoders';
import { isRecord } from '../../json';
import { from, fromSector } from '../field';
import { recipe } from '../recipe';

/** Os nove tipos do Foundry que caem nesta receita. Ver `accepts` em `recipe.ts`. */
export const EQUIPMENT_KINDS: readonly string[] = [
  'equipment',
  'consumable',
  'weapon',
  'ammo',
  'armor',
  'treasure',
  'shield',
  'backpack',
  'kit',
];

/** Quanto vale cada moeda em COBRE. É a conversão do próprio jogo. */
const EM_COBRE: Readonly<Record<string, number>> = { pp: 1000, gp: 100, sp: 10, cp: 1 };

/**
 * O dano, e ele vem em DUAS formas na fonte — o que custou 85 falhas antes de ser medido:
 *
 *   arma        `{dice: 1, die: 'd8', damageType: 'slashing'}`   1.018
 *   consumível  `{formula: '3d6', kind: 'damage', type: 'poison'}`   85
 *
 * A saída é uma só, porque na tela as duas se leem igual: `1d8 cortante`, `3d6 veneno`.
 * Guardar as duas formas obrigaria toda tela a conhecer as duas.
 */
export interface EquipmentDamage {
  /** `1d8`, `3d6`. Montado a partir de `dice` e `die` quando a fonte os separa. */
  readonly formula: string;
  /** `slashing`, `piercing`, `poison`, `acid`… */
  readonly type: string;
}

export interface EquipmentBase {
  readonly name: string;
  readonly slug: string;

  /**
   * O TIPO do item, e é o `type` do próprio documento do Foundry.
   *
   * `equipment` 2394, `consumable` 1703, `weapon` 1018, `ammo` 216, `armor` 211,
   * `treasure` 153, `shield` 126, `backpack` 46, `kit` 2.
   *
   * É o Tipo da tela — o corte mais grosso que existe aqui, e o único que cobre as 5.869.
   */
  readonly kind: string;

  /**
   * A família de item mágico, da pasta do compêndio. VAZIA em 5.706 dos 5.869.
   *
   * `Aeon Stones` 35, `Spellhearts` 25, `Staves` 22, `Spell Catalysts` 17, `Grimoires` 16…
   * São 15 famílias em 163 itens. Não serve de Tipo — 97% ficaria "sem valor" —, mas
   * responde "quais são as pedras eônicas", que o resto do dado não responde.
   */
  readonly family: string;

  /** 0 a 28. Zero em 740 — item mundano não tem nível, e zero é o jeito de dizer isso. */
  readonly level: number;

  /**
   * O preço em PEÇAS DE COBRE.
   *
   * Uma moeda só, e não o objeto de quatro que a fonte guarda. A conversão é fechada e do
   * próprio jogo (1 po = 100 pc), e um número é o que permite ORDENAR e filtrar por faixa —
   * que é a pergunta real ("o que cabe em 50 po?"). A tela remonta a moeda maior na hora de
   * desenhar, e o resultado bate byte a byte com o que a fonte trazia.
   *
   * 367 itens valem zero: alguns são achados de aventura sem preço impresso.
   */
  readonly price: number;

  /**
   * Quantas unidades saem por aquele preço. Vale 1 em quase tudo.
   *
   * 44 itens vêm em lote de 10 (munição, principalmente) e 4 em lote de 5. Sem isto, uma
   * flecha custaria dez vezes o que custa.
   */
  readonly pricePer: number;

  /**
   * O volume, na escala do jogo. `0` é insignificante e `0.1` é o "L" (leve) do livro.
   *
   * Guardado como número, e não como o texto `L`: assim ordena. 2.620 itens são `L`, 1.949
   * são insignificantes, e o maior da base tem Volume 50.
   */
  readonly bulk: number;

  /** 5.869 têm. Os mais comuns são `magical`, `consumable`, `invested`. */
  readonly traits: readonly string[];

  /** common 2981, uncommon 1916, rare 714, unique 258. */
  readonly rarity: string;

  /**
   * A subdivisão DENTRO do tipo, quando existe. Vazia nos 2.394 `equipment` genéricos.
   *
   * arma: `martial` 613, `simple` 333, `advanced` 67, `unarmed` 5
   * consumível: `other` 523, `potion` 183, `talisman` 156, `elixir` 146, `wand` 119…
   * armadura: `light` 74, `medium` 54, `heavy` 50, `unarmored` 26…
   * tesouro: `art-object` 96, `gem` 50, `coin` 4
   */
  readonly category: string;

  /**
   * O GRUPO de arma ou armadura: `club` 247, `bomb` 171, `sword` 122, `firearm` 104,
   * `knife` 79, `plate` 60… Vazio em tudo que não é arma nem armadura.
   */
  readonly group: string;

  /**
   * Como o item é usado: `held-in-one-hand` 2711, `held-in-two-hands` 610, `worn` 392,
   * `affixed-to-armor-or-a-weapon` 112… São 120 formas distintas.
   *
   * É o campo que responde "quantas mãos ocupa", que a ficha vai precisar.
   */
  readonly usage: string;

  readonly damage: EquipmentDamage | null;

  /** O alcance da arma, em pés. Nulo nas corpo a corpo e em tudo que não é arma. */
  readonly range: number | null;

  /**
   * Quantas ações para recarregar: `-` (não recarrega), `0`, `1`, `2`…
   *
   * Texto, e não número, porque `-` é um valor legítimo e frequente: 233 armas o trazem.
   */
  readonly reload: string;

  /**
   * Os cinco números de armadura e escudo, CHATOS e não aninhados — porque é assim que a
   * fonte os guarda, irmãos em `system.*`, e um objeto aqui seria invenção nossa.
   *
   * Armadura preenche os cinco (211 itens); escudo preenche `acBonus` e `speedPenalty`
   * (126). O resto da base traz nulo, e nulo é a resposta certa: uma poção não tem CA.
   */
  readonly acBonus: number | null;
  readonly dexCap: number | null;
  readonly checkPenalty: number | null;
  readonly speedPenalty: number | null;
  readonly strength: number | null;

  /**
   * Dureza e resistência, e elas são de ESCUDO. Medido: armadura, arma e equipamento
   * genérico trazem zero nos 3.623; só os 126 escudos têm valor de verdade.
   */
  readonly hardness: number;
  readonly hitPoints: number;

  /**
   * Quantas cargas o item tem. Nulo no que não se gasta.
   *
   * 1.899 valem 1 — uma poção, um pergaminho. Alguns poucos têm 5, 7, 8 ou 10.
   */
  readonly uses: number | null;

  readonly source: {
    readonly license: string;
    readonly title: string;
    readonly remaster: boolean;
  };
}

export interface EquipmentDesc {
  readonly main: string;
}

/**
 * `{gp: 2, sp: 5}` → 250.
 *
 * Moeda que não conhecemos é IGNORADA, e não vira zero calado: se o Paizo inventar uma
 * quinta moeda, o preço fica menor do que devia — e um preço menor do que devia aparece,
 * enquanto um zero se confunde com os 363 itens que realmente não têm preço.
 */
function toCopper(coins: unknown): number {
  if (!isRecord(coins)) return 0;
  let total = 0;
  for (const [moeda, quanto] of Object.entries(coins)) {
    const fator = EM_COBRE[moeda];
    if (fator !== undefined && typeof quanto === 'number' && Number.isFinite(quanto)) {
      total += quanto * fator;
    }
  }
  return total;
}

/** Junta as duas formas da fonte numa só. Ver `EquipmentDamage`. */
function toDamage(cru: unknown): EquipmentDamage | null {
  if (!isRecord(cru)) return null;

  // Forma da ARMA: dados separados do tipo.
  const dice = cru['dice'];
  const die = cru['die'];
  if (typeof dice === 'number' && typeof die === 'string') {
    const tipo = cru['damageType'];
    return { formula: `${String(dice)}${die}`, type: typeof tipo === 'string' ? tipo : '' };
  }

  // Forma do CONSUMÍVEL: a fórmula já escrita.
  const formula = cru['formula'];
  if (typeof formula === 'string') {
    const tipo = cru['type'];
    return { formula, type: typeof tipo === 'string' ? tipo : '' };
  }

  return null;
}

export const equipmentRecipe = recipe<EquipmentBase, EquipmentDesc>({
  type: 'equipment',
  accepts: EQUIPMENT_KINDS,
  packs: [{ name: 'equipment-srd' }],

  base: {
    name: from('name', text),
    slug: from('system.slug', text),
    kind: from('type', text),
    family: fromSector(),
    // `kit` (2 documentos) não traz nível nenhum — daí o padrão.
    level: from('system.level.value', int).withDefault(0),
    /*
     * O objeto de moedas é LIVRE: 181 itens trazem as quatro chaves (três delas zeradas) e
     * o resto traz só a que usa. `raw` mais uma conta é mais honesto que um `shape` com
     * quatro opcionais — o `shape` fixaria um vocabulário de moedas que a fonte não fixa.
     */
    price: from('system.price.value', raw).map(toCopper),
    /*
     * ⚠️ `.withDefault()` em TODO campo que pode faltar, e não só o decodificador
     * `optional`. São coisas diferentes, e a diferença custou 5.869 falhas na primeira
     * tentativa: `optional` cuida do VALOR indefinido, e `withDefault` cuida do CAMINHO
     * ausente. Aqui quase tudo é específico de um dos nove tipos, então quase tudo falta.
     */
    pricePer: from('system.price.per', optional(nullable(int)))
      .withDefault(1)
      .map((valor) => valor ?? 1),
    bulk: from('system.bulk.value', decimal).withDefault(0),
    traits: from('system.traits.value', textList),
    rarity: from('system.traits.rarity', text),
    category: from('system.category', optional(nullable(text)))
      .withDefault('')
      .map((valor) => valor ?? ''),
    group: from('system.group', optional(nullable(text)))
      .withDefault('')
      .map((valor) => valor ?? ''),
    usage: from('system.usage.value', optional(nullable(text)))
      .withDefault('')
      .map((valor) => valor ?? ''),
    damage: from('system.damage', raw).withDefault(null).map(toDamage),
    range: from('system.range', optional(nullable(int))).withDefault(null),
    reload: from('system.reload.value', optional(nullable(text)))
      .withDefault('')
      .map((valor) => valor ?? ''),
    acBonus: from('system.acBonus', optional(nullable(int))).withDefault(null),
    dexCap: from('system.dexCap', optional(nullable(int))).withDefault(null),
    checkPenalty: from('system.checkPenalty', optional(nullable(int))).withDefault(null),
    speedPenalty: from('system.speedPenalty', optional(nullable(int))).withDefault(null),
    strength: from('system.strength', optional(nullable(int))).withDefault(null),
    hardness: from('system.hardness', optional(nullable(int)))
      .withDefault(0)
      .map((valor) => valor ?? 0),
    hitPoints: from('system.hp.max', optional(nullable(int)))
      .withDefault(0)
      .map((valor) => valor ?? 0),
    uses: from('system.uses.max', optional(nullable(int))).withDefault(null),
    source: from('system.publication', shape({ license: text, title: text, remaster: bool })),
  },

  desc: {
    main: from('system.description.value', html),
  },

  ignore: {
    img: 'ícone do item no Foundry; o zip não traz imagem',
    effects: 'active effects do VTT',
    'system._migration': 'controle interno de migração do Foundry',
    'system.equipped': 'ESTADO DE INVENTÁRIO: se o personagem está usando. Não é o item.',
    'system.quantity': 'ESTADO DE INVENTÁRIO: quantas o personagem tem.',
    'system.containerId': 'ESTADO DE INVENTÁRIO: em que mochila está guardado.',
    'system.hp.value': 'ESTADO DE INVENTÁRIO: a resistência ATUAL. O máximo é que é regra.',
    'system.size': 'ESTADO DE INVENTÁRIO: o tamanho da cópia que o personagem carrega.',
    'system.material': 'ESTADO DE INVENTÁRIO: de que material aquela cópia foi feita.',
    'system.identification': 'ESTADO DE INVENTÁRIO: se o item já foi identificado em jogo.',
    'system.baseItem': 'de que item do compêndio esta cópia deriva; a identidade já basta',
    'system.uses.value': 'ESTADO DE INVENTÁRIO: quantas cargas RESTAM. O máximo é que é regra.',
    'system.uses.autoDestroy': 'comportamento de VTT: se o Foundry apaga o item ao acabar.',
    'system.ammo': 'ESTADO DE INVENTÁRIO: qual munição está carregada naquela arma.',
    'system.bonus':
      'o bônus de potência DAQUELA cópia — vale 0 nas 1.018 do compêndio, porque quem ' +
      'grava potência numa arma é o personagem. Pertence à ficha, com as runas.',
    'system.splashDamage':
      'o dano de respingo da bomba. Vale ZERO nas 1.018 — o respingo real está escrito na ' +
      'descrição, e este campo só se preenche quando a ficha aplica runas.',
    'system.bonusDamage': 'o dano extra DAQUELA cópia; vale 0 nas 992 do compêndio.',
    'system.expend': 'se a arma se gasta ao ser usada; nulo nas 1.018.',
    'system.usage.canBeAmmo':
      'se o item também serve de munição (240). É conta de ficha, não linha de catálogo.',
    'system.traits.otherTags':
      'etiquetas internas do sistema (`alchemical-food`, 129 itens). Não são traços do ' +
      'jogo: não aparecem no livro nem no AoN.',
    'system.collapsed': 'se a mochila está recolhida na INTERFACE do Foundry.',
    'system.equippedBulk': 'o volume do kit quando equipado — UM documento na base inteira.',
    'system.description.gm':
      'texto que só o mestre deveria ver (104 itens). Mostrá-lo sem distinguir quem está ' +
      'olhando entregaria resposta ao jogador — mesma decisão de `action` e de `spell`.',
    '_stats.coreVersion': 'versão do Foundry que gerou; já sabemos pela tag do release',
    '_stats.systemId': 'sempre "pf2e"; já sabemos pelo canal',
    '_stats.systemVersion': 'já sabemos pela tag do release',
  },

  defer: {
    'system.rules': 'rule elements — mecânica pura de VTT. Continua em raw/.',
    'system.spell':
      'a magia embutida num pergaminho ou varinha (109 consumíveis). É conteúdo de ' +
      'verdade, e o lugar dela é uma referência cruzada para a magia — não uma cópia ' +
      'inteira dentro do item.',
    'system.runes':
      'as runas gravadas (armas, armaduras e escudos). Pertencem à FICHA: é o personagem ' +
      'que grava uma runa de impacto na espada dele, não o catálogo.',
    'system.grade': 'a graduação do item (nível de qualidade da versão remasterizada).',
    'system.specific':
      'se a arma mágica é "específica" — um item nomeado em vez de uma arma comum com ' +
      'runas. Muda como a ficha calcula, e não o que se lê aqui.',
    'system.subitems': 'peças acopladas (um escudo com saliência). Um escudo tem.',
    'system.apex': 'o item apex que eleva um atributo (57 itens). É conta de ficha.',
    'system.items': 'o conteúdo de um kit — dois documentos na base inteira.',
    'system.stowing': 'se a mochila guarda dentro; é comportamento de contêiner na ficha.',
    'system.bulk.capacity':
      'quanto a mochila CARREGA (46 contêineres), com `heldOrStowed` e `ignored`. É regra ' +
      'de verdade — "uma mochila leva 4 de Volume" —, e entra quando a ficha tiver ' +
      'inventário para calcular.',
    'system.bulk.heldOrStowed': 'ver `system.bulk.capacity`.',
    'system.bulk.ignored': 'ver `system.bulk.capacity`.',
    'system.craftableAs':
      'em que outras formas a munição pode ser fabricada (216). Pertence à Criação, que ' +
      'ainda não existe.',
    'system.traits.integrated':
      'a arma embutida num item (126) — o braço de um autômato, por exemplo. Traz runas ' +
      'próprias, e runas são da ficha.',
    'system.staff':
      'a lista de magias que o bastão concede (4 itens). É conteúdo, e o lugar dele é uma ' +
      'referência cruzada para as magias — a mesma decisão de `system.spell`.',
    'system.traits.config':
      'as opções da arma MODULAR: dois itens escolhem o tipo de dano no momento do golpe. ' +
      'Duas entradas na base inteira, e a descrição já conta.',
    'system.meleeUsage':
      'a arma COMBINADA: 27 itens são uma coisa à distância e outra corpo a corpo (um ' +
      'mosquete que também é espada). Merece desenho próprio, e não uma linha extra.',
  },
});
