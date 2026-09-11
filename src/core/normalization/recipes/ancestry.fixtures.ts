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
    rules: [{ key: 'Strike', label: 'Beak' }],
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
          '<h2>You Might...</h2><p>Strive to […]</p><h2>Dwarf Heritages</h2><p>@UUID[Compendium.pf2e.heritages.Item.yL6944LrPo2HNdEJ]{Ancient-Blooded Dwarf}</p>',
      },
    },
  ],
};

export const todas = [dwarf, tengu, human];
