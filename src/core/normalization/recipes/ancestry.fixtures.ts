/**
 * Três amostras da Etapa 22, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 *   Dwarf   dois aumentos fixos + livre, falha, darkvision, uma habilidade, comum
 *   Tengu   um fixo + livre (slot 1 vazio), sem falha, low-light, uma habilidade, incomum
 *   Human   dois livres, sem falha, normal, sem habilidade, `additionalLanguages.count: 1`
 *
 * O texto está encurtado de propósito — é conteúdo da Paizo sob ORC.
 */

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.ancestries.Item.x',
};

const SEIS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const PLAYER_CORE = { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' };

export const dwarf = {
  _id: 'BYj5ZvlXZdpaEgA6',
  img: 'systems/pf2e/icons/default-icons/ancestry.svg',
  name: 'Dwarf',
  system: {
    additionalLanguages: { count: 0, custom: '', value: ['gnomish', 'goblin', 'jotun'] },
    boosts: { '0': { value: ['con'] }, '1': { value: ['wis'] }, '2': { value: SEIS } },
    description: {
      value:
        '<p>Dwarves have a well-earned reputation […]</p>\n<p>@UUID[Compendium.pf2e.journals.JournalEntry.45SK8rdbbxvEHfMn.JournalEntryPage.YGIwmuVOJI7uNhGM]{Dwarf}</p>',
    },
    flaws: { '0': { value: ['cha'] } },
    hands: 2,
    hp: 10,
    items: {
      '5vjeq': {
        img: 'systems/pf2e/icons/equipment/weapons/clan-dagger.webp',
        level: 0,
        name: 'Clan Dagger',
        uuid: 'Compendium.pf2e.ancestryfeatures.Item.Eyuqu6eIaoGCjnMv',
      },
    },
    languages: { custom: '', value: ['common', 'dwarven'] },
    publication: PLAYER_CORE,
    reach: 5,
    rules: [],
    size: 'med',
    speed: 20,
    traits: { rarity: 'common', value: ['dwarf', 'humanoid'] },
    vision: 'darkvision',
    slug: 'dwarf',
    _migration: { version: 0.959, previous: null },
  },
  type: 'ancestry',
  _stats: ESTATISTICAS,
  effects: [],
};

export const tengu = {
  _id: 'aoTFgc2vA7A5vRy5',
  img: 'systems/pf2e/icons/default-icons/ancestry.svg',
  name: 'Tengu',
  system: {
    additionalLanguages: { count: 0, custom: '', value: ['dwarven', 'elven'] },
    boosts: { '0': { value: ['dex'] }, '1': { value: [] }, '2': { value: SEIS } },
    description: { value: '<p>Tengus are a race of birdlike humanoids […]</p>' },
    flaws: { '0': { value: [] } },
    hands: 2,
    hp: 6,
    items: {
      abcde: {
        img: 'x.webp',
        level: 0,
        name: 'Sharp Beak',
        uuid: 'Compendium.pf2e.ancestryfeatures.Item.abcdefghijklmnop',
      },
    },
    languages: { custom: '', value: ['common', 'tengu'] },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core 2' },
    reach: 5,
    rules: [
      { key: 'Strike', label: 'Beak' },
      { key: 'GrantItem', uuid: 'Compendium.pf2e.actionspf2e.Item.34E7k2YRcsOU5uyl' },
    ],
    size: 'med',
    speed: 25,
    traits: { rarity: 'uncommon', value: ['humanoid', 'tengu'] },
    vision: 'low-light-vision',
    slug: 'tengu',
    _migration: { version: 0.959, previous: null },
  },
  type: 'ancestry',
  _stats: ESTATISTICAS,
  effects: [],
};

export const human = {
  _id: 'IiG7DgeLWYrSNXuX',
  img: 'systems/pf2e/icons/default-icons/ancestry.svg',
  name: 'Human',
  system: {
    additionalLanguages: { count: 1, custom: '', value: [] },
    boosts: { '0': { value: SEIS }, '1': { value: SEIS }, '2': { value: [] } },
    description: { value: "<p>As unpredictable and varied as any of Golarion's peoples […]</p>" },
    flaws: { '0': { value: [] } },
    hands: 2,
    hp: 8,
    items: {},
    languages: { custom: '', value: ['common'] },
    publication: PLAYER_CORE,
    reach: 5,
    rules: [],
    size: 'med',
    speed: 25,
    traits: { rarity: 'common', value: ['human', 'humanoid'] },
    vision: 'normal',
    slug: 'human',
    _migration: { version: 0.959, previous: null },
  },
  type: 'ancestry',
  _stats: ESTATISTICAS,
  effects: [],
};

/**
 * O Animal Desperto: `hp`, `size` e `speed` são MARCADORES, e a verdade está nas regras —
 * um ChoiceSet de tamanho com PV por tamanho, e um BaseSpeed. O nado é inventado aqui
 * (o real não tem) para a leitura de `swim` ter amostra.
 */
export const awakenedAnimal = {
  ...human,
  _id: 'AwakenedAnimal01',
  name: 'Awakened Animal',
  system: {
    ...human.system,
    hp: 6,
    size: 'med',
    speed: 5,
    rules: [
      {
        key: 'ChoiceSet',
        choices: [
          { label: 'PF2E.ActorSizeLarge', value: { hitPoints: 10, size: 'large' } },
          { label: 'PF2E.ActorSizeMedium', value: { hitPoints: 8, size: 'medium' } },
          { label: 'PF2E.ActorSizeSmall', value: { hitPoints: 6, size: 'small' } },
          { label: 'PF2E.ActorSizeTiny', value: { hitPoints: 6, size: 'tiny' } },
        ],
      },
      { key: 'CreatureSize', value: '{item|flags.system.rulesSelections.choice.size}' },
      {
        key: 'BaseSpeed',
        selector: 'land',
        value: 20,
        predicate: [{ not: 'heritage:swimming-animal' }],
      },
      { key: 'BaseSpeed', selector: 'swim', value: 25 },
    ],
    traits: { rarity: 'rare', value: ['animal', 'awakened-animal'] },
    slug: 'awakened-animal',
  },
};

/** Uma herança VERSÁTIL, do pack `heritages`: sem ancestralidade, sem mecânica. */
export const nephilim = {
  _id: 'NephilimNephilim1',
  folder: 'khXMNyAoAoZ70PpT',
  img: 'systems/pf2e/icons/default-icons/heritage.svg',
  name: 'Nephilim',
  system: {
    ancestry: null,
    description: { value: '<p>Your nature is influenced by celestials […]</p>' },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core 2' },
    rules: [],
    traits: { rarity: 'uncommon', value: ['nephilim'] },
    slug: 'nephilim',
    _migration: { version: 0.959, previous: null },
  },
  type: 'heritage',
  _stats: { ...ESTATISTICAS, compendiumSource: 'Compendium.pf2e.heritages.Item.x' },
  effects: [],
};

/** O meio-elfo: versátil que CONTA COMO elfo, pelo `ActiveEffectLike` do Foundry. */
export const aiuvarin = {
  ...nephilim,
  _id: 'AiuvarinAiuvarin1',
  name: 'Aiuvarin',
  system: {
    ...nephilim.system,
    rules: [
      { key: 'Sense', selector: 'low-light-vision' },
      { add: ['elf'], key: 'ActorTraits' },
      {
        key: 'ActiveEffectLike',
        mode: 'override',
        path: 'system.details.ancestry.versatile',
        value: 'elf',
      },
      {
        key: 'ActiveEffectLike',
        mode: 'add',
        path: 'system.details.ancestry.countsAs',
        value: 'elf',
      },
      {
        key: 'ActiveEffectLike',
        mode: 'add',
        path: 'system.details.ancestry.countsAs',
        value: 'aiuvarin',
      },
    ],
    traits: { rarity: 'common', value: ['aiuvarin'] },
    slug: 'aiuvarin',
  },
};

/** Uma herança PRÓPRIA, que a receita de ancestralidade deve DEIXAR PASSAR sem virar entrada. */
export const forgeDwarf = {
  _id: '5CqsBKCZuGON53Hk',
  folder: 'fDwarfDwarfDwarf1',
  img: 'systems/pf2e/icons/default-icons/heritage.svg',
  name: 'Forge Dwarf',
  system: {
    ancestry: {
      name: 'Dwarf',
      slug: 'dwarf',
      uuid: 'Compendium.pf2e.ancestries.Item.BYj5ZvlXZdpaEgA6',
    },
    description: { value: '<p>You have a remarkable adaptation to hot environments […]</p>' },
    publication: PLAYER_CORE,
    rules: [{ key: 'Resistance', type: 'fire', value: 'max(1,floor(@actor.level/2))' }],
    traits: { rarity: 'common', value: [] },
    slug: 'forge-dwarf',
    _migration: { version: 0.959, previous: null },
  },
  type: 'heritage',
  _stats: { ...ESTATISTICAS, compendiumSource: 'Compendium.pf2e.heritages.Item.x' },
  effects: [],
};

/** O jornal `Ancestries` reduzido: uma página para Dwarf, nenhuma para os outros dois. */
export const jornal = {
  _id: '45SK8rdbbxvEHfMn',
  name: 'Ancestries',
  pages: [
    {
      _id: 'p1',
      name: 'Dwarf',
      title: { level: 2 },
      sort: 100000,
      text: {
        content:
          '<h2>You Might...</h2><p>Strive to […]</p><h2 id="m">Dwarf Mechanics</h2><p>Hit Points 10</p><h2>Dwarf Heritages</h2><p>@UUID[Compendium.pf2e.heritages.Item.yL6944LrPo2HNdEJ]{Ancient-Blooded Dwarf}</p>',
      },
    },
  ],
};

export const todas = [dwarf, tengu, human];
