/**
 * As cinco amostras da Etapa 10, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 * Escolhidas para cobrir o que varia, e cada uma paga por si:
 *
 *   Quench                duas ações, área, salvamento BÁSICO, sustentada, contra-ação
 *   Invoke True Name      truque raro, quatro tradições, sem área e sem defesa
 *   Blessing of Defiance  custo em FAIXA (`1 to 3`), o formato que só magia tem
 *   The World's a Stage   ritual, tradições VAZIAS, custo material, casters NULO
 *   Bonewall Bulwark      defesa PASSIVA com salvamento nulo — as duas se excluem
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC/OGL, e o
 * decodificador `html` só precisa saber que é string. O `@UUID` foi mantido porque é a
 * marcação que a Etapa 7 analisa.
 */

/** IDs de pasta batendo com `folderRoots` abaixo. */
const PASTA_SPELLS = 'lPzcDrjGDFbzuF2r';
const PASTA_SPELLS_B = 'D7UVaOiB40wTR6kv';
const PASTA_SPELLS_C = 'iDjm2cXyRAe4VZ35';
const PASTA_SPELLS_D = '4fJHnYFqH0VjZXPv';
const PASTA_RITUALS = '6JF73zNhT8zbp1qC';

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.spells-srd.Item.x',
};

export const quench = {
  _id: '02J0rDTk37KN2sjt',
  img: 'systems/pf2e/icons/spells/quench.webp',
  name: 'Quench',
  folder: PASTA_SPELLS,
  system: {
    area: { type: 'burst', value: 20 },
    cost: { value: '' },
    counteraction: true,
    defense: { save: { basic: true, statistic: 'fortitude' } },
    description: { value: '<p>You extinguish fire in the area. […] @UUID[Compendium.x]</p>' },
    duration: { sustained: true, value: '' },
    level: { value: 2 },
    publication: { license: 'OGL', remaster: false, title: "Pathfinder Advanced Player's Guide" },
    range: { value: '120 feet' },
    requirements: '',
    rules: [],
    slug: 'quench',
    target: { value: '' },
    time: { value: '2' },
    traits: {
      rarity: 'common',
      traditions: ['primal'],
      value: ['concentrate', 'manipulate', 'water'],
    },
    _migration: { version: 0.959, previous: null },
  },
  type: 'spell',
  _stats: ESTATISTICAS,
  effects: [],
};

export const invokeTrueName = {
  _id: '09C2wvWZLCxwjINk',
  img: 'systems/pf2e/icons/spells/invoke-true-name.webp',
  name: 'Invoke True Name',
  folder: PASTA_SPELLS_B,
  system: {
    // Presente e NULA: é assim que a fonte diz "sem área".
    area: null,
    cost: { value: '' },
    counteraction: false,
    defense: null,
    description: { value: '<p>You speak a creature’s true name. […]</p>' },
    duration: { sustained: false, value: '' },
    level: { value: 1 },
    publication: { license: 'OGL', remaster: false, title: 'Pathfinder Secrets of Magic' },
    range: { value: '30 feet' },
    requirements: '',
    rules: [],
    slug: 'invoke-true-name',
    target: { value: '1 creature whose true name you know' },
    time: { value: '1' },
    traits: {
      rarity: 'rare',
      traditions: ['arcane', 'divine', 'occult', 'primal'],
      value: ['cantrip', 'concentrate', 'true-name'],
    },
    _migration: { version: 0.959, previous: null },
  },
  type: 'spell',
  _stats: ESTATISTICAS,
  effects: [],
};

export const blessingOfDefiance = {
  _id: '1b55SgYTV65JvmQd',
  img: 'systems/pf2e/icons/spells/blessing-of-defiance.webp',
  name: 'Blessing of Defiance',
  folder: PASTA_SPELLS_C,
  system: {
    area: null,
    cost: { value: '' },
    counteraction: false,
    defense: null,
    description: { value: '<p>You grant defiance against a foe. […]</p>' },
    duration: { sustained: false, value: '1 round' },
    level: { value: 5 },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Impossible Magic' },
    range: { value: '30 feet' },
    requirements: '',
    rules: [],
    slug: 'blessing-of-defiance',
    target: { value: 'varies' },
    // O formato que só magia tem: de uma a três ações.
    time: { value: '1 to 3' },
    traits: { rarity: 'common', traditions: ['divine', 'primal'], value: ['manipulate'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'spell',
  _stats: ESTATISTICAS,
  effects: [],
};

export const theWorldsAStage = {
  _id: '3DB3F2hIx2dMbX8n',
  img: 'systems/pf2e/icons/spells/the-worlds-a-stage.webp',
  name: "The World's a Stage",
  folder: PASTA_RITUALS,
  system: {
    area: null,
    cost: { value: 'costumes and a stage large enough to fit all casters' },
    counteraction: false,
    defense: null,
    description: { value: '<p>You stage a performance that reshapes fate. […]</p>' },
    duration: { sustained: false, value: '1 month' },
    level: { value: 5 },
    publication: { license: 'ORC', remaster: true, title: 'Pathfinder Impossible Magic' },
    range: { value: '' },
    requirements: '',
    // `casters` NULO, e nulo não é zero: 33 rituais dizem 0, e estes 4 não dizem nada.
    ritual: {
      primary: { check: 'Occultism (expert)' },
      secondary: { casters: null, checks: 'Crafting, Performance' },
    },
    rules: [],
    slug: 'the-worlds-a-stage',
    target: { value: '' },
    time: { value: '1 day' },
    // Tradições VAZIAS: ritual e magia de foco não pertencem a uma tradição.
    traits: { rarity: 'uncommon', traditions: [], value: ['fortune'] },
    _migration: { version: 0.959, previous: null },
  },
  type: 'spell',
  _stats: ESTATISTICAS,
  effects: [],
};

export const bonewallBulwark = {
  _id: '11pQoPJpSH2jp7h6',
  img: 'systems/pf2e/icons/spells/bonewall-bulwark.webp',
  name: 'Bonewall Bulwark',
  folder: PASTA_SPELLS_D,
  system: {
    area: null,
    cost: { value: '' },
    counteraction: false,
    // Defesa PASSIVA com salvamento nulo: as duas são alternativas, não complementos.
    defense: { passive: { statistic: 'ac' }, save: null },
    description: { value: '<p>A wall of bone rises to shield you. […]</p>' },
    duration: { sustained: false, value: '1 minute' },
    level: { value: 3 },
    publication: { license: 'OGL', remaster: false, title: 'Pathfinder Wake the Dead #4' },
    range: { value: '5 feet' },
    requirements: '',
    rules: [],
    slug: 'bonewall-bulwark',
    target: { value: '' },
    time: { value: '2' },
    traits: {
      rarity: 'rare',
      traditions: ['arcane', 'occult'],
      value: ['concentrate', 'manipulate'],
    },
    _migration: { version: 0.959, previous: null },
  },
  type: 'spell',
  _stats: ESTATISTICAS,
  effects: [],
};

/** As raízes de pasta das cinco, no formato que `parseFolderRoots` devolve. */
export const folderRoots = new Map<string, string>([
  [PASTA_SPELLS, 'Spells'],
  [PASTA_SPELLS_B, 'Spells'],
  [PASTA_SPELLS_C, 'Spells'],
  [PASTA_SPELLS_D, 'Spells'],
  [PASTA_RITUALS, 'Rituals'],
]);

export const todas = [quench, invokeTrueName, blessingOfDefiance, theWorldsAStage, bonewallBulwark];
