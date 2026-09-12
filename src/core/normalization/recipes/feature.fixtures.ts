/**
 * Duas amostras da Etapa 22d, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 *   Clan Dagger      nível 0, sem traço, uma regra; é a que Dwarf aponta
 *   Awakened Mind    nível 1, com o traço da ancestralidade
 *
 * O texto está encurtado de propósito — é conteúdo da Paizo sob ORC.
 */

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.ancestryfeatures.Item.x',
};

const PASTA_DWARF = 'fDwarfDwarfDwarf1';
const PASTA_AWAKENED = 's1ADwicHIwn4luRA';

export const pastas = new Map([
  [PASTA_DWARF, 'Dwarf'],
  [PASTA_AWAKENED, 'Awakened Animal'],
]);

export const clanDagger = {
  _id: 'Eyuqu6eIaoGCjnMv',
  folder: PASTA_DWARF,
  img: 'systems/pf2e/icons/equipment/weapons/clan-dagger.webp',
  name: 'Clan Dagger',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'ancestryfeature',
    description: { value: '<p>You get one clan dagger of your clan for free […]</p>' },
    level: { value: 0 },
    prerequisites: { value: [] },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Player Core' },
    rules: [{ key: 'GrantItem', uuid: 'Compendium.pf2e.equipment-srd.Item.x' }],
    traits: { rarity: 'common', value: [] },
    slug: 'clan-dagger',
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: ESTATISTICAS,
  effects: [],
};

export const awakenedMind = {
  _id: '0qHN69NF7JBWKO8v',
  folder: PASTA_AWAKENED,
  img: 'icons/creatures/mammals/humanoid-wolf-dog-blue.webp',
  name: 'Awakened Mind',
  system: {
    actionType: { value: 'passive' },
    actions: { value: null },
    category: 'ancestryfeature',
    description: { value: '<p>Awakening altered your mind […]</p>' },
    level: { value: 1 },
    prerequisites: { value: [] },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Howl of the Wild' },
    rules: [],
    traits: { rarity: 'common', value: ['awakened-animal'] },
    slug: 'awakened-mind',
    _migration: { version: 0.959, previous: null },
  },
  type: 'feat',
  _stats: ESTATISTICAS,
  effects: [],
};

export const todas = [clanDagger, awakenedMind];
