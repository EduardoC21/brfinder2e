/**
 * Três amostras da Etapa 17, com a ESTRUTURA real do `pf2e-8.5.0`.
 *
 *   Sarenrae                       o caso normal: dois atributos, fonte, santificação, uma
 *                                  perícia, uma arma, quatro domínios, três magias
 *   Laws of Mortality              filosofia: SEM fonte, sem santificação, sem domínio, sem
 *                                  arma, sem magia — só atributo e perícia
 *   Guardians of the Sacred Self   panteão, com tudo preenchido como um deus
 *
 * O texto da descrição está encurtado de propósito — é conteúdo da Paizo sob ORC.
 */

const ESTATISTICAS = {
  coreVersion: '14.361',
  systemId: 'pf2e',
  systemVersion: '8.5.0',
  compendiumSource: 'Compendium.pf2e.deities.Item.x',
};

const DIVINE_MYSTERIES = {
  license: 'ORC',
  remaster: true,
  title: 'Pathfinder Lost Omens Divine Mysteries',
};

const PASTA_CORE = 'mxeDA21feNRRstOp';
const PASTA_FILOSOFIAS = '2JKNa0qw1kq7gzqh';
const PASTA_PANTEOES = 'DJ7SUPtx7Tcfzs5y';

export const sarenrae = {
  _id: 'BNycwu3I21dTh4D9',
  folder: PASTA_CORE,
  img: 'systems/pf2e/icons/deities/sarenrae.webp',
  name: 'Sarenrae',
  system: {
    attribute: ['con', 'wis'],
    category: 'deity',
    description: { value: '<p>Like the light of dawn […]</p><p><strong>Edicts</strong> …</p>' },
    domains: { alternate: ['repose'], primary: ['fire', 'healing', 'sun', 'truth'] },
    font: ['heal'],
    publication: DIVINE_MYSTERIES,
    rules: [],
    sanctification: { modal: 'can', what: ['holy'] },
    skill: ['medicine'],
    spells: {
      1: 'Compendium.pf2e.spells-srd.Item.y6rAdMK6EFlV6U0t',
      3: 'Compendium.pf2e.spells-srd.Item.sxQZ6yqTn0czJxVd',
      4: 'Compendium.pf2e.spells-srd.Item.IarZrgCeaiUqOuRu',
    },
    traits: {},
    weapons: ['scimitar'],
    slug: 'sarenrae',
    _migration: { version: 0.959, previous: null },
  },
  type: 'deity',
  _stats: ESTATISTICAS,
  effects: [],
};

export const lawsOfMortality = {
  _id: '4I1aVKED08cwcC4H',
  folder: PASTA_FILOSOFIAS,
  img: 'systems/pf2e/icons/deities/laws-of-mortality.webp',
  name: 'Laws of Mortality',
  system: {
    attribute: ['con', 'int'],
    category: 'philosophy',
    description: { value: '<p>A philosophy […]</p>' },
    domains: { alternate: [], primary: [] },
    font: [],
    publication: DIVINE_MYSTERIES,
    rules: [],
    sanctification: null,
    skill: ['medicine'],
    spells: {},
    traits: {},
    weapons: [],
    slug: 'laws-of-mortality',
    _migration: { version: 0.959, previous: null },
  },
  type: 'deity',
  _stats: ESTATISTICAS,
  effects: [],
};

export const guardians = {
  _id: '0uKqA42aPdHEqESI',
  folder: PASTA_PANTEOES,
  img: 'systems/pf2e/icons/deities/guardians-of-the-sacred-self.webp',
  name: 'Guardians of the Sacred Self',
  system: {
    attribute: ['cha', 'con'],
    category: 'pantheon',
    description: { value: '<p>A pantheon […]</p>' },
    domains: {
      alternate: ['freedom', 'truth'],
      primary: ['change', 'family', 'protection', 'soul'],
    },
    font: ['heal'],
    publication: DIVINE_MYSTERIES,
    rules: [],
    sanctification: { modal: 'can', what: ['holy'] },
    skill: ['medicine'],
    spells: {
      1: 'Compendium.pf2e.spells-srd.Item.aEM2cttJ2eYcLssW',
      3: 'Compendium.pf2e.spells-srd.Item.MNiT0dHol5fEcKlz',
      4: 'Compendium.pf2e.spells-srd.Item.zR67Rt3UMHKC5evy',
    },
    traits: {},
    weapons: ['shield-boss'],
    slug: 'guardians-of-the-sacred-self',
    _migration: { version: 0.959, previous: null },
  },
  type: 'deity',
  _stats: ESTATISTICAS,
  effects: [],
};

/** As raízes de pasta, no formato que `parseFolderRoots` devolve. */
export const folderRoots = new Map<string, string>([
  [PASTA_CORE, 'Core Gods'],
  [PASTA_FILOSOFIAS, 'Philosophies'],
  [PASTA_PANTEOES, 'Pantheons'],
]);

export const todas = [sarenrae, lawsOfMortality, guardians];
